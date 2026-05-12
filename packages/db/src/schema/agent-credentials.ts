// F02 T035 — `agent_credentials` table (data-model §agent_credentials).
//
// Issued JWT records — for revocation, rate limiting, and forensic
// attribution. The JWT itself is not stored (the bearer holds the
// full token); only metadata needed to revoke and audit.
//
// FR-19 / FR-20: scopes are bound at issuance and immutable; TTL is
// capped at 2h. EC-8: re-issuance for the same (run_id, side,
// contract_id, contract_version) tuple returns the existing row.
//
// Principal-kind invariant. `principal_id` must reference a
// principal with `kind = 'agent'`. The plain FK cannot enforce
// this; F02 issuance code is the sole writer and is responsible
// for rejecting non-agent targets. (Generated-column composite FK
// enforcement is a v1 defense-in-depth follow-up; same pattern
// applies to `service_credentials` ↔ `kind='service'`.)

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

import { principals } from "./principals.js";

export const agentCredentials = pgTable(
  "agent_credentials",
  {
    credential_id: uuid("credential_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    principal_id: uuid("principal_id")
      .notNull()
      .references(() => principals.principal_id),
    run_id: uuid("run_id").notNull(),
    side: text("side").notNull(),
    contract_id: text("contract_id").notNull(),
    contract_version: text("contract_version").notNull(),
    ticket_id: uuid("ticket_id").notNull(),
    scope_set: jsonb("scope_set").notNull(),
    kid: text("kid").notNull(),
    issued_at: timestamp("issued_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
    revoked_at: timestamp("revoked_at", { withTimezone: true }),
    revoked_by: uuid("revoked_by").references(() => principals.principal_id),
    revocation_reason: text("revocation_reason"),
  },
  (t) => [
    check("agent_credentials_side_check", sql`${t.side} IN ('seeker', 'employer')`),
    // Defense-in-depth for FR-19 (non-empty scopes).
    check(
      "agent_credentials_scope_set_nonempty",
      sql`jsonb_typeof(${t.scope_set}) = 'array' AND jsonb_array_length(${t.scope_set}) >= 1`,
    ),
    // Defense-in-depth for FR-20 (≤2h TTL ceiling).
    check(
      "agent_credentials_ttl_ceiling",
      sql`${t.expires_at} <= ${t.issued_at} + interval '7200 seconds'`,
    ),
    // Idempotency (EC-8): same (run, side, contract) → same credential.
    uniqueIndex("agent_credentials_idempotency_idx").on(
      t.run_id,
      t.side,
      t.contract_id,
      t.contract_version,
    ),
    // Active-credential queries.
    index("agent_credentials_active_idx")
      .on(t.expires_at)
      .where(sql`${t.revoked_at} IS NULL`),
    // Live revocation list — credentials revoked but not yet expired.
    index("agent_credentials_revoked_live_idx")
      .on(t.revoked_at, t.expires_at)
      .where(sql`${t.revoked_at} IS NOT NULL AND ${t.expires_at} > now()`),
    index("agent_credentials_ticket_idx").on(t.ticket_id),
  ],
);

export type AgentCredentialRow = typeof agentCredentials.$inferSelect;
export type NewAgentCredentialRow = typeof agentCredentials.$inferInsert;
