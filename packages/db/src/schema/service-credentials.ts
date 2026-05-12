// F02 T049 — `service_credentials` table (data-model §service_credentials).
//
// Issued service-to-service JWTs (FR-23..FR-26a). Same shape as
// `agent_credentials` minus the run/contract binding — service
// principals don't run inside a contracted negotiation, they call
// peer services on the platform's behalf.
//
// FR-26a: F02 is the trust anchor for in-app service identity.
// Tokens here are EdDSA-signed via a `signing_keys` row whose
// `purpose='service'` (kept distinct from agent root per
// data-model §signing_keys).
//
// Principal-kind invariant. `principal_id` must reference a
// principal with `kind = 'service'`. The plain FK cannot enforce
// this; F02 issuance code is the sole writer and is responsible
// for rejecting non-service callers. (Same invariant pattern as
// `agent_credentials` ↔ `kind='agent'`. Generated-column composite
// FK enforcement is a v1 defense-in-depth follow-up.)

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

import { principals } from "./principals.js";

// schema-lint: skip-r2-timestamps
// Reason: append-only issuance record (parity with agent_credentials);
// `issued_at` is the creation timestamp; `revoked_at` is the only
// permitted state change. Per docs/data-governance/schema-conventions.md §2.

export const serviceCredentials = pgTable(
  "service_credentials",
  {
    credential_id: uuid("credential_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    principal_id: uuid("principal_id")
      .notNull()
      .references(() => principals.principal_id),
    scope_set: jsonb("scope_set").notNull(),
    kid: text("kid").notNull(),
    issued_at: timestamp("issued_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
    revoked_at: timestamp("revoked_at", { withTimezone: true }),
    revoked_by: uuid("revoked_by").references(() => principals.principal_id),
    revocation_reason: text("revocation_reason"),
    // Increments on rotation; old generations remain verifiable until
    // their `expires_at`. FR-25.
    rotation_generation: integer("rotation_generation").notNull().default(1),
  },
  (t) => [
    // Defense-in-depth: scopes are bound at issuance and non-empty.
    check(
      "service_credentials_scope_set_nonempty",
      sql`jsonb_typeof(${t.scope_set}) = 'array' AND jsonb_array_length(${t.scope_set}) >= 1`,
    ),
    // Service tokens follow the same ≤2h ceiling as agent tokens
    // (Constitution §I.5.2 short-lived credentials; FR-20 by analogy).
    check(
      "service_credentials_ttl_ceiling",
      sql`${t.expires_at} <= ${t.issued_at} + interval '7200 seconds'`,
    ),
    check("service_credentials_rotation_generation_positive", sql`${t.rotation_generation} >= 1`),
    // At most one credential per service per rotation generation —
    // catches double-issuance bugs during rotation races (FR-25).
    uniqueIndex("service_credentials_principal_generation_idx").on(
      t.principal_id,
      t.rotation_generation,
    ),
    // Latest-live-token-for-service lookup.
    index("service_credentials_principal_idx").on(t.principal_id, t.expires_at.desc()),
    // Active-credential hot path (parity with agent_credentials).
    index("service_credentials_active_idx")
      .on(t.expires_at)
      .where(sql`${t.revoked_at} IS NULL`),
    // Live revocation list (verifier cross-process refresh, FR-21 by analogy).
    index("service_credentials_revoked_live_idx")
      .on(t.revoked_at, t.expires_at)
      .where(sql`${t.revoked_at} IS NOT NULL AND ${t.expires_at} > now()`),
  ],
);

export type ServiceCredentialRow = typeof serviceCredentials.$inferSelect;
export type NewServiceCredentialRow = typeof serviceCredentials.$inferInsert;
