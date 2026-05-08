// F02 T044/T045/T046/T047/T048 — Agent-credential revocation,
// listing, and pruning (FR-21, EC-5, EC-6).
//
// Pure orchestration over the same `AgentCredentialRepo` used by
// `issuance.ts`, plus a `RevocationListRepo` for the denormalized
// `revocations` table. Tests inject in-memory fakes; the future
// tRPC layer wraps these with framework concerns.

import { declareScope, type Scope } from "../scopes.js";
import { requireScope, RoleRequiredError } from "../authorize.js";
import { isHumanPrincipal, isServicePrincipal, type Principal } from "../principal.js";
import type { AuditEventSink } from "../materialize/types.js";
import type { AgentCredentialRow } from "./issuance.js";

export const AGENT_CREDENTIAL_REVOKE_SCOPE: Scope = declareScope(
  "auth.agent_credential.revoke",
  "Revoke an in-flight agent credential (FR-21).",
);
export const REVOCATION_LIST_READ_SCOPE: Scope = declareScope(
  "auth.revocation_list.read",
  "Read the live revocation list for cross-process verifier refresh (FR-21).",
);

export type RevocationReasonCode =
  | "run_cancelled"
  | "compromise_suspected"
  | "operator_emergency"
  | "scope_violation_detected";

const NOTES_MAX_LENGTH = 500;

export interface RevokeAgentInput {
  /** Agent principal to revoke (covers all live credentials for it). */
  readonly principal_id: string;
  readonly reason_code: RevocationReasonCode;
  /** Optional operator notes (never PII). Capped + sanitized below. */
  readonly notes?: string;
}

export interface RevokeAgentOutput {
  readonly principal_id: string;
  /** Unix seconds. */
  readonly revoked_at: number;
  /** FR-21 / M-5 target: ≤60. */
  readonly effective_within_seconds: number;
  readonly revoked_credential_ids: ReadonlyArray<string>;
}

export interface RevocationListEntry {
  readonly credential_id: string;
  readonly kind: "agent" | "service";
  readonly expires_at: Date;
  readonly revoked_at: Date;
}

export interface RevocationListRepo {
  insert(entry: RevocationListEntry): Promise<void>;
  list(filter: {
    since?: Date;
    kinds?: ReadonlyArray<"agent" | "service">;
  }): Promise<ReadonlyArray<RevocationListEntry>>;
  /** Delete rows whose `expires_at <= cutoff`. Returns deleted count. */
  pruneExpired(cutoff: Date): Promise<number>;
}

export interface RevokeRepo {
  findActiveByPrincipal(principalId: string): Promise<ReadonlyArray<AgentCredentialRow>>;
  markRevoked(input: {
    credential_id: string;
    revoked_at: Date;
    revoked_by: string;
    reason: string;
  }): Promise<void>;
}

interface RevokeDeps {
  readonly repo: RevokeRepo;
  readonly listRepo: RevocationListRepo;
  readonly sink: AuditEventSink;
  readonly now: () => number;
  readonly correlationId: () => string;
  /** Target SLA reported back to caller; defaults to 60 (FR-21). */
  readonly effectiveWithinSeconds?: number;
}

function sanitizeNotes(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;
  // Strip control chars, cap length. The audit pipeline rejects
  // payloads with embedded newlines/tabs at the boundary anyway —
  // this is defense-in-depth.
  // eslint-disable-next-line no-control-regex
  const stripped = raw.replace(/[\x00-\x1f\x7f]/g, " ").trim();
  return stripped.slice(0, NOTES_MAX_LENGTH);
}

/**
 * Caller policy for `revokeAgentCredential` per FR-21:
 *   - Service principal with `auth.agent_credential.revoke` scope, OR
 *   - Operator (human, tier='operator'). Operator authority is
 *     conferred by the tier itself (Spyglass-side configuration per
 *     FR-9); per-call scope grants for operators land with the
 *     operator console (B6) and are not enforced here.
 *
 * AAL2 (FR-12) is gated upstream at the proxy/route boundary.
 */
function authorizeRevoke(caller: Principal): void {
  if (isServicePrincipal(caller)) {
    requireScope(caller, AGENT_CREDENTIAL_REVOKE_SCOPE);
    return;
  }
  if (isHumanPrincipal(caller) && caller.tier === "operator") {
    return;
  }
  throw new RoleRequiredError(
    ["operator"],
    caller.kind,
    isHumanPrincipal(caller) ? caller.tier : undefined,
  );
}

/**
 * Revoke every live agent credential for `principal_id`. Idempotent:
 * already-revoked rows are skipped silently. Emits one summary audit
 * event keyed on the principal — but only when at least one
 * credential was actually revoked, so audit consumers don't see
 * noisy zero-impact events.
 *
 * Operation order per credential: insert into the live revocation
 * list FIRST, then mark `agent_credentials.revoked_at`. Verifiers
 * fail-closed on a list hit, so a partial failure between the two
 * writes still denies the credential — never the inverse
 * "semi-revoked" state where a credential is marked revoked in the
 * row but absent from the list.
 */
export async function revokeAgentCredential(
  caller: Principal,
  input: RevokeAgentInput,
  deps: RevokeDeps,
): Promise<RevokeAgentOutput> {
  authorizeRevoke(caller);

  const live = await deps.repo.findActiveByPrincipal(input.principal_id);
  const correlation_id = deps.correlationId();
  const nowSec = deps.now();
  const revokedAtDate = new Date(nowSec * 1000);
  const sanitized = sanitizeNotes(input.notes);
  const reason =
    sanitized !== undefined && sanitized.length > 0
      ? `${input.reason_code}:${sanitized}`
      : input.reason_code;
  const revoked_credential_ids: string[] = [];

  for (const row of live) {
    // List FIRST so a failure between the two writes still denies
    // the credential at verify time (fail-safe).
    await deps.listRepo.insert({
      credential_id: row.credential_id,
      kind: "agent",
      expires_at: row.expires_at,
      revoked_at: revokedAtDate,
    });
    await deps.repo.markRevoked({
      credential_id: row.credential_id,
      revoked_at: revokedAtDate,
      revoked_by: caller.principal_id,
      reason,
    });
    revoked_credential_ids.push(row.credential_id);
  }

  if (revoked_credential_ids.length > 0) {
    await deps.sink.emit({
      name: "agent_credential.revoked",
      principal_id: caller.principal_id,
      correlation_id,
      payload: {
        target_principal_id: input.principal_id,
        reason_code: input.reason_code,
        revoked_count: revoked_credential_ids.length,
        revoked_credential_ids,
      },
    });
  }

  return {
    principal_id: input.principal_id,
    revoked_at: nowSec,
    effective_within_seconds: deps.effectiveWithinSeconds ?? 60,
    revoked_credential_ids,
  };
}

export interface ListRevokedInput {
  readonly since?: number; // unix seconds
  readonly kinds?: ReadonlyArray<"agent" | "service">;
}

export interface ListRevokedDeps {
  readonly listRepo: RevocationListRepo;
}

export async function listRevoked(
  caller: Principal,
  input: ListRevokedInput,
  deps: ListRevokedDeps,
): Promise<ReadonlyArray<RevocationListEntry>> {
  if (!isServicePrincipal(caller)) {
    throw new RoleRequiredError([], caller.kind);
  }
  requireScope(caller, REVOCATION_LIST_READ_SCOPE);

  const filter: Parameters<RevocationListRepo["list"]>[0] = {};
  if (input.since !== undefined) filter.since = new Date(input.since * 1000);
  if (input.kinds !== undefined) filter.kinds = input.kinds;
  return deps.listRepo.list(filter);
}

export interface PruneRevocationsDeps {
  readonly listRepo: RevocationListRepo;
  readonly now: () => number;
}

/**
 * T048 — Daily Inngest job. Removes revocation rows whose `expires_at`
 * is in the past; verifiers no longer need to consult them because the
 * underlying credential's JWT has aged out. The Drizzle adapter
 * batches with `LIMIT` if the operational backlog is unbounded; the
 * orchestration here delegates to `listRepo.pruneExpired`.
 */
export async function pruneExpiredRevocations(
  deps: PruneRevocationsDeps,
): Promise<{ pruned: number }> {
  const cutoff = new Date(deps.now() * 1000);
  const pruned = await deps.listRepo.pruneExpired(cutoff);
  return { pruned };
}
