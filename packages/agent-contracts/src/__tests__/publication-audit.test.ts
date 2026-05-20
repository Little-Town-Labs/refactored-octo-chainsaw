import type { AuditLogEventRow } from "@spyglass/db";
import type {
  CanonicalAuditWriterStore,
  CanonicalAuditWriterTx,
  InsertCanonicalAuditEventRow,
} from "@spyglass/audit-log";

import { deprecateContractVersion, publishReviewedContractVersion } from "../publish.js";
import type { ContractDependencyValidationError } from "../publish.js";
import {
  CONTRACT_DEPRECATE_SCOPE,
  CONTRACT_PUBLISH_SCOPE,
  ContractScopeRequiredError,
} from "../scopes.js";
import { contractMaterial, MemoryAgentContractRepository } from "./fixtures.js";

const OPERATOR_ID = "11111111-1111-4111-8111-111111111111";
const REVIEWER_ID = "22222222-2222-4222-8222-222222222222";

describe("contract publication audit linkage", () => {
  test("rejects publish principals without contract.publish", async () => {
    const repository = new MemoryAgentContractRepository();

    await expect(
      publishReviewedContractVersion(repository, new MemoryCanonicalAuditStore(), {
        ...contractMaterial(),
        operator: { principal_id: OPERATOR_ID, principal_kind: "human", scopes: [] },
        reviewerPrincipalId: REVIEWER_ID,
        reasonCode: "initial_launch",
        correlationId: "corr-001",
      }),
    ).rejects.toBeInstanceOf(ContractScopeRequiredError);
  });

  test("publishes a reviewed contract and links canonical audit evidence", async () => {
    const repository = new MemoryAgentContractRepository();
    const auditStore = new MemoryCanonicalAuditStore();

    const result = await publishReviewedContractVersion(repository, auditStore, {
      ...contractMaterial(),
      operator: {
        principal_id: OPERATOR_ID,
        principal_kind: "human",
        scopes: [CONTRACT_PUBLISH_SCOPE],
      },
      reviewerPrincipalId: REVIEWER_ID,
      reasonCode: "initial_launch",
      correlationId: "corr-002",
      publishedAt: new Date("2026-05-20T12:00:00.000Z"),
    });

    expect(result.contract).toMatchObject({
      contract_id: "seeker.standard",
      version: "1.0.0",
      status: "published",
      author_principal_id: OPERATOR_ID,
      reviewer_principal_id: REVIEWER_ID,
    });
    expect(result.event).toMatchObject({
      agent_contract_version_id: result.contract.agent_contract_version_id,
      event_type: "published",
      reason_code: "initial_launch",
      principal_id: OPERATOR_ID,
      reviewer_principal_id: REVIEWER_ID,
      audit_event_id: auditStore.rows[0]?.audit_event_id,
    });
    expect(auditStore.rows[0]).toMatchObject({
      source_table: "agent_contract_events",
      source_event_id: result.event.agent_contract_event_id,
      event_name: "agent_contract.published",
      principal_id: OPERATOR_ID,
      role_or_scope: CONTRACT_PUBLISH_SCOPE,
      correlation_id: "corr-002",
      chain_namespace: "agent-contract-registry",
    });
  });

  test("rejects publish when dependency validation fails", async () => {
    const repository = new MemoryAgentContractRepository();

    await expect(
      publishReviewedContractVersion(repository, new MemoryCanonicalAuditStore(), {
        ...contractMaterial(),
        operator: {
          principal_id: OPERATOR_ID,
          principal_kind: "human",
          scopes: [CONTRACT_PUBLISH_SCOPE],
        },
        reviewerPrincipalId: REVIEWER_ID,
        reasonCode: "initial_launch",
        correlationId: "corr-dependency",
        dependencyChecker: {
          checkRubric: async () => ({ kind: "rubric", status: "missing_bias_test" }),
        },
      }),
    ).rejects.toMatchObject({
      name: "ContractDependencyValidationError",
      reasonCode: "rubric_missing_bias_test",
    } satisfies Partial<ContractDependencyValidationError>);
    expect(repository.versions.size).toBe(0);
  });

  test("rejects deprecation principals without contract.deprecate", async () => {
    const repository = new MemoryAgentContractRepository();
    await publishReviewedContractVersion(repository, new MemoryCanonicalAuditStore(), {
      ...contractMaterial(),
      operator: {
        principal_id: OPERATOR_ID,
        principal_kind: "human",
        scopes: [CONTRACT_PUBLISH_SCOPE],
      },
      reviewerPrincipalId: REVIEWER_ID,
      reasonCode: "initial_launch",
      correlationId: "corr-003",
    });

    await expect(
      deprecateContractVersion(repository, new MemoryCanonicalAuditStore(), {
        contractId: "seeker.standard",
        version: "1.0.0",
        operator: { principal_id: OPERATOR_ID, principal_kind: "human", scopes: [] },
        reasonCode: "compliance_deprecation",
        correlationId: "corr-004",
        deprecatedAfter: new Date("2026-05-21T00:00:00.000Z"),
      }),
    ).rejects.toBeInstanceOf(ContractScopeRequiredError);
  });

  test("deprecates a contract and links canonical audit evidence", async () => {
    const repository = new MemoryAgentContractRepository();
    await publishReviewedContractVersion(repository, new MemoryCanonicalAuditStore(), {
      ...contractMaterial(),
      operator: {
        principal_id: OPERATOR_ID,
        principal_kind: "human",
        scopes: [CONTRACT_PUBLISH_SCOPE],
      },
      reviewerPrincipalId: REVIEWER_ID,
      reasonCode: "initial_launch",
      correlationId: "corr-005",
    });
    const auditStore = new MemoryCanonicalAuditStore();

    const result = await deprecateContractVersion(repository, auditStore, {
      contractId: "seeker.standard",
      version: "1.0.0",
      operator: {
        principal_id: OPERATOR_ID,
        principal_kind: "human",
        scopes: [CONTRACT_DEPRECATE_SCOPE],
      },
      reviewerPrincipalId: REVIEWER_ID,
      reasonCode: "compliance_deprecation",
      correlationId: "corr-006",
      deprecatedAfter: new Date("2026-05-21T00:00:00.000Z"),
    });

    expect(result.contract).toMatchObject({
      status: "deprecated",
      deprecated_after: new Date("2026-05-21T00:00:00.000Z"),
    });
    expect(result.event).toMatchObject({
      event_type: "deprecated",
      reason_code: "compliance_deprecation",
      principal_id: OPERATOR_ID,
      reviewer_principal_id: REVIEWER_ID,
      audit_event_id: auditStore.rows[0]?.audit_event_id,
    });
    expect(auditStore.rows[0]).toMatchObject({
      source_table: "agent_contract_events",
      source_event_id: result.event.agent_contract_event_id,
      event_name: "agent_contract.deprecated",
      principal_id: OPERATOR_ID,
      role_or_scope: CONTRACT_DEPRECATE_SCOPE,
      correlation_id: "corr-006",
      chain_namespace: "agent-contract-registry",
    });
  });
});

class MemoryCanonicalAuditStore implements CanonicalAuditWriterStore {
  readonly rows: AuditLogEventRow[] = [];

  async transaction<T>(fn: (tx: CanonicalAuditWriterTx) => Promise<T>): Promise<T> {
    return fn({
      lockChainNamespace: async () => undefined,
      getLastEventHash: async (chainNamespace) =>
        this.rows.filter((row) => row.chain_namespace === chainNamespace).at(-1)?.event_hash ??
        null,
      insertEvent: async (row) => {
        const inserted = toAuditLogEventRow(row);
        this.rows.push(inserted);
        return inserted;
      },
    });
  }
}

function toAuditLogEventRow(row: InsertCanonicalAuditEventRow): AuditLogEventRow {
  return {
    audit_event_id: row.audit_event_id ?? "44444444-4444-4444-8444-444444444444",
    source_table: row.source_table,
    source_event_id: row.source_event_id,
    event_name: row.event_name,
    principal_id: row.principal_id,
    principal_kind: row.principal_kind,
    role_or_scope: row.role_or_scope,
    correlation_id: row.correlation_id,
    payload: row.payload,
    payload_hash: row.payload_hash,
    previous_hash: row.previous_hash,
    event_hash: row.event_hash,
    chain_namespace: row.chain_namespace,
    hash_algorithm: row.hash_algorithm,
    canonicalization_version: row.canonicalization_version,
    created_at: row.created_at,
    tombstoned_at: null,
  };
}
