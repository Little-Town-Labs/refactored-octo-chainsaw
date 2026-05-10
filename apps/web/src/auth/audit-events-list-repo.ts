// F02 T059 — Drizzle-backed reader for `audit_events_buffer`.
//
// The audit viewer (`/operator/console/audit`) is read-only and
// pre-F05; F05 replaces this buffer with the canonical hash-chained
// log. We deliberately keep the reader in `apps/web` rather than
// promoting it into `@spyglass/auth` so the package boundary doesn't
// need to ship audit-query types that F05 will redesign.
//
// Ordering is `(created_at DESC, event_id DESC)` — matches the
// `audit_events_buffer_created_at_idx` (created_at desc) and the
// `audit_events_buffer_principal_idx` (principal_id, created_at
// desc) declared in `packages/db/src/schema/audit-events-buffer.ts`
// + migration `0003_f02_b6_audit_events_buffer.sql`. Keyset cursor
// predicate is the canonical tuple-< shape:
//   `(created_at < c) OR (created_at = c AND event_id < eid)`.
//
// Filters at v0:
//   - principal_id (operator looking up a specific actor's trail)
// `event_name` filtering and free-text search are F05 territory.

import { auditEventsBuffer, type Db } from "@spyglass/db";
import { and, desc, eq, lt, or } from "drizzle-orm";

export interface AuditEventsListFilter {
  readonly principal_id?: string;
  readonly cursor_created_at?: Date;
  readonly cursor_event_id?: string;
  readonly limit: number;
}

export interface AuditEventsListRow {
  readonly event_id: string;
  readonly event_name: string;
  readonly principal_id: string;
  readonly principal_kind: "human" | "agent" | "service";
  readonly role_or_scope: string | null;
  readonly correlation_id: string;
  readonly payload: Record<string, unknown>;
  readonly created_at: Date;
}

export interface AuditEventsListRepo {
  list(filter: AuditEventsListFilter): Promise<ReadonlyArray<AuditEventsListRow>>;
}

export function createDrizzleAuditEventsListRepo(db: Db): AuditEventsListRepo {
  return {
    async list(filter) {
      const predicates = [];
      if (filter.principal_id !== undefined) {
        predicates.push(eq(auditEventsBuffer.principal_id, filter.principal_id));
      }
      if (filter.cursor_created_at && filter.cursor_event_id) {
        predicates.push(
          or(
            lt(auditEventsBuffer.created_at, filter.cursor_created_at),
            and(
              eq(auditEventsBuffer.created_at, filter.cursor_created_at),
              lt(auditEventsBuffer.event_id, filter.cursor_event_id),
            ),
          )!,
        );
      }

      const rows = await db
        .select({
          event_id: auditEventsBuffer.event_id,
          event_name: auditEventsBuffer.event_name,
          principal_id: auditEventsBuffer.principal_id,
          principal_kind: auditEventsBuffer.principal_kind,
          role_or_scope: auditEventsBuffer.role_or_scope,
          correlation_id: auditEventsBuffer.correlation_id,
          payload: auditEventsBuffer.payload,
          created_at: auditEventsBuffer.created_at,
        })
        .from(auditEventsBuffer)
        .where(predicates.length > 0 ? and(...predicates) : undefined)
        .orderBy(desc(auditEventsBuffer.created_at), desc(auditEventsBuffer.event_id))
        .limit(filter.limit);

      // `principal_kind` is constrained by `audit_events_buffer_principal_kind_check`
      // and `payload` is `jsonb NOT NULL` — both guaranteed by the
      // schema, no runtime coercion needed.
      return rows.map((r) => ({
        ...r,
        principal_kind: r.principal_kind as "human" | "agent" | "service",
      }));
    },
  };
}
