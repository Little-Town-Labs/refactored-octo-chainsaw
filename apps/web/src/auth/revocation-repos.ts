// F02 T058 — Drizzle-backed `RevokeRepo` and `RevocationListRepo`
// adapters. Together they back `revokeAgentCredential` (orchestrator
// from B4.4) for the operator revoke flow and the daily prune job.
//
// Operation order in the orchestrator: list-insert FIRST, then mark
// revoked on the credentials row. These repos are deliberately
// dumb — they don't enforce ordering; the orchestrator does.

import { type AgentCredentialRow, type RevocationListRepo, type RevokeRepo } from "@spyglass/auth";
import { agentCredentials, revocations, type Db } from "@spyglass/db";
import { and, eq, gt, inArray, isNull, lte } from "drizzle-orm";

function rowFromSelect(row: typeof agentCredentials.$inferSelect): AgentCredentialRow {
  const scope_set = Array.isArray(row.scope_set)
    ? row.scope_set.filter((v): v is string => typeof v === "string")
    : [];
  return {
    credential_id: row.credential_id,
    principal_id: row.principal_id,
    run_id: row.run_id,
    side: row.side as "seeker" | "employer",
    contract_id: row.contract_id,
    contract_version: row.contract_version,
    scope_set,
    kid: row.kid,
    expires_at: row.expires_at,
    revoked_at: row.revoked_at,
  };
}

export function createDrizzleRevokeRepo(db: Db): RevokeRepo {
  return {
    async findActiveByPrincipal(principalId) {
      // Active = not revoked AND not yet expired. The orchestrator
      // re-checks before issuing the revoke writes, but trimming
      // here keeps the transaction surface small.
      const rows = await db
        .select()
        .from(agentCredentials)
        .where(
          and(
            eq(agentCredentials.principal_id, principalId),
            isNull(agentCredentials.revoked_at),
            gt(agentCredentials.expires_at, new Date()),
          ),
        );
      return rows.map(rowFromSelect);
    },

    async markRevoked(input) {
      await db
        .update(agentCredentials)
        .set({
          revoked_at: input.revoked_at,
          revoked_by: input.revoked_by,
          revocation_reason: input.reason,
        })
        .where(
          and(
            eq(agentCredentials.credential_id, input.credential_id),
            isNull(agentCredentials.revoked_at),
          ),
        );
    },
  };
}

export function createDrizzleRevocationListRepo(db: Db): RevocationListRepo {
  return {
    async insert(entry) {
      // Idempotent on credential_id. The orchestrator never asks
      // us to insert twice for the same credential, but the verifier
      // cache refresh path can replay so we accept the no-op write.
      await db
        .insert(revocations)
        .values({
          credential_id: entry.credential_id,
          kind: entry.kind,
          expires_at: entry.expires_at,
          revoked_at: entry.revoked_at,
        })
        .onConflictDoNothing({ target: revocations.credential_id });
    },

    async list(filter) {
      const predicates = [];
      if (filter.since !== undefined) predicates.push(gt(revocations.revoked_at, filter.since));
      if (filter.kinds !== undefined) predicates.push(inArray(revocations.kind, [...filter.kinds]));
      const rows = await db
        .select()
        .from(revocations)
        .where(predicates.length > 0 ? and(...predicates) : undefined);
      return rows.map((r) => ({
        credential_id: r.credential_id,
        kind: r.kind as "agent" | "service",
        expires_at: r.expires_at,
        revoked_at: r.revoked_at,
      }));
    },

    async pruneExpired(cutoff) {
      const rows = await db
        .delete(revocations)
        .where(lte(revocations.expires_at, cutoff))
        .returning({ credential_id: revocations.credential_id });
      return rows.length;
    },
  };
}
