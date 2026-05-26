// F23 — Employer REST API credentials.
//
// schema-lint: skip-r2-timestamps
// Reason: credential rows are lifecycle evidence. `revoked_at` and
// status transitions are security/audit state, not ordinary updates.

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
} from "drizzle-orm/pg-core";

import { organizations } from "./organizations.js";
import { principals } from "./principals.js";

export const EMPLOYER_API_CREDENTIAL_STATUSES = [
  "active",
  "rotating",
  "revoked",
  "expired",
] as const;
export type EmployerApiCredentialStatus = (typeof EMPLOYER_API_CREDENTIAL_STATUSES)[number];

export const employerApiCredentials = pgTable(
  "employer_api_credentials",
  {
    credential_id: uuid("credential_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    org_id: uuid("org_id")
      .notNull()
      .references(() => organizations.org_id, { onDelete: "no action", onUpdate: "no action" }),
    principal_id: uuid("principal_id")
      .notNull()
      .references(() => principals.principal_id, {
        onDelete: "no action",
        onUpdate: "no action",
      }),
    display_name: text("display_name").notNull(),
    secret_hash: text("secret_hash").notNull(),
    scopes: jsonb("scopes").$type<string[]>().notNull(),
    status: text("status").notNull().default("active"),
    expires_at: timestamp("expires_at", { withTimezone: true }),
    last_used_at: timestamp("last_used_at", { withTimezone: true }),
    created_by_principal_id: uuid("created_by_principal_id")
      .notNull()
      .references(() => principals.principal_id, {
        onDelete: "no action",
        onUpdate: "no action",
      }),
    revoked_by_principal_id: uuid("revoked_by_principal_id").references(
      () => principals.principal_id,
      { onDelete: "no action", onUpdate: "no action" },
    ),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    revoked_at: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [
    check("employer_api_credentials_display_name_check", sql`${t.display_name} <> ''`),
    check("employer_api_credentials_secret_hash_check", sql`${t.secret_hash} <> ''`),
    check(
      "employer_api_credentials_scopes_nonempty",
      sql`jsonb_typeof(${t.scopes}) = 'array' AND jsonb_array_length(${t.scopes}) >= 1`,
    ),
    check(
      "employer_api_credentials_status_check",
      sql`${t.status} IN ('active','rotating','revoked','expired')`,
    ),
    uniqueIndex("employer_api_credentials_secret_hash_unique_idx").on(t.secret_hash),
    index("employer_api_credentials_org_status_idx").on(t.org_id, t.status, t.created_at.desc()),
    index("employer_api_credentials_principal_idx").on(t.principal_id, t.created_at.desc()),
  ],
);

export type EmployerApiCredentialRow = typeof employerApiCredentials.$inferSelect;
export type NewEmployerApiCredentialRow = typeof employerApiCredentials.$inferInsert;
