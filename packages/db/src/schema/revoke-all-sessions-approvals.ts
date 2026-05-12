// F02 T059b — `revoke_all_sessions_approvals` table.
//
// Persists the "first operator initiated" state for the
// two-operator gate on `revokeAllSessionsForPrincipal` against an
// operator target (EC-3, plan §12 Q2). When a non-operator is
// targeted the orchestrator skips this table entirely.
//
// Lifecycle:
//   1. Operator A invokes revoke-all on operator B's principal_id —
//      a row is inserted with `initiated_by = A`, `target = B`,
//      `expires_at = initiated_at + 15 min`.
//   2. Operator C (must differ from A) presents the `approval_id`
//      within the TTL — `approved_by = C`, `approved_at = now`,
//      `executed_at = now` are stamped in the same transaction the
//      session revocation runs in.
//   3. Expired rows remain for audit; a future pruner sweeps them.
//
// `executed_at` is NULL until step 2 commits; reading the row in
// step 2 with `executed_at IS NULL AND expires_at > now()` is the
// idempotency check.

import { sql } from "drizzle-orm";
import { check, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { principals } from "./principals.js";

// schema-lint: skip-r2-timestamps
// Reason: workflow row — `initiated_at` is the creation timestamp;
// state advances through `approved_at` / `executed_at` columns rather
// than a generic `updated_at`. Per docs/data-governance/schema-conventions.md §2.

export const revokeAllSessionsApprovals = pgTable(
  "revoke_all_sessions_approvals",
  {
    approval_id: uuid("approval_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    target_principal_id: uuid("target_principal_id")
      .notNull()
      .references(() => principals.principal_id),
    initiated_by: uuid("initiated_by")
      .notNull()
      .references(() => principals.principal_id),
    reason_code: text("reason_code").notNull(),
    notes: text("notes"),
    initiated_at: timestamp("initiated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
    approved_by: uuid("approved_by").references(() => principals.principal_id),
    approved_at: timestamp("approved_at", { withTimezone: true }),
    executed_at: timestamp("executed_at", { withTimezone: true }),
  },
  (t) => [
    // Two-operator rule: the approver must differ from the initiator.
    // The CHECK only fires once `approved_by` is set; until then the
    // partial constraint is vacuously satisfied.
    check(
      "revoke_all_sessions_approvals_distinct_operators_check",
      sql`${t.approved_by} IS NULL OR ${t.approved_by} <> ${t.initiated_by}`,
    ),
    // Reason code is also typed as `RevokeAllReasonCode` in
    // packages/auth, but a future surface bypassing the orchestrator
    // (or a buggy caller) shouldn't pollute audit/compliance reports
    // with arbitrary strings.
    check(
      "revoke_all_sessions_approvals_reason_code_check",
      sql`${t.reason_code} IN ('session_compromise', 'operator_emergency', 'credential_rotation', 'compliance_action')`,
    ),
    // Lookup is by `approval_id` (PK seek) so no composite index is
    // needed at v0. T060 will add one when the operator console
    // gains a "pending approvals" listing surface.
  ],
);

export type RevokeAllSessionsApprovalRow = typeof revokeAllSessionsApprovals.$inferSelect;
export type NewRevokeAllSessionsApprovalRow = typeof revokeAllSessionsApprovals.$inferInsert;
