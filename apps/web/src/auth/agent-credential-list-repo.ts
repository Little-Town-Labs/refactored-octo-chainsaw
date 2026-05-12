// F02 T056 — Drizzle-backed `AgentCredentialListRepo` adapter.
//
// Production wiring of `@spyglass/auth#AgentCredentialListRepo`,
// consumed by the operator console (`/operator/console/credentials`)
// via `listAgentCredentialsForOperator`. The pure orchestrator owns
// authorization, cursor encoding, and the limit+1 trick — this layer
// is a thin SQL adapter.
//
// Ordering is `(issued_at DESC, credential_id DESC)`. The cursor
// predicate is the keyset form `(issued_at, credential_id) <
// (cursor_iat, cursor_cid)` which matches the orchestrator's
// strict-less-than contract and is index-friendly when an
// `(issued_at DESC, credential_id DESC)` index is added in v1.
//
// `scope_set` is stored as `jsonb` (NOT NULL, validated array on
// insert by a CHECK constraint). We coerce `unknown` → `string[]`
// at the adapter boundary and treat anything else as the empty
// array, since downstream consumers (the view) don't crash on `[]`.

import type {
  AgentCredentialListFilter,
  AgentCredentialListRepo,
  AgentCredentialListRow,
} from "@spyglass/auth";
import { agentCredentials, type Db } from "@spyglass/db";
import { and, desc, eq, gt, isNotNull, isNull, lt, or } from "drizzle-orm";

function coerceScopeSet(value: unknown): ReadonlyArray<string> {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string");
  }
  return [];
}

export function createDrizzleAgentCredentialListRepo(db: Db): AgentCredentialListRepo {
  return {
    async list(filter: AgentCredentialListFilter): Promise<ReadonlyArray<AgentCredentialListRow>> {
      const predicates = [];

      if (filter.status === "active") {
        predicates.push(isNull(agentCredentials.revoked_at));
        predicates.push(gt(agentCredentials.expires_at, filter.now));
      } else if (filter.status === "revoked") {
        predicates.push(isNotNull(agentCredentials.revoked_at));
      }

      if (filter.principal_id !== undefined) {
        predicates.push(eq(agentCredentials.principal_id, filter.principal_id));
      }

      if (filter.cursor_issued_at && filter.cursor_credential_id) {
        // Keyset pagination: strictly older than the cursor in the
        // composite (issued_at, credential_id) order. The OR shape is
        // the canonical "tuple <" encoding and is sargable in pg.
        predicates.push(
          or(
            lt(agentCredentials.issued_at, filter.cursor_issued_at),
            and(
              eq(agentCredentials.issued_at, filter.cursor_issued_at),
              lt(agentCredentials.credential_id, filter.cursor_credential_id),
            ),
          )!,
        );
      }

      const rows = await db
        .select({
          credential_id: agentCredentials.credential_id,
          principal_id: agentCredentials.principal_id,
          run_id: agentCredentials.run_id,
          side: agentCredentials.side,
          contract_id: agentCredentials.contract_id,
          contract_version: agentCredentials.contract_version,
          scope_set: agentCredentials.scope_set,
          issued_at: agentCredentials.issued_at,
          expires_at: agentCredentials.expires_at,
          revoked_at: agentCredentials.revoked_at,
          revocation_reason: agentCredentials.revocation_reason,
        })
        .from(agentCredentials)
        .where(predicates.length > 0 ? and(...predicates) : undefined)
        .orderBy(desc(agentCredentials.issued_at), desc(agentCredentials.credential_id))
        .limit(filter.limit);

      return rows.map((r) => ({
        ...r,
        side: r.side as "seeker" | "employer",
        scope_set: coerceScopeSet(r.scope_set),
      }));
    },
  };
}
