// F02 T060 — Drizzle adapters for the two-operator
// `revokeAllSessionsForPrincipal` orchestrator (FR-35, EC-3).
//
// Three deps the orchestrator (`@spyglass/auth#revokeAllSessionsForPrincipal`)
// pulls in, all wired here so the action layer composes them by name:
//
//   - `RevokeAllApprovalRepo`  — persists pending approvals
//   - `PrincipalKindLookup`    — resolves target kind/tier/external_id
//   - `SessionRevoker`         — bridges to the Clerk session-revoker
//
// The approval markApproved UPDATE includes
// `WHERE executed_at IS NULL AND initiated_by <> :approved_by` — the
// orchestrator already gates self-approval, but a belt-and-braces SQL
// guard means a buggy caller bypassing the orchestrator still can't
// self-approve (defense-in-depth alongside the table's CHECK
// constraint, which only fires when `approved_by` is non-null).
//
// The principal lookup returns null when the principal exists but
// has a missing `external_id` for a human row — the orchestrator
// must not silently bypass the IdP revoke. A human without an
// external_id is malformed state; reconciliation (T024) will surface
// the drift.

import type {
  PrincipalKindLookup,
  PrincipalLookupResult,
  RevokeAllApprovalRepo,
  SessionRevoker,
  ClerkSessionRevoker,
} from "@spyglass/auth";
import { principals, revokeAllSessionsApprovals, type Db } from "@spyglass/db";
import { and, eq, isNull, ne } from "drizzle-orm";

export function createDrizzleRevokeAllApprovalRepo(db: Db): RevokeAllApprovalRepo {
  return {
    async insertApproval(input) {
      const rows = await db
        .insert(revokeAllSessionsApprovals)
        .values({
          target_principal_id: input.target_principal_id,
          initiated_by: input.initiated_by,
          reason_code: input.reason_code,
          notes: input.notes,
          initiated_at: input.initiated_at,
          expires_at: input.expires_at,
        })
        .returning({ approval_id: revokeAllSessionsApprovals.approval_id });
      const row = rows[0];
      if (!row) {
        throw new Error("revoke_all_sessions_approvals insert returned no rows");
      }
      return { approval_id: row.approval_id };
    },

    async findApproval(approval_id) {
      const rows = await db
        .select({
          approval_id: revokeAllSessionsApprovals.approval_id,
          target_principal_id: revokeAllSessionsApprovals.target_principal_id,
          initiated_by: revokeAllSessionsApprovals.initiated_by,
          initiated_at: revokeAllSessionsApprovals.initiated_at,
          expires_at: revokeAllSessionsApprovals.expires_at,
          executed_at: revokeAllSessionsApprovals.executed_at,
        })
        .from(revokeAllSessionsApprovals)
        .where(eq(revokeAllSessionsApprovals.approval_id, approval_id))
        .limit(1);
      return rows[0] ?? null;
    },

    async markApproved(input) {
      // Three SQL guards, each load-bearing for a distinct invariant:
      //   - `isNull(executed_at)`: idempotency — concurrent approvers
      //     race and the loser writes zero rows.
      //   - `isNull(approved_by)`: once approved, the row is immutable.
      //     The CHECK constraint only enforces "approved_by <> initiated_by"
      //     when approved_by is set; this guard ensures we never re-stamp
      //     a row that already carries an approver, even if a future code
      //     path tries to separate the "approved" and "executed" steps.
      //   - `ne(initiated_by, approved_by)`: belt-and-braces self-approval
      //     defense alongside the orchestrator's authorization check and
      //     the table's CHECK constraint. Defense-in-depth survives a
      //     buggy caller bypassing the orchestrator.
      const rows = await db
        .update(revokeAllSessionsApprovals)
        .set({
          approved_by: input.approved_by,
          approved_at: input.approved_at,
          executed_at: input.executed_at,
        })
        .where(
          and(
            eq(revokeAllSessionsApprovals.approval_id, input.approval_id),
            isNull(revokeAllSessionsApprovals.executed_at),
            isNull(revokeAllSessionsApprovals.approved_by),
            ne(revokeAllSessionsApprovals.initiated_by, input.approved_by),
          ),
        )
        .returning({ approval_id: revokeAllSessionsApprovals.approval_id });
      return rows.length > 0;
    },
  };
}

export function createDrizzlePrincipalKindLookup(db: Db): PrincipalKindLookup {
  return {
    async lookupTarget(principal_id): Promise<PrincipalLookupResult | null> {
      const rows = await db
        .select({
          kind: principals.kind,
          tier: principals.tier,
          external_id: principals.external_id,
        })
        .from(principals)
        .where(eq(principals.principal_id, principal_id))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      if (row.kind === "human") {
        // Schema CHECK guarantees external_id + tier are NOT NULL
        // for humans, but the column types are nullable so the type
        // narrowing has to be done at this boundary. A missing
        // external_id at runtime is malformed state — refuse the
        // lookup so the orchestrator emits TargetNotFoundError
        // rather than silently bypassing the IdP revoke.
        if (row.external_id === null || row.tier === null) return null;
        return { kind: "human", tier: row.tier, external_id: row.external_id };
      }
      if (row.kind === "agent" || row.kind === "service") {
        return { kind: row.kind };
      }
      return null;
    },
  };
}

/**
 * Wrap the F02 T026 `ClerkSessionRevoker` (used by the webhook path,
 * `revokeAllSessionsForUser({external_id})`) to the orchestrator's
 * `SessionRevoker` surface (`revokeAllSessionsForExternalId({external_id, reason})`).
 *
 * Clerk's revoke API does not accept a structured reason on its
 * session-revoke call, so the `reason` is dropped at the IdP boundary
 * (it still lands in our own audit). A future Clerk SDK that supports
 * a reason field can read it from this wrapper without changing the
 * orchestrator contract.
 */
export function createSessionRevokerFromClerkRevoker(inner: ClerkSessionRevoker): SessionRevoker {
  return {
    async revokeAllSessionsForExternalId({ external_id, reason }) {
      await inner.revokeAllSessionsForUser({ external_id, reason });
    },
  };
}
