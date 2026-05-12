// F02 T047b — Agent-credential listing for the operator console.
//
// Backs T056's `/operator/credentials` page: operator-scoped browse
// across the `agent_credentials` table with status + principal
// filters and opaque cursor pagination.
//
// Caller policy. Operator-only (tier='operator', AAL2 enforced
// upstream at the proxy per FR-12). The revocation-list refresh path
// for service principals is `listRevoked`; that surface is
// deliberately narrower (no `scope_set`, no `revocation_reason`) and
// covers the verifier-cache use case. Adding a service path here
// would broaden what `auth.revocation_list.read` exposes — see
// T047b review notes.
//
// Cursor format. Base64url-encoded JSON `{iat, cid}` — opaque-by-
// convention only, NOT integrity-protected. A caller can craft a
// cursor with arbitrary `(iat, cid)` to skip ahead in the result
// set; results remain authorized (operator-only) so the worst case
// is a paginated browse that doesn't match `(0, ∞)` semantics. If
// future requirements demand stable cursors across malicious
// callers, sign with an HMAC.

import { RoleRequiredError } from "../authorize.js";
import { isHumanPrincipal, type Principal } from "../principal.js";

export const DEFAULT_LIST_LIMIT = 50;
export const MAX_LIST_LIMIT = 200;

export type ListStatusFilter = "active" | "revoked" | "all";

export interface ListAgentCredentialsInput {
  readonly status?: ListStatusFilter;
  readonly principal_id?: string;
  readonly cursor?: string;
  readonly limit?: number;
}

export interface AgentCredentialListRow {
  readonly credential_id: string;
  readonly principal_id: string;
  readonly run_id: string;
  readonly side: "seeker" | "employer";
  readonly contract_id: string;
  readonly contract_version: string;
  readonly scope_set: ReadonlyArray<string>;
  readonly issued_at: Date;
  readonly expires_at: Date;
  readonly revoked_at: Date | null;
  readonly revocation_reason: string | null;
}

export interface ListAgentCredentialsOutput {
  readonly rows: ReadonlyArray<AgentCredentialListRow>;
  readonly next_cursor: string | null;
}

export interface AgentCredentialListFilter {
  readonly status: ListStatusFilter;
  readonly principal_id?: string;
  readonly cursor_issued_at?: Date;
  readonly cursor_credential_id?: string;
  readonly limit: number;
  /** Wall-clock instant; the repo uses this to evaluate `status='active'`. */
  readonly now: Date;
}

export interface AgentCredentialListRepo {
  /**
   * Return up to `limit` rows ordered DESC by `(issued_at,
   * credential_id)`. The repo MUST honor the cursor as a strict
   * "less than" predicate so the same row is never returned twice
   * across pages. The orchestrator passes `limit + 1` so it can
   * detect whether more pages exist; the repo never decides
   * pagination.
   */
  list(filter: AgentCredentialListFilter): Promise<ReadonlyArray<AgentCredentialListRow>>;
}

export interface ListAgentCredentialsDeps {
  readonly repo: AgentCredentialListRepo;
  readonly now: () => number;
}

export class InvalidCursorError extends Error {
  constructor(reason: string) {
    super(`Invalid cursor: ${reason}.`);
    this.name = "InvalidCursorError";
  }
}

function authorizeList(caller: Principal): void {
  if (isHumanPrincipal(caller) && caller.tier === "operator") return;
  throw new RoleRequiredError(
    ["operator"],
    caller.kind,
    isHumanPrincipal(caller) ? caller.tier : undefined,
  );
}

function clampLimit(input: number | undefined): number {
  if (input === undefined) return DEFAULT_LIST_LIMIT;
  if (!Number.isInteger(input) || input < 1) return DEFAULT_LIST_LIMIT;
  return Math.min(input, MAX_LIST_LIMIT);
}

function encodeCursor(row: AgentCredentialListRow): string {
  const json = JSON.stringify({
    iat: row.issued_at.toISOString(),
    cid: row.credential_id,
  });
  return Buffer.from(json, "utf8").toString("base64url");
}

interface DecodedCursor {
  readonly issued_at: Date;
  readonly credential_id: string;
}

function decodeCursor(raw: string): DecodedCursor {
  let json: string;
  try {
    json = Buffer.from(raw, "base64url").toString("utf8");
  } catch {
    throw new InvalidCursorError("not base64url");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new InvalidCursorError("not JSON");
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as { iat?: unknown }).iat !== "string" ||
    typeof (parsed as { cid?: unknown }).cid !== "string"
  ) {
    throw new InvalidCursorError("missing iat/cid");
  }
  const p = parsed as { iat: string; cid: string };
  const iat = new Date(p.iat);
  if (Number.isNaN(iat.getTime())) {
    throw new InvalidCursorError("iat not parseable");
  }
  return { issued_at: iat, credential_id: p.cid };
}

/**
 * List agent credentials for the operator console (T047b → T056).
 * Operator-only. Decodes the cursor, queries `limit + 1` rows from
 * the repo so we can tell whether a next page exists, returns at
 * most `limit` rows plus a cursor.
 */
export async function listAgentCredentialsForOperator(
  caller: Principal,
  input: ListAgentCredentialsInput,
  deps: ListAgentCredentialsDeps,
): Promise<ListAgentCredentialsOutput> {
  authorizeList(caller);

  const limit = clampLimit(input.limit);
  const status: ListStatusFilter = input.status ?? "all";

  const filter: Parameters<AgentCredentialListRepo["list"]>[0] = {
    status,
    limit: limit + 1,
    now: new Date(deps.now() * 1000),
  };
  if (input.principal_id !== undefined) {
    (filter as { principal_id?: string }).principal_id = input.principal_id;
  }
  if (input.cursor !== undefined) {
    const decoded = decodeCursor(input.cursor);
    (filter as { cursor_issued_at?: Date }).cursor_issued_at = decoded.issued_at;
    (filter as { cursor_credential_id?: string }).cursor_credential_id = decoded.credential_id;
  }

  const fetched = await deps.repo.list(filter);
  const rows = fetched.slice(0, limit);
  const hasMore = fetched.length > limit;
  const next_cursor = hasMore ? encodeCursor(rows[rows.length - 1]!) : null;

  return { rows, next_cursor };
}
