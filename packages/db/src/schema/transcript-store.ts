// F05 — Canonical Parley transcript store.
//
// schema-lint: skip-r2-timestamps
// Reason: transcript turns are append-only evidence records. Raw content
// can only be redacted through the F05 tombstone procedure.

import { sql } from "drizzle-orm";
import {
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  integer,
} from "drizzle-orm/pg-core";

import { auditLogEvents } from "./audit-log.js";
import { matchTickets } from "./match-tickets.js";

export const TRANSCRIPT_SIDES = ["seeker", "employer"] as const;
export type TranscriptSide = (typeof TRANSCRIPT_SIDES)[number];

export const transcriptTurns = pgTable(
  "transcript_turns",
  {
    transcript_turn_id: uuid("transcript_turn_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    match_ticket_id: uuid("match_ticket_id")
      .notNull()
      .references(() => matchTickets.match_ticket_id, {
        onDelete: "no action",
        onUpdate: "no action",
      }),
    run_id: uuid("run_id").notNull(),
    side: text("side").notNull(),
    turn_index: integer("turn_index").notNull(),
    contract_id: text("contract_id"),
    contract_version: text("contract_version"),
    rubric_id: text("rubric_id"),
    rubric_version: text("rubric_version"),
    model_ref: text("model_ref"),
    tool_call_refs: jsonb("tool_call_refs")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    content: jsonb("content").$type<Record<string, unknown> | null>(),
    content_hash: text("content_hash").notNull(),
    audit_event_id: uuid("audit_event_id")
      .notNull()
      .references(() => auditLogEvents.audit_event_id, {
        onDelete: "no action",
        onUpdate: "no action",
      }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    tombstoned_at: timestamp("tombstoned_at", { withTimezone: true }),
  },
  (t) => [
    check("transcript_turns_side_check", sql`${t.side} IN ('seeker','employer')`),
    check(
      "transcript_turns_tombstone_content_check",
      sql`${t.tombstoned_at} IS NULL OR ${t.content} IS NULL`,
    ),
    uniqueIndex("transcript_turns_idempotency_idx").on(t.run_id, t.side, t.turn_index),
    index("transcript_turns_match_idx").on(t.match_ticket_id, t.created_at),
    uniqueIndex("transcript_turns_audit_event_idx").on(t.audit_event_id),
  ],
);

export type TranscriptTurnRow = typeof transcriptTurns.$inferSelect;
export type NewTranscriptTurnRow = typeof transcriptTurns.$inferInsert;
