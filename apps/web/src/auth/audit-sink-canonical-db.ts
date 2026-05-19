// F05 T012 — post-cutover DB-backed AuditEventSink writing to the
// canonical hash-chained audit log.
//
// This lives beside the pre-cutover buffer sink. Cutover can switch
// callers to this factory after replay/back-checks pass.

import {
  appendCanonicalAuditEvent,
  createDrizzleCanonicalAuditWriterStore,
  type CanonicalAuditWriterStore,
} from "@spyglass/audit-log";
import type { AuditEventSink } from "@spyglass/auth";
import { principals, type Db } from "@spyglass/db";
import { eq } from "drizzle-orm";

import { createConsoleAuditSink } from "./audit-sink";

interface PrincipalLookup {
  readonly kind: "human" | "agent" | "service";
  readonly tier: string | null;
}

export interface CanonicalDrizzleAuditSinkOptions {
  readonly fallback?: AuditEventSink;
  readonly writerStore?: CanonicalAuditWriterStore;
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

export function createCanonicalDrizzleAuditSink(
  db: Db,
  options: CanonicalDrizzleAuditSinkOptions = {},
): AuditEventSink {
  const fallback = options.fallback ?? createConsoleAuditSink();
  const writerStore = options.writerStore ?? createDrizzleCanonicalAuditWriterStore(db);

  return {
    async emit(event) {
      if (event.principal_id === undefined) {
        await fallback.emit(event);
        return;
      }

      try {
        const lookup = await lookupKind(db, event.principal_id);
        if (lookup === null) {
          await fallback.emit(event);
          return;
        }

        await appendCanonicalAuditEvent(writerStore, {
          eventName: event.name,
          principalId: event.principal_id,
          principalKind: lookup.kind,
          roleOrScope: lookup.tier,
          correlationId: event.correlation_id,
          payload: { ...event.payload },
        });
      } catch (err) {
        console.error(
          JSON.stringify({
            kind: "canonical_audit_sink_failure",
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
