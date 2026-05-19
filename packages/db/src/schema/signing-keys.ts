// F02 T035 — `signing_keys` table (data-model §signing_keys).
//
// EdDSA keypairs for credential signing. The public key (JWK) is
// rendered into `/.well-known/jwks.json`; the private key is read
// from environment scope at runtime and never persisted here.
//
// Lifecycle:
//   - INSERT row with `activated_at = NULL` (pre-activation).
//   - UPDATE `activated_at = now()` on activation; the partial unique
//     index ensures only one active row per `purpose` at a time.
//   - UPDATE `retired_at = now()` to retire (becomes verify-only).
//   - UPDATE `verify_until` to the last issued credential's
//     `expires_at` + grace; after that timestamp, the row drops out
//     of the JWKS query (T039).

import { sql } from "drizzle-orm";
import { check, index, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

// schema-lint: skip-r2-timestamps
// Reason: lifecycle uses explicit phase timestamps (`created_at`,
// `activated_at`, `retired_at`, `verify_until`) rather than a generic
// `updated_at`. Per docs/data-governance/schema-conventions.md §2.

export const signingKeys = pgTable(
  "signing_keys",
  {
    kid: text("kid").primaryKey(),
    algorithm: text("algorithm").notNull().default("EdDSA"),
    public_key_jwk: jsonb("public_key_jwk").$type<Record<string, unknown>>().notNull(),
    purpose: text("purpose").notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    activated_at: timestamp("activated_at", { withTimezone: true }),
    retired_at: timestamp("retired_at", { withTimezone: true }),
    verify_until: timestamp("verify_until", { withTimezone: true }),
  },
  (t) => [
    check("signing_keys_purpose_check", sql`${t.purpose} IN ('agent', 'service')`),
    check("signing_keys_algorithm_check", sql`${t.algorithm} IN ('EdDSA')`),
    // Exactly one currently-signing key per purpose.
    uniqueIndex("signing_keys_active_per_purpose_idx")
      .on(t.purpose)
      .where(sql`${t.activated_at} IS NOT NULL AND ${t.retired_at} IS NULL`),
    // JWKS query: fetch keys still within their verify window.
    index("signing_keys_jwks_idx")
      .on(t.purpose, t.verify_until.desc())
      .where(sql`${t.verify_until} IS NULL`),
  ],
);

export type SigningKeyRow = typeof signingKeys.$inferSelect;
export type NewSigningKeyRow = typeof signingKeys.$inferInsert;
