// F04 T006 — `employer_req_tickets` table (data-model §1, §2.2).
//
// An employer requisition: role spec, comp band, jurisdictions,
// headcount. The state machine (draft → submitted → open → matching
// → filled | closed | withdrawn) is enforced by `@spyglass/tickets`.
//
// Identifier shape `ER-YYYY-NNNNN`.
//
// Headcount semantics (EC-2): `matching` is a self-loop for
// multi-headcount fills; transition to `filled` requires
// `headcount_filled == headcount_total`.
//
// Constitutional refs: §I.2 (state integrity), §I.5.2 (org_id
// scoping for employer-admin authorization), §I.A.1 (jurisdiction).

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

import { organizations } from "./organizations.js";
import { principals } from "./principals.js";

export const EMPLOYER_REQ_STATES = [
  "draft",
  "submitted",
  "open",
  "matching",
  "filled",
  "closed",
  "withdrawn",
] as const;
export type EmployerReqTicketState = (typeof EMPLOYER_REQ_STATES)[number];

export const ROLE_LEVELS = [
  "intern",
  "junior",
  "mid",
  "senior",
  "staff",
  "principal",
  "manager",
  "director",
  "vp",
  "exec",
] as const;
export type RoleLevel = (typeof ROLE_LEVELS)[number];

export const employerReqTickets = pgTable(
  "employer_req_tickets",
  {
    employer_req_ticket_id: uuid("employer_req_ticket_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    principal_id: uuid("principal_id")
      .notNull()
      .references(() => principals.principal_id),
    org_id: uuid("org_id")
      .notNull()
      .references(() => organizations.org_id),
    identifier: text("identifier").notNull(),
    state: text("state").notNull(),
    role_title: text("role_title").notNull(),
    role_level: text("role_level").notNull(),
    comp_band_min: integer("comp_band_min").notNull(),
    comp_band_max: integer("comp_band_max").notNull(),
    currency: text("currency").notNull(),
    jurisdictions: jsonb("jurisdictions").$type<string[]>().notNull(),
    decision_locus_jurisdiction: text("decision_locus_jurisdiction").notNull(),
    work_mode: text("work_mode").notNull(),
    headcount_total: integer("headcount_total").notNull(),
    headcount_filled: integer("headcount_filled").notNull().default(0),
    threshold: integer("threshold").notNull().default(75),
    flags: jsonb("flags")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
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
      "employer_req_tickets_state_check",
      sql`${t.state} IN ('draft','submitted','open','matching','filled','closed','withdrawn')`,
    ),
    check(
      "employer_req_tickets_role_level_check",
      sql`${t.role_level} IN ('intern','junior','mid','senior','staff','principal','manager','director','vp','exec')`,
    ),
    check(
      "employer_req_tickets_work_mode_check",
      sql`${t.work_mode} IN ('remote','hybrid','onsite')`,
    ),
    check(
      "employer_req_tickets_comp_band_order_check",
      sql`${t.comp_band_min} <= ${t.comp_band_max}`,
    ),
    // EC-2: headcount bounds. headcount_total ≥ 1; 0 ≤ filled ≤ total.
    check(
      "employer_req_tickets_headcount_check",
      sql`${t.headcount_total} >= 1 AND ${t.headcount_filled} >= 0 AND ${t.headcount_filled} <= ${t.headcount_total}`,
    ),
    check(
      "employer_req_tickets_jurisdictions_nonempty",
      sql`jsonb_typeof(${t.jurisdictions}) = 'array' AND jsonb_array_length(${t.jurisdictions}) >= 1`,
    ),
    check("employer_req_tickets_decision_locus_check", sql`${t.decision_locus_jurisdiction} <> ''`),
    check(
      "employer_req_tickets_threshold_check",
      sql`${t.threshold} >= 0 AND ${t.threshold} <= 100`,
    ),
    check(
      "employer_req_tickets_identifier_shape_check",
      sql`${t.identifier} ~ '^ER-[0-9]{4}-[0-9]{5}$'`,
    ),
    uniqueIndex("employer_req_tickets_identifier_idx").on(t.identifier),
    index("employer_req_tickets_state_hot_idx")
      .on(t.state)
      .where(sql`${t.state} IN ('matching','open')`),
    index("employer_req_tickets_org_idx").on(t.org_id, t.created_at.desc()),
    index("employer_req_tickets_decision_locus_idx").on(t.decision_locus_jurisdiction),
  ],
);

export type EmployerReqTicketRow = typeof employerReqTickets.$inferSelect;
export type NewEmployerReqTicketRow = typeof employerReqTickets.$inferInsert;
