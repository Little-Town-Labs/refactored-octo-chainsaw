// F02 T059a — `audit_events_buffer` table (data-model
// §audit_events_buffer).
//
// Pre-F05 buffer for structured audit events. F05 will replace
// this with the canonical hash-chained log; F02 emits unchanged so
// the buffer-table writer can ingest the same payload shape.
//
// Sized for write-heavy / read-cold access. Indexes are
// deliberately minimal — F05 is the right place to invest in audit
// query performance, not here.
//
// Operator-events only at v0: events that have a calling principal
// (issuance, revocation, materialization). Pre-auth events (e.g.
// Vercel-OIDC rejection at the verifier) continue to go to the
// console-only sink and never reach this table — `principal_id` is
// NOT NULL by design and pre-auth events have no actor to attribute.

import { sql } from "drizzle-orm";
import { check, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { principals } from "./principals.js";

export const auditEventsBuffer = pgTable(
  "audit_events_buffer",
  {
    event_id: uuid("event_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    event_name: text("event_name").notNull(),
    principal_id: uuid("principal_id")
      .notNull()
      .references(() => principals.principal_id),
    principal_kind: text("principal_kind").notNull(),
    role_or_scope: text("role_or_scope"),
    correlation_id: text("correlation_id").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    check(
      "audit_events_buffer_principal_kind_check",
      sql`${t.principal_kind} IN ('human', 'agent', 'service')`,
    ),
    // Audit viewer queries: newest-first by principal or globally.
    index("audit_events_buffer_created_at_idx").on(t.created_at.desc()),
    index("audit_events_buffer_principal_idx").on(t.principal_id, t.created_at.desc()),
  ],
);

export type AuditEventsBufferRow = typeof auditEventsBuffer.$inferSelect;
export type NewAuditEventsBufferRow = typeof auditEventsBuffer.$inferInsert;
