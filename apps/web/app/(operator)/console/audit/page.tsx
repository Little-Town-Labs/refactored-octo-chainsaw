// F02 T059 — Operator audit-event viewer (`/operator/console/audit`).
//
// Read-only over `audit_events_buffer` (NFR-10, plan §12 Q4). F06
// owns kill-switch / sign-out actions; v0 of the audit surface is
// strictly observational.
//
// Thin RSC wrapper:
//   1. `getPrincipal()` — proxy.ts has already audience- + AAL2-
//      gated the `/operator/...` family, but we still tier-check
//      defense-in-depth (FR-32). Non-operators reaching this surface
//      get a typed RoleRequiredError → nearest error.tsx.
//   2. `parseAuditParams` — narrow URL searchParams to typed input.
//   3. Decode the opaque cursor (paranoid try/catch). Garbled or
//      stale cursors fall through to "no cursor" so a shareable link
//      remains usable.
//   4. Drizzle `list()` with `limit + 1` so we can detect a next
//      page without a separate count query.
//   5. Encode the next_cursor (if any) and render the pure view.

import { requireRole } from "@spyglass/auth";
import { getDb } from "@spyglass/db";
import type { JSX } from "react";

import { getPrincipal } from "../../../../src/auth/get-principal.js";
import {
  createDrizzleAuditEventsListRepo,
  type AuditEventsListRow,
} from "../../../../src/auth/audit-events-list-repo.js";
import { AuditEventsListView } from "../../../../src/console/audit-events-list-view.js";
import { parseAuditParams } from "../../../../src/console/parse-audit-search-params.js";

const PAGE_SIZE = 50;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PageProps {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

interface DecodedCursor {
  readonly created_at: Date;
  readonly event_id: string;
}

/**
 * Decode an opaque base64url-JSON cursor of shape `{c: ISO, e: UUID}`.
 * Returns `null` for any malformed input — a stale shareable link
 * should still render the unfiltered first page rather than 500.
 */
function decodeCursor(opaque: string): DecodedCursor | null {
  try {
    // Node's Buffer accepts "base64url"; the encoder uses the same.
    const json = Buffer.from(opaque, "base64url").toString("utf8");
    const parsed: unknown = JSON.parse(json);
    if (typeof parsed !== "object" || parsed === null) return null;
    const obj = parsed as Record<string, unknown>;
    if (typeof obj.c !== "string" || typeof obj.e !== "string") return null;
    if (!UUID_RE.test(obj.e)) return null;
    const ts = new Date(obj.c);
    if (Number.isNaN(ts.valueOf())) return null;
    return { created_at: ts, event_id: obj.e };
  } catch {
    return null;
  }
}

function encodeCursor(row: AuditEventsListRow): string {
  return Buffer.from(
    JSON.stringify({ c: row.created_at.toISOString(), e: row.event_id }),
    "utf8",
  ).toString("base64url");
}

export default async function AuditPage(props: PageProps): Promise<JSX.Element> {
  const principal = await getPrincipal();
  // Defense-in-depth tier check (FR-32). The proxy already gated
  // `/operator/...` upstream; this guard ensures a misconfigured
  // proxy can't silently leak audit data. Throws RoleRequiredError
  // → nearest error.tsx renders the typed deny.
  requireRole(principal, "operator");

  const raw = await props.searchParams;
  const params = parseAuditParams(raw);

  const repo = createDrizzleAuditEventsListRepo(getDb());

  const decoded = params.cursor !== undefined ? decodeCursor(params.cursor) : null;
  const filter: Parameters<typeof repo.list>[0] = {
    limit: PAGE_SIZE + 1,
    ...(params.principal_id !== undefined ? { principal_id: params.principal_id } : {}),
    ...(decoded !== null
      ? { cursor_created_at: decoded.created_at, cursor_event_id: decoded.event_id }
      : {}),
  };

  const fetched = await repo.list(filter);
  const hasMore = fetched.length > PAGE_SIZE;
  const rows: ReadonlyArray<AuditEventsListRow> = hasMore ? fetched.slice(0, PAGE_SIZE) : fetched;
  const next_cursor = hasMore ? encodeCursor(rows[rows.length - 1]!) : null;

  return <AuditEventsListView rows={rows} next_cursor={next_cursor} params={params} />;
}
