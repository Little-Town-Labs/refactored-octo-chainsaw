// F02 T057 — Drizzle-backed `AgentCredentialRepo` adapter for the
// issuance path (findByIdempotencyKey + insert).
//
// Sibling to `agent-credential-list-repo.ts` (T056) which does the
// read-side. Splitting them keeps each repo's surface area minimal
// and matches the existing principal-repo pattern.
//
// `insert` MUST throw `UniqueViolationError` (not the raw pg error)
// when the (run_id, side, contract_id, contract_version) idempotency
// index rejects the row — the orchestrator relies on this to map
// the race to `IssuanceConflictError`. We probe the pg driver's
// SQLSTATE 23505 ("unique_violation") to recognize the case.

import {
  UniqueViolationError,
  type AgentCredentialRepo,
  type AgentCredentialRow,
} from "@spyglass/auth";
import { agentCredentials, type Db } from "@spyglass/db";
import { and, eq } from "drizzle-orm";

const SQLSTATE_UNIQUE_VIOLATION = "23505";

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === SQLSTATE_UNIQUE_VIOLATION
  );
}

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

export function createDrizzleAgentCredentialRepo(db: Db): AgentCredentialRepo {
  return {
    async findByIdempotencyKey(input) {
      const rows = await db
        .select()
        .from(agentCredentials)
        .where(
          and(
            eq(agentCredentials.run_id, input.run_id),
            eq(agentCredentials.side, input.side),
            eq(agentCredentials.contract_id, input.contract_id),
            eq(agentCredentials.contract_version, input.contract_version),
          ),
        )
        .limit(1);
      const row = rows[0];
      return row ? rowFromSelect(row) : null;
    },

    async insert(row) {
      try {
        const inserted = await db
          .insert(agentCredentials)
          .values({
            credential_id: row.credential_id,
            principal_id: row.principal_id,
            run_id: row.run_id,
            side: row.side,
            contract_id: row.contract_id,
            contract_version: row.contract_version,
            ticket_id: row.ticket_id,
            scope_set: [...row.scope_set],
            kid: row.kid,
            expires_at: row.expires_at,
          })
          .returning();
        const stored = inserted[0];
        if (!stored) throw new Error("agent_credentials insert returned no rows");
        return rowFromSelect(stored);
      } catch (err) {
        if (isUniqueViolation(err)) throw new UniqueViolationError(err);
        throw err;
      }
    },
  };
}
