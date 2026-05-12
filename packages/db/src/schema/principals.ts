// F02 T009/T010 — `principals` table (data-model §principals).
//
// System-of-record table for every authenticated actor. Materialized
// lazily on first authenticated request (EC-1) or eagerly via Clerk
// webhook (EC-2). The opaque `principal_id` (FR-2) is the foreign
// key every later feature uses; external IdP identifiers are
// recorded alongside but are not the system-of-record key.
//
// Constitutional refs: §I.5.3 (accountability), §II (agent identity).

import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { organizations } from "./organizations.js";

export const principals = pgTable(
  "principals",
  {
    principal_id: uuid("principal_id")
      .primaryKey()
      .default(sql`uuidv7()`),

    kind: text("kind").notNull(),

    external_idp: text("external_idp"),
    external_id: text("external_id"),

    tier: text("tier"),
    org_id: uuid("org_id").references(() => organizations.org_id),

    service_name: text("service_name"),
    service_version: text("service_version"),

    display_name: text("display_name"),

    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    disabled_at: timestamp("disabled_at", { withTimezone: true }),
    disabled_reason: text("disabled_reason"),
  },
  (t) => [
    check("principals_kind_check", sql`${t.kind} IN ('human', 'agent', 'service')`),
    check(
      "principals_tier_check",
      sql`${t.tier} IS NULL OR ${t.tier} IN ('seeker','employer_admin','employer_member','operator')`,
    ),
    // FR-1 invariants — kind-specific column nullability.
    check(
      "principals_human_invariant",
      sql`${t.kind} <> 'human' OR (${t.external_idp} = 'clerk' AND ${t.external_id} IS NOT NULL AND ${t.tier} IS NOT NULL)`,
    ),
    check(
      "principals_agent_invariant",
      sql`${t.kind} <> 'agent' OR (${t.external_idp} IS NULL AND ${t.service_name} IS NULL)`,
    ),
    check(
      "principals_service_invariant",
      sql`${t.kind} <> 'service' OR (${t.service_name} IS NOT NULL AND ${t.service_version} IS NOT NULL)`,
    ),
    // FR-7 / data-model invariant: tiered humans require an org_id.
    check(
      "principals_tier_org_invariant",
      sql`${t.tier} IS NULL OR ${t.tier} = 'seeker' OR ${t.org_id} IS NOT NULL`,
    ),
    uniqueIndex("principals_external_idx")
      .on(t.external_idp, t.external_id)
      .where(sql`${t.external_idp} IS NOT NULL`),
    index("principals_kind_tier_idx").on(t.kind, t.tier),
    index("principals_org_idx")
      .on(t.org_id)
      .where(sql`${t.org_id} IS NOT NULL`),
    index("principals_created_at_idx").on(t.created_at.desc()),
  ],
);

/**
 * Drizzle row types are renamed to `*Row` so they do not collide with
 * the runtime `Principal` discriminated union exported from
 * `@spyglass/auth`. The DB row is a flat persistence shape; the
 * runtime Principal is the typed authentication-result object.
 */
export type PrincipalRow = typeof principals.$inferSelect;
export type NewPrincipalRow = typeof principals.$inferInsert;
