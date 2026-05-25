// F22 — Employer organization profile.
//
// Durable employer-controlled profile data for the employer admin
// console. `organizations` remains a Clerk mirror; profile mutations
// live here so web-console edits do not mutate identity-provider state.

import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { organizations } from "./organizations.js";
import { principals } from "./principals.js";

export const employerOrganizationProfiles = pgTable(
  "employer_organization_profiles",
  {
    profile_id: uuid("profile_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    org_id: uuid("org_id")
      .notNull()
      .references(() => organizations.org_id, {
        onDelete: "no action",
        onUpdate: "no action",
      }),
    company_name: text("company_name").notNull(),
    company_summary: text("company_summary").notNull(),
    mission: text("mission").notNull(),
    culture: text("culture").notNull(),
    benefits: text("benefits").notNull(),
    workplace_policy: text("workplace_policy").notNull(),
    updated_by: uuid("updated_by")
      .notNull()
      .references(() => principals.principal_id, {
        onDelete: "no action",
        onUpdate: "no action",
      }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    check("employer_organization_profiles_company_name_check", sql`${t.company_name} <> ''`),
    check("employer_organization_profiles_summary_check", sql`${t.company_summary} <> ''`),
    uniqueIndex("employer_organization_profiles_org_idx").on(t.org_id),
    index("employer_organization_profiles_updated_idx").on(t.updated_at.desc()),
  ],
);

export type EmployerOrganizationProfileRow = typeof employerOrganizationProfiles.$inferSelect;
export type NewEmployerOrganizationProfileRow = typeof employerOrganizationProfiles.$inferInsert;
