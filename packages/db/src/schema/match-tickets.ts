// F04 T007 — `match_tickets` table (data-model §1, §2.3).
//
// A negotiation seat pairing a seeker_tickets row with an
// employer_req_tickets row. Produces the `run_id` F02's
// agent_credentials reference. Carries frozen contract refs +
// privacy-ruleset ref (Parley SPEC §4.1.1) and the decision-locus
// jurisdiction (Constitution §I.A.1).
//
// The state machine (created → negotiating → delivered → accepted |
// rejected | expired; plus delivered/expired → negotiating for
// re-negotiation per EC-7) is enforced by `@spyglass/tickets`.
//
// CL-2 note: `dossier_id` is declared nullable with **no FK
// constraint** at F04 time. F10's migration adds the FK to
// `dossiers(dossier_id)` when that table lands. F04's
// `assertTransition` enforces the `delivered → accepted/rejected`
// invariant that `dossier_id IS NOT NULL`.
//
// FR-8 idempotency: UNIQUE (seeker_ticket_id, employer_req_ticket_id,
// attempt). Re-negotiation (EC-7) bumps `attempt` so the unique
// constraint doesn't reject the new run.
//
// FR-11 round bookkeeping: 0 ≤ round ≤ round_cap; round_cap ≥ 1.

import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { employerReqTickets } from "./employer-req-tickets.js";
import { seekerTickets } from "./seeker-tickets.js";

export const MATCH_STATES = [
  "created",
  "negotiating",
  "delivered",
  "accepted",
  "rejected",
  "expired",
] as const;
export type MatchTicketState = (typeof MATCH_STATES)[number];

export const matchTickets = pgTable(
  "match_tickets",
  {
    match_ticket_id: uuid("match_ticket_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    identifier: text("identifier").notNull(),
    seeker_ticket_id: uuid("seeker_ticket_id")
      .notNull()
      .references(() => seekerTickets.seeker_ticket_id),
    employer_req_ticket_id: uuid("employer_req_ticket_id")
      .notNull()
      .references(() => employerReqTickets.employer_req_ticket_id),
    state: text("state").notNull(),
    round: integer("round").notNull().default(0),
    round_cap: integer("round_cap").notNull(),
    // Allocated on transition to `negotiating`; cleared on
    // re-negotiation (EC-7) before re-entering `negotiating`.
    run_id: uuid("run_id"),
    attempt: integer("attempt").notNull().default(1),
    // Frozen at run start per Parley SPEC §4.1.1 / §4.1.4.
    seeker_contract_id: text("seeker_contract_id").notNull(),
    seeker_contract_version: text("seeker_contract_version").notNull(),
    employer_contract_id: text("employer_contract_id").notNull(),
    employer_contract_version: text("employer_contract_version").notNull(),
    privacy_ruleset_id: text("privacy_ruleset_id").notNull(),
    privacy_ruleset_version: text("privacy_ruleset_version").notNull(),
    decision_locus_jurisdiction: text("decision_locus_jurisdiction").notNull(),
    flags: jsonb("flags")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    // CL-2: nullable, no FK until F10 lands `dossiers`. Application-
    // level `assertTransition` enforces non-null at `delivered`.
    // schema-lint: skip-r5-fk-behavior
    // Reason: F04 ships dossier_id nullable without an FK constraint
    // per CL-2; F10's migration adds the FK to dossiers(dossier_id)
    // when that table lands. Without the target table, an FK declaration
    // here would fail to apply. Documented invariant lives in
    // assertTransition (delivered → accepted/rejected require dossier_id IS NOT NULL).
    dossier_id: uuid("dossier_id"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    disabled_at: timestamp("disabled_at", { withTimezone: true }),
  },
  (t) => [
    check(
      "match_tickets_state_check",
      sql`${t.state} IN ('created','negotiating','delivered','accepted','rejected','expired')`,
    ),
    // FR-11 / EC-6: round bookkeeping.
    check(
      "match_tickets_round_bounds_check",
      sql`${t.round} >= 0 AND ${t.round} <= ${t.round_cap}`,
    ),
    check("match_tickets_round_cap_check", sql`${t.round_cap} >= 1`),
    // FR-10: attempt ≥ 1 (re-negotiation bumps it).
    check("match_tickets_attempt_check", sql`${t.attempt} >= 1`),
    check("match_tickets_identifier_shape_check", sql`${t.identifier} ~ '^MT-[0-9]{4}-[0-9]{5}$'`),
    uniqueIndex("match_tickets_identifier_idx").on(t.identifier),
    // FR-8 idempotency: same (seeker, employer-req, attempt) cannot
    // produce two rows. Re-negotiation bumps attempt so a new row is
    // permitted; the existing row remains for audit.
    uniqueIndex("match_tickets_idempotency_idx").on(
      t.seeker_ticket_id,
      t.employer_req_ticket_id,
      t.attempt,
    ),
    // Hot-state listings (Parley harness work queue).
    index("match_tickets_state_hot_idx")
      .on(t.state)
      .where(sql`${t.state} IN ('negotiating','created')`),
    index("match_tickets_seeker_fk_idx").on(t.seeker_ticket_id),
    index("match_tickets_employer_fk_idx").on(t.employer_req_ticket_id),
    // Parley run lookup.
    index("match_tickets_run_id_idx")
      .on(t.run_id)
      .where(sql`${t.run_id} IS NOT NULL`),
    // F06 policy-gate join target.
    index("match_tickets_jurisdiction_idx").on(t.decision_locus_jurisdiction),
  ],
);

export type MatchTicketRow = typeof matchTickets.$inferSelect;
export type NewMatchTicketRow = typeof matchTickets.$inferInsert;
