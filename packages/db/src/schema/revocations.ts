// F02 T035 — `revocations` table (data-model §revocations).
//
// Denormalized live revocation list — credentials revoked AND not
// yet expired. The verifier consults this on mint and on
// cross-process refresh (FR-21). Rows older than `expires_at` are
// pruned by the daily Inngest job (T048).
//
// Sized to fit comfortably in memory (target <10k rows) so the
// verifier can cache the full set with a 5-min TTL.

import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const revocations = pgTable(
  "revocations",
  {
    credential_id: uuid("credential_id").primaryKey(),
    kind: text("kind").notNull(),
    expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
    revoked_at: timestamp("revoked_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    check("revocations_kind_check", sql`${t.kind} IN ('agent', 'service')`),
    // Pruner range scan.
    index("revocations_expires_at_idx").on(t.expires_at),
  ],
);

export type RevocationRow = typeof revocations.$inferSelect;
export type NewRevocationRow = typeof revocations.$inferInsert;
