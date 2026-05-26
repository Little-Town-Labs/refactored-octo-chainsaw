// F23 — Employer REST API idempotency records.
//
// schema-lint: skip-r2-timestamps
// Reason: records are immutable request evidence with expiry.

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

import { employerApiCredentials } from "./employer-api-credentials.js";
import { organizations } from "./organizations.js";

export const employerApiIdempotencyRecords = pgTable(
  "employer_api_idempotency_records",
  {
    idempotency_record_id: uuid("idempotency_record_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    org_id: uuid("org_id")
      .notNull()
      .references(() => organizations.org_id, { onDelete: "no action", onUpdate: "no action" }),
    credential_id: uuid("credential_id")
      .notNull()
      .references(() => employerApiCredentials.credential_id, {
        onDelete: "no action",
        onUpdate: "no action",
      }),
    operation: text("operation").notNull(),
    idempotency_key: text("idempotency_key").notNull(),
    request_fingerprint: text("request_fingerprint").notNull(),
    response_status: integer("response_status").notNull(),
    response_body: jsonb("response_body").$type<Record<string, unknown>>().notNull(),
    response_body_hash: text("response_body_hash").notNull(),
    resource_type: text("resource_type"),
    resource_id: text("resource_id"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    check("employer_api_idempotency_operation_check", sql`${t.operation} <> ''`),
    check("employer_api_idempotency_key_check", sql`${t.idempotency_key} <> ''`),
    check("employer_api_idempotency_fingerprint_check", sql`${t.request_fingerprint} <> ''`),
    check(
      "employer_api_idempotency_response_status_check",
      sql`${t.response_status} >= 100 AND ${t.response_status} <= 599`,
    ),
    uniqueIndex("employer_api_idempotency_org_operation_key_idx").on(
      t.org_id,
      t.operation,
      t.idempotency_key,
    ),
    index("employer_api_idempotency_expiry_idx").on(t.expires_at),
  ],
);

export type EmployerApiIdempotencyRecordRow = typeof employerApiIdempotencyRecords.$inferSelect;
export type NewEmployerApiIdempotencyRecordRow = typeof employerApiIdempotencyRecords.$inferInsert;
