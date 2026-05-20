import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";

import type { AuditLogEventRow } from "@spyglass/db";
import type {
  CanonicalAuditWriterStore,
  CanonicalAuditWriterTx,
  InsertCanonicalAuditEventRow,
} from "@spyglass/audit-log";

import {
  CONTRACT_DEPRECATE_SCOPE,
  CONTRACT_PUBLISH_SCOPE,
  CONTRACT_READ_SCOPE,
  ContractScopeRequiredError,
  ContractVersionMutationError,
  deprecateContractVersion,
  publishReviewedContractVersion,
  readContractEvents,
  readContractVersions,
  resolveContractForDispatch,
  type AgentContractEvent,
  type AgentContractEventQuery,
  type AgentContractRepository,
  type AgentContractVersion,
  type AgentContractVersionQuery,
  type ContractRef,
  type NewAgentContractEvent,
  type NewAgentContractVersion,
  type ScopedPrincipal,
} from "../src/index.js";

const REPO_ROOT = resolve(import.meta.dirname, "../../..");
const OUT = ".specify/specs/007-agent-contract-registry/quickstart-run-2026-05-20.md";
const OPERATOR_ID = "11111111-1111-4111-8111-111111111111";
const REVIEWER_ID = "22222222-2222-4222-8222-222222222222";

interface ScenarioResult {
  readonly name: string;
  readonly evidence: readonly string[];
}

async function main(): Promise<void> {
  const repository = new MemoryAgentContractRepository();
  const auditStore = new MemoryCanonicalAuditStore();
  const scenarios: ScenarioResult[] = [];

  scenarios.push(await scenarioPublishAndResolve(repository, auditStore));
  scenarios.push(await scenarioRejectMutation(repository, auditStore));
  scenarios.push(await scenarioDependencyDenials(repository));
  scenarios.push(await scenarioRuntimeClamps(repository));
  scenarios.push(await scenarioScopedReviewReads(repository));
  scenarios.push(await scenarioDeprecate(repository, auditStore));

  writeReport(scenarios, auditStore.rows.length);
}

async function scenarioPublishAndResolve(
  repository: MemoryAgentContractRepository,
  auditStore: MemoryCanonicalAuditStore,
): Promise<ScenarioResult> {
  const published = await publishReviewedContractVersion(repository, auditStore, {
    ...contractMaterial(),
    operator: operator([CONTRACT_PUBLISH_SCOPE]),
    reviewerPrincipalId: REVIEWER_ID,
    reasonCode: "initial_launch",
    correlationId: "corr-publish",
    publishedAt: new Date("2026-05-20T12:00:00.000Z"),
  });
  const resolution = await resolveContractForDispatch(repository, {
    contract_id: "seeker.standard",
    version: "1.0.0",
  });
  assert(resolution.decision === "allow", "published contract should resolve for dispatch");
  assert(
    resolution.reason_code === "contract_resolved",
    "resolution reason should be contract_resolved",
  );

  return {
    name: "Scenario 1 - Publish And Resolve A Contract",
    evidence: [
      `contract=${published.contract.contract_id}@${published.contract.version}`,
      `status=${published.contract.status}`,
      `event=${published.event.event_type}:${published.event.reason_code}`,
      `audit_event_id=${published.event.audit_event_id}`,
      `resolution=${resolution.decision}:${resolution.reason_code}`,
    ],
  };
}

async function scenarioRejectMutation(
  repository: MemoryAgentContractRepository,
  auditStore: MemoryCanonicalAuditStore,
): Promise<ScenarioResult> {
  let rejected = false;
  try {
    await publishReviewedContractVersion(repository, auditStore, {
      ...contractMaterial(),
      model_ref: { provider: "openai", model_id: "gpt-5.5", version: "2026-05-01" },
      operator: operator([CONTRACT_PUBLISH_SCOPE]),
      reviewerPrincipalId: REVIEWER_ID,
      reasonCode: "model_update",
      correlationId: "corr-mutation",
    });
  } catch (error) {
    rejected = error instanceof ContractVersionMutationError;
  }
  const original = await repository.getContractVersion({
    contract_id: "seeker.standard",
    version: "1.0.0",
  });
  assert(rejected, "different material for existing ref should be rejected");
  assert(
    original?.model_ref.model_id === "gpt-5.4-mini",
    "original contract should remain unchanged",
  );

  return {
    name: "Scenario 2 - Reject Immutable Version Mutation",
    evidence: [
      "rejected=ContractVersionMutationError",
      `stored_model=${original?.model_ref.model_id}`,
      `stored_hash=${original?.content_hash}`,
    ],
  };
}

async function scenarioDependencyDenials(
  repository: MemoryAgentContractRepository,
): Promise<ScenarioResult> {
  const prompt = await resolveContractForDispatch(
    repository,
    { contract_id: "seeker.standard", version: "1.0.0" },
    {
      dependencyChecker: {
        checkPromptTemplate: async () => ({ kind: "prompt_template", status: "unavailable" }),
      },
    },
  );
  const rubricBias = await resolveContractForDispatch(
    repository,
    { contract_id: "seeker.standard", version: "1.0.0" },
    {
      dependencyChecker: {
        checkRubric: async () => ({ kind: "rubric", status: "missing_bias_test" }),
      },
    },
  );
  const tool = await resolveContractForDispatch(
    repository,
    { contract_id: "seeker.standard", version: "1.0.0" },
    {
      dependencyChecker: {
        checkToolSurface: async () => ({ kind: "tool_surface", status: "unavailable" }),
      },
    },
  );
  const model = await resolveContractForDispatch(
    repository,
    { contract_id: "seeker.standard", version: "1.0.0" },
    {
      dependencyChecker: {
        checkModel: async () => ({ kind: "model", status: "unavailable" }),
      },
    },
  );
  assert(prompt.reason_code === "prompt_template_unresolvable", "prompt dependency should deny");
  assert(rubricBias.reason_code === "rubric_missing_bias_test", "missing bias test should deny");
  assert(tool.reason_code === "tool_version_unavailable", "tool surface should deny");
  assert(model.reason_code === "model_unavailable", "model dependency should deny");

  return {
    name: "Scenario 3 - Fail Closed On Missing Dependencies",
    evidence: [
      `prompt=${prompt.decision}:${prompt.reason_code}`,
      `rubric=${rubricBias.decision}:${rubricBias.reason_code}`,
      `tool=${tool.decision}:${tool.reason_code}`,
      `model=${model.decision}:${model.reason_code}`,
    ],
  };
}

async function scenarioRuntimeClamps(
  repository: MemoryAgentContractRepository,
): Promise<ScenarioResult> {
  const resolution = await resolveContractForDispatch(
    repository,
    { contract_id: "seeker.standard", version: "1.0.0" },
    {
      runtimeCeilings: {
        max_rounds: 3,
        timeout_ms: 10000,
        max_tool_calls_per_turn: 2,
      },
    },
  );
  assert(resolution.decision === "allow", "runtime clamp should not deny valid dependency set");
  assert(resolution.runtime_clamps.length === 3, "all over-ceiling runtime fields should clamp");

  return {
    name: "Scenario 4 - Runtime Ceiling Clamp",
    evidence: [
      `effective=${JSON.stringify(resolution.effective_runtime_settings)}`,
      `clamps=${resolution.runtime_clamps
        .map((clamp) => `${clamp.field}:${clamp.requested}->${clamp.effective}`)
        .join(",")}`,
      `stored_max_rounds=${resolution.contract?.runtime_settings.max_rounds}`,
    ],
  };
}

async function scenarioScopedReviewReads(
  repository: MemoryAgentContractRepository,
): Promise<ScenarioResult> {
  let denied = false;
  try {
    await readContractVersions(repository, {
      principal: operator([]),
      contractId: "seeker.standard",
    });
  } catch (error) {
    denied = error instanceof ContractScopeRequiredError;
  }
  const versions = await readContractVersions(repository, {
    principal: operator([CONTRACT_READ_SCOPE]),
    contractId: "seeker.standard",
    side: "seeker",
    status: "published",
    limit: 10,
  });
  const events = await readContractEvents(repository, {
    principal: operator([CONTRACT_READ_SCOPE]),
    principalId: OPERATOR_ID,
    limit: 10,
  });
  assert(denied, "unscoped contract review should deny");
  assert(versions.length === 1, "scoped version review should return published contract");
  assert(events.length >= 1, "scoped event review should return publication event");

  return {
    name: "Scenario 5 - Scoped Review Reads",
    evidence: [
      "unscoped_read_denied=ContractScopeRequiredError",
      `version_rows=${versions.length}`,
      `event_rows=${events.length}`,
      `version_fields=${Object.keys(versions[0] ?? {}).join(",")}`,
    ],
  };
}

async function scenarioDeprecate(
  repository: MemoryAgentContractRepository,
  auditStore: MemoryCanonicalAuditStore,
): Promise<ScenarioResult> {
  const deprecated = await deprecateContractVersion(repository, auditStore, {
    contractId: "seeker.standard",
    version: "1.0.0",
    operator: operator([CONTRACT_DEPRECATE_SCOPE]),
    reviewerPrincipalId: REVIEWER_ID,
    reasonCode: "compliance_deprecation",
    correlationId: "corr-deprecate",
    deprecatedAfter: new Date("2026-05-21T00:00:00.000Z"),
  });
  const resolution = await resolveContractForDispatch(
    repository,
    { contract_id: "seeker.standard", version: "1.0.0" },
    { now: new Date("2026-05-22T00:00:00.000Z") },
  );
  assert(deprecated.contract.status === "deprecated", "contract should be deprecated");
  assert(resolution.reason_code === "contract_deprecated", "new dispatch should deny after cutoff");

  return {
    name: "Scenario 6 - Deprecate A Contract",
    evidence: [
      `status=${deprecated.contract.status}`,
      `deprecated_after=${deprecated.contract.deprecated_after?.toISOString()}`,
      `event=${deprecated.event.event_type}:${deprecated.event.reason_code}`,
      `audit_event_id=${deprecated.event.audit_event_id}`,
      `post_cutoff_resolution=${resolution.decision}:${resolution.reason_code}`,
    ],
  };
}

function writeReport(scenarios: readonly ScenarioResult[], auditCount: number): void {
  const path = resolve(REPO_ROOT, OUT);
  mkdirSync(dirname(path), { recursive: true });
  const rows = scenarios
    .map(
      (scenario) =>
        `| ${scenario.name} | ${scenario.evidence.map((item) => `\`${item}\``).join("<br>")} | PASS |`,
    )
    .join("\n");
  const body = `# F07a quickstart run

Generated: ${new Date().toISOString()}

| Scenario | Evidence | Result |
| --- | --- | --- |
${rows}

## Summary

- scenarios: ${scenarios.length}
- canonical_audit_events: ${auditCount}
- storage: memory-backed staged run; no Neon rows were mutated
- rollback: not required because no persistent database writes were performed

Command:

\`\`\`sh
pnpm --filter @spyglass/agent-contracts dev-run:f07a
\`\`\`
`;
  writeFileSync(path, body);
  console.log(body);
}

class MemoryAgentContractRepository implements AgentContractRepository {
  readonly versions = new Map<string, AgentContractVersion>();
  readonly events: AgentContractEvent[] = [];

  async getContractVersion(ref: ContractRef): Promise<AgentContractVersion | null> {
    return this.versions.get(key(ref)) ?? null;
  }

  async insertContractVersion(input: NewAgentContractVersion): Promise<AgentContractVersion> {
    const row: AgentContractVersion = {
      ...input,
      agent_contract_version_id: input.agent_contract_version_id ?? randomUUID(),
      created_at: input.created_at ?? new Date(),
    };
    this.versions.set(key(row), row);
    return row;
  }

  async updateContractDeprecatedAfter(input: {
    readonly contractVersionId: string;
    readonly deprecatedAfter: Date;
  }): Promise<AgentContractVersion> {
    for (const row of this.versions.values()) {
      if (row.agent_contract_version_id !== input.contractVersionId) continue;
      const updated = {
        ...row,
        status: "deprecated" as const,
        deprecated_after: input.deprecatedAfter,
      };
      this.versions.set(key(updated), updated);
      return updated;
    }
    throw new Error(`contract version ${input.contractVersionId} not found`);
  }

  async appendContractEvent(input: NewAgentContractEvent): Promise<AgentContractEvent> {
    const row: AgentContractEvent = {
      ...input,
      agent_contract_event_id: input.agent_contract_event_id ?? randomUUID(),
      created_at: input.created_at ?? new Date(),
    };
    this.events.push(row);
    return row;
  }

  async listContractVersions(
    query: AgentContractVersionQuery,
  ): Promise<readonly AgentContractVersion[]> {
    return [...this.versions.values()]
      .filter((row) => !query.contractId || row.contract_id === query.contractId)
      .filter((row) => !query.side || row.side === query.side)
      .filter((row) => !query.status || row.status === query.status)
      .filter((row) => !query.from || row.created_at >= query.from)
      .filter((row) => !query.until || row.created_at <= query.until)
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
      .slice(0, query.limit);
  }

  async listContractEvents(query: AgentContractEventQuery): Promise<readonly AgentContractEvent[]> {
    return this.events
      .filter(
        (row) =>
          !query.contractVersionId || row.agent_contract_version_id === query.contractVersionId,
      )
      .filter((row) => !query.principalId || row.principal_id === query.principalId)
      .filter((row) => !query.from || row.created_at >= query.from)
      .filter((row) => !query.until || row.created_at <= query.until)
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
      .slice(0, query.limit);
  }
}

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

function contractMaterial() {
  return {
    contract_id: "seeker.standard",
    version: "1.0.0",
    side: "seeker" as const,
    prompt_template_ref: { id: "seeker-standard", version: "1.0.0" },
    rubric_ref: { id: "seeker-fit", version: "1.0.0" },
    tool_surface_ref: { id: "seeker-tools", version: "1.0.0" },
    model_ref: { provider: "openai", model_id: "gpt-5.4-mini", version: "2026-05-01" },
    runtime_settings: { max_rounds: 4, timeout_ms: 30000, max_tool_calls_per_turn: 4 },
    extension_fields: { rollout: "phase-0" },
    description: "Initial seeker-side launch contract.",
  };
}

function operator(scopes: readonly string[]): ScopedPrincipal {
  return {
    principal_id: OPERATOR_ID,
    principal_kind: "human",
    scopes,
  };
}

function key(ref: ContractRef): string {
  return `${ref.contract_id}@${ref.version}`;
}

function toAuditLogEventRow(row: InsertCanonicalAuditEventRow): AuditLogEventRow {
  return {
    audit_event_id: row.audit_event_id ?? randomUUID(),
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

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

await main();
