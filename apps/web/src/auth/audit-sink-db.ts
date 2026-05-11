// F02 T059a — DB-backed `AuditEventSink` writing to
// `audit_events_buffer`. Pre-F05 buffer; F05 will replace this with
// the canonical hash-chained log.
//
// Operator-events only by design: events without a `principal_id`
// (pre-auth verifier rejections like the Vercel-OIDC guard) skip
// the buffer and fall through to a console fallback so the audit
// trail stays continuous.
//
// `principal_kind` and `role_or_scope` are derived by looking up
// the principal_id in `principals` rather than extending the
// `AuditEventSink` interface across the package boundary. One
// extra SELECT per audit emit is acceptable for human-rate
// operator actions (issuance + revocation are not hot paths). If
// audit volume ever justifies it, swap in a per-request memo.
//
// `role_or_scope` semantics at v0:
//   human   → principals.tier (e.g. "operator")
//   agent   → null (agents don't drive operator-console events)
//   service → null (service callers carry scope sets, not tiers;
//             scope-set derivation lands when service-driven events
//             are wired to this sink — currently they remain on the
//             console-only path)
// T059 audit viewer renders this column as "—" for non-human rows.

import type { AuditEventSink } from "@spyglass/auth";
import { auditEventsBuffer, principals, type Db } from "@spyglass/db";
import { eq } from "drizzle-orm";

import { createConsoleAuditSink } from "./audit-sink.js";

interface PrincipalLookup {
  readonly kind: "human" | "agent" | "service";
  readonly tier: string | null;
}

async function lookupKind(db: Db, principal_id: string): Promise<PrincipalLookup | null> {
  const rows = await db
    .select({ kind: principals.kind, tier: principals.tier })
    .from(principals)
    .where(eq(principals.principal_id, principal_id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (row.kind !== "human" && row.kind !== "agent" && row.kind !== "service") return null;
  return { kind: row.kind, tier: row.tier };
}

/** Soft cap on serialized payload size — bigger payloads are kept
 * but stamped so a future migration to F05's hash-chained log can
 * choose a truncation policy. The buffer is read-cold; bloat
 * primarily costs storage. */
const PAYLOAD_SOFT_CAP_BYTES = 16 * 1024;

export interface DrizzleAuditSinkOptions {
  /**
   * If the principal lookup or insert fails, fall back to console
   * so the audit signal is never silently dropped. Defaults to a
   * fresh `createConsoleAuditSink()`.
   */
  readonly fallback?: AuditEventSink;
}

function capPayload(payload: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const copy = { ...payload };
  const json = JSON.stringify(copy);
  if (json.length > PAYLOAD_SOFT_CAP_BYTES) {
    copy._audit_payload_oversize = true;
    copy._audit_payload_bytes = json.length;
  }
  return copy;
}

export function createDrizzleAuditSink(
  db: Db,
  options: DrizzleAuditSinkOptions = {},
): AuditEventSink {
  const fallback = options.fallback ?? createConsoleAuditSink();
  return {
    async emit(event) {
      // Pre-auth events (no principal_id) cannot satisfy the NOT NULL
      // FK to principals. Route them to the console-only sink.
      if (event.principal_id === undefined) {
        await fallback.emit(event);
        return;
      }
      try {
        const lookup = await lookupKind(db, event.principal_id);
        if (lookup === null) {
          // Principal not (yet) materialized — write to fallback so
          // the event is not lost. Reconciliation will surface drift.
          //
          // Audit-viewer reads `audit_events_buffer` only, so this
          // fallback is observable in the operator UI only via stdout.
          // Emit a structured warning so the gap is searchable rather
          // than silent (addresses T068/MEDIUM-2).
          console.warn(
            JSON.stringify({
              ts: new Date().toISOString(),
              kind: "audit_db_fallback_to_console",
              reason: "principal_not_found",
              name: event.name,
              correlation_id: event.correlation_id,
            }),
          );
          await fallback.emit(event);
          return;
        }
        await db.insert(auditEventsBuffer).values({
          event_name: event.name,
          principal_id: event.principal_id,
          principal_kind: lookup.kind,
          role_or_scope: lookup.tier,
          correlation_id: event.correlation_id,
          payload: capPayload(event.payload),
        });
      } catch (err) {
        // Defense-in-depth: a sink failure must never mask the
        // domain action. The orchestrators already wrap emit in a
        // try/catch but we double up here so callers that don't
        // wrap still don't leak DB errors as domain failures. Log
        // the cause so a silent DB outage is visible in operator
        // logs (NFR-10).
        console.error(
          JSON.stringify({
            kind: "audit_sink_failure",
            name: event.name,
            correlation_id: event.correlation_id,
            error: err instanceof Error ? err.message : String(err),
          }),
        );
        await fallback.emit(event);
      }
    },
  };
}
