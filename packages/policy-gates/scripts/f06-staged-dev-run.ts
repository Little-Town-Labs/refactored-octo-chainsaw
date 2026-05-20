import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";

import type {
  AuditLogEventRow,
  JurisdictionPolicyStatus,
  NewJurisdictionPolicyRevision,
} from "@spyglass/db";
import type {
  CanonicalAuditWriterStore,
  CanonicalAuditWriterTx,
  InsertCanonicalAuditEventRow,
} from "@spyglass/audit-log";

import {
  appendGateDecisionWithAudit,
  changeJurisdictionPosture,
  evaluateJurisdictionGate,
  POLICY_KILL_SWITCH_MANAGE_SCOPE,
  POLICY_READ_SCOPE,
  PolicyScopeRequiredError,
  projectFailureArtifact,
  readActivePosture,
  readDecisionHistory,
  type GateDecisionHistoryQuery,
  type GateDecisionInsert,
  type JurisdictionPolicyGateRepository,
  type ScopedPrincipal,
} from "../src/index.js";
import type {
  GateDecisionRecord,
  JurisdictionPolicyRevision,
  KillSwitchEventRecord,
  NewKillSwitchEventRecord,
} from "../src/types.js";

const REPO_ROOT = resolve(import.meta.dirname, "../../..");
const OUT = ".specify/specs/006-jurisdiction-policy-gates/quickstart-run-2026-05-19.md";
const OPERATOR_ID = "11111111-1111-4111-8111-111111111111";

interface ScenarioResult {
  readonly name: string;
  readonly evidence: readonly string[];
}

async function main(): Promise<void> {
  const repository = new MemoryPolicyGateRepository([
    policy("US-MO", "allowed", "launch-v1"),
    policy("US-KS", "allowed", "launch-v1"),
    policy("US-NY", "unsupported", "launch-v1"),
    policy("US-IL", "disabled", "launch-v1"),
  ]);
  const auditStore = new MemoryCanonicalAuditStore();
  const scenarios: ScenarioResult[] = [];

  scenarios.push(await scenarioAllowSupported(repository, auditStore));
  scenarios.push(await scenarioFailSafe(repository, auditStore));
  scenarios.push(await scenarioDenyUnsupportedDisabled(repository, auditStore));
  scenarios.push(await scenarioKillSwitch(repository, auditStore));
  scenarios.push(await scenarioUnauthorizedKillSwitch(repository, auditStore));
  scenarios.push(await scenarioReviewReads(repository));

  writeReport(scenarios, auditStore.rows.length);
}

async function scenarioAllowSupported(
  repository: MemoryPolicyGateRepository,
  auditStore: MemoryCanonicalAuditStore,
): Promise<ScenarioResult> {
  const decision = evaluateJurisdictionGate(
    gateInput("match-supported", ["US-MO", "US-KS"]),
    await repository.getActivePolicies(["US-MO", "US-KS"]),
  );
  assert(decision.decision === "allow", "supported jurisdiction decision should allow");
  assert(
    decision.reason_code === "all_allowed",
    "supported jurisdiction reason should be all_allowed",
  );
  const persisted = await appendGateDecisionWithAudit(repository, auditStore, {
    decision,
    audit: { principalKind: "human", roleOrScope: "policy.decide" },
  });

  return {
    name: "Scenario 1 - Allow Supported Jurisdictions",
    evidence: [
      `decision=${persisted.decision}`,
      `reason_code=${persisted.reason_code}`,
      `audit_event_id=${persisted.audit_event_id}`,
    ],
  };
}

async function scenarioFailSafe(
  repository: MemoryPolicyGateRepository,
  auditStore: MemoryCanonicalAuditStore,
): Promise<ScenarioResult> {
  const missing = await persistDecision(
    repository,
    auditStore,
    evaluateJurisdictionGate(gateInput("match-missing", []), []),
  );
  const unknown = await persistDecision(
    repository,
    auditStore,
    evaluateJurisdictionGate(gateInput("match-unknown", ["US-XX"]), []),
  );
  assert(missing.reason_code === "missing_jurisdiction", "missing jurisdiction should deny");
  assert(unknown.reason_code === "unknown_jurisdiction", "unknown jurisdiction should deny");

  return {
    name: "Scenario 2 - Fail Safe On Missing Or Unknown Jurisdiction",
    evidence: [
      `missing=${missing.decision}:${missing.reason_code}`,
      `unknown=${unknown.decision}:${unknown.reason_code}`,
      "both paths persisted structured decision and audit evidence",
    ],
  };
}

async function scenarioDenyUnsupportedDisabled(
  repository: MemoryPolicyGateRepository,
  auditStore: MemoryCanonicalAuditStore,
): Promise<ScenarioResult> {
  const unsupported = await persistDecision(
    repository,
    auditStore,
    evaluateJurisdictionGate(
      gateInput("match-unsupported", ["US-NY"]),
      await repository.getActivePolicies(["US-NY"]),
    ),
  );
  const disabled = await persistDecision(
    repository,
    auditStore,
    evaluateJurisdictionGate(
      gateInput("match-disabled", ["US-IL"]),
      await repository.getActivePolicies(["US-IL"]),
    ),
  );
  assert(unsupported.reason_code === "unsupported_jurisdiction", "US-NY should be unsupported");
  assert(disabled.reason_code === "disabled_jurisdiction", "US-IL should be disabled");

  return {
    name: "Scenario 3 - Deny Unsupported Or Disabled Jurisdiction",
    evidence: [
      `unsupported_artifact=${projectFailureArtifact(unsupported).failure_artifact_id}`,
      `disabled_artifact=${projectFailureArtifact(disabled).failure_artifact_id}`,
    ],
  };
}

async function scenarioKillSwitch(
  repository: MemoryPolicyGateRepository,
  auditStore: MemoryCanonicalAuditStore,
): Promise<ScenarioResult> {
  const before = evaluateJurisdictionGate(
    gateInput("match-before-switch", ["US-MO"]),
    await repository.getActivePolicies(["US-MO"]),
  );
  const changed = await changeJurisdictionPosture(repository, auditStore, {
    jurisdictionCode: "US-MO",
    toStatus: "disabled",
    reasonCode: "incident_response",
    policyVersion: "launch-v2",
    operator: operator([POLICY_KILL_SWITCH_MANAGE_SCOPE]),
    correlationId: "corr-kill-switch",
    changedAt: new Date("2026-05-20T12:00:00.000Z"),
  });
  const after = evaluateJurisdictionGate(
    gateInput("match-after-switch", ["US-MO"]),
    await repository.getActivePolicies(["US-MO"]),
  );
  assert(before.decision === "allow", "US-MO should allow before switch");
  assert(after.reason_code === "disabled_jurisdiction", "US-MO should deny after switch");

  return {
    name: "Scenario 4 - Flip Kill Switch Without Deploy",
    evidence: [
      `before=${before.decision}:${before.reason_code}`,
      `after=${after.decision}:${after.reason_code}`,
      `kill_switch_event_id=${changed.event.kill_switch_event_id}`,
      `operator_principal_id=${changed.event.operator_principal_id}`,
      `audit_event_id=${changed.event.audit_event_id}`,
    ],
  };
}

async function scenarioUnauthorizedKillSwitch(
  repository: MemoryPolicyGateRepository,
  auditStore: MemoryCanonicalAuditStore,
): Promise<ScenarioResult> {
  const before = await repository.getActivePolicies(["US-KS"]);
  let denied = false;
  try {
    await changeJurisdictionPosture(repository, auditStore, {
      jurisdictionCode: "US-KS",
      toStatus: "disabled",
      reasonCode: "incident_response",
      policyVersion: "launch-v2",
      operator: operator([]),
      correlationId: "corr-denied-switch",
    });
  } catch (error) {
    denied = error instanceof PolicyScopeRequiredError;
  }
  const after = await repository.getActivePolicies(["US-KS"]);
  assert(denied, "unscoped kill switch should be denied");
  assert(before[0]?.status === after[0]?.status, "denied switch must not change posture");

  return {
    name: "Scenario 5 - Deny Unauthorized Kill-Switch Mutation",
    evidence: [
      "denied=PolicyScopeRequiredError",
      `posture_unchanged=${after[0]?.jurisdiction_code}:${after[0]?.status}`,
      "denial audit is deferred to authenticated request-surface integration",
    ],
  };
}

async function scenarioReviewReads(
  repository: MemoryPolicyGateRepository,
): Promise<ScenarioResult> {
  let denied = false;
  try {
    await readActivePosture(repository, {
      principal: operator([]),
      jurisdictionCodes: ["US-MO"],
    });
  } catch (error) {
    denied = error instanceof PolicyScopeRequiredError;
  }
  const posture = await readActivePosture(repository, {
    principal: operator([POLICY_READ_SCOPE]),
    jurisdictionCodes: ["US-MO", "US-NY"],
  });
  const history = await readDecisionHistory(repository, {
    principal: operator([POLICY_READ_SCOPE]),
    jurisdictionCodes: ["US-MO"],
    from: new Date("2026-05-20T00:00:00.000Z"),
    until: new Date("2026-05-21T00:00:00.000Z"),
    limit: 5,
  });
  assert(denied, "unscoped posture read should be denied");
  assert(posture.length === 2, "scoped posture read should return active rows");
  assert(history.length >= 1, "scoped history read should return bounded rows");

  return {
    name: "Scenario 6 - Scoped Review Reads",
    evidence: [
      "unscoped_read_denied=PolicyScopeRequiredError",
      `active_posture_rows=${posture.length}`,
      `history_rows=${history.length}`,
      `history_fields=${Object.keys(history[0] ?? {}).join(",")}`,
    ],
  };
}

async function persistDecision(
  repository: MemoryPolicyGateRepository,
  auditStore: MemoryCanonicalAuditStore,
  decision: Parameters<typeof appendGateDecisionWithAudit>[2]["decision"],
): Promise<GateDecisionRecord> {
  return appendGateDecisionWithAudit(repository, auditStore, {
    decision,
    audit: { principalKind: "human", roleOrScope: "policy.decide" },
  });
}

class MemoryPolicyGateRepository implements JurisdictionPolicyGateRepository {
  readonly policies: JurisdictionPolicyRevision[];
  readonly decisions: GateDecisionRecord[] = [];
  readonly killSwitchEvents: KillSwitchEventRecord[] = [];

  constructor(policies: readonly JurisdictionPolicyRevision[]) {
    this.policies = [...policies];
  }

  async getActivePolicies(
    codes: readonly string[],
  ): Promise<readonly JurisdictionPolicyRevision[]> {
    const codeSet = new Set(codes);
    return this.policies.filter(
      (policy) => codeSet.has(policy.jurisdiction_code) && policy.effective_until === null,
    );
  }

  async listGateDecisions(query: GateDecisionHistoryQuery): Promise<readonly GateDecisionRecord[]> {
    return this.decisions
      .filter((decision) => !query.subjectKind || decision.subject_kind === query.subjectKind)
      .filter((decision) => !query.subjectId || decision.subject_id === query.subjectId)
      .filter((decision) => !query.from || decision.created_at >= query.from)
      .filter((decision) => !query.until || decision.created_at <= query.until)
      .filter(
        (decision) =>
          !query.jurisdictionCodes ||
          query.jurisdictionCodes.every((code) => decision.jurisdiction_codes.includes(code)),
      )
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
      .slice(0, query.limit);
  }

  async insertGateDecision(input: GateDecisionInsert): Promise<GateDecisionRecord> {
    const row: GateDecisionRecord = {
      gate_decision_id: input.gate_decision_id ?? randomUUID(),
      subject_kind: input.subject_kind,
      subject_id: input.subject_id,
      decision: input.decision,
      reason_code: input.reason_code,
      jurisdiction_codes: input.jurisdiction_codes,
      policy_version: input.policy_version,
      policy_revision_ids: input.policy_revision_ids,
      correlation_id: input.correlation_id,
      principal_id: input.principal_id,
      audit_event_id: input.audit_event_id,
      created_at: input.created_at ?? new Date(),
    };
    this.decisions.push(row);
    return row;
  }

  async closeActivePolicy(jurisdictionCode: string, effectiveUntil: Date): Promise<void> {
    for (const policy of [...this.policies]) {
      if (policy.jurisdiction_code === jurisdictionCode && policy.effective_until === null) {
        this.policies[this.policies.indexOf(policy)] = {
          ...policy,
          effective_until: effectiveUntil,
        };
      }
    }
  }

  async insertPolicyRevision(
    input: NewJurisdictionPolicyRevision,
  ): Promise<JurisdictionPolicyRevision> {
    const row: JurisdictionPolicyRevision = {
      jurisdiction_policy_id: input.jurisdiction_policy_id ?? randomUUID(),
      jurisdiction_code: input.jurisdiction_code,
      status: input.status,
      policy_version: input.policy_version,
      effective_from: input.effective_from,
      effective_until: input.effective_until,
      operational_reason: input.operational_reason,
      reviewer_principal_id: input.reviewer_principal_id,
      created_by_principal_id: input.created_by_principal_id,
      created_at: input.created_at ?? input.effective_from,
    };
    this.policies.push(row);
    return row;
  }

  async appendKillSwitchEvent(input: NewKillSwitchEventRecord): Promise<KillSwitchEventRecord> {
    const row: KillSwitchEventRecord = {
      kill_switch_event_id: input.kill_switch_event_id ?? randomUUID(),
      jurisdiction_code: input.jurisdiction_code,
      from_status: input.from_status,
      to_status: input.to_status,
      reason_code: input.reason_code,
      policy_version: input.policy_version,
      operator_principal_id: input.operator_principal_id,
      reviewer_principal_id: input.reviewer_principal_id,
      correlation_id: input.correlation_id,
      audit_event_id: input.audit_event_id,
      created_at: input.created_at ?? new Date(),
    };
    this.killSwitchEvents.push(row);
    return row;
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

function gateInput(subjectId: string, jurisdictionCodes: readonly string[]) {
  return {
    subject_kind: "match_ticket" as const,
    subject_id: subjectId,
    jurisdiction_codes: jurisdictionCodes,
    correlation_id: `corr-${subjectId}`,
    principal_id: OPERATOR_ID,
  };
}

function operator(scopes: readonly string[]): ScopedPrincipal {
  return { principal_id: OPERATOR_ID, principal_kind: "human", scopes };
}

function policy(
  code: string,
  status: JurisdictionPolicyStatus,
  version: string,
): JurisdictionPolicyRevision {
  return {
    jurisdiction_policy_id: randomUUID(),
    jurisdiction_code: code,
    status,
    policy_version: version,
    effective_from: new Date("2026-05-20T00:00:00.000Z"),
    effective_until: null,
    operational_reason: "launch_posture",
    reviewer_principal_id: null,
    created_by_principal_id: OPERATOR_ID,
    created_at: new Date("2026-05-20T00:00:00.000Z"),
  };
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

function writeReport(scenarios: readonly ScenarioResult[], auditEvents: number): void {
  const lines = [
    "# F06 quickstart run",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "| Scenario | Evidence | Result |",
    "| --- | --- | --- |",
    ...scenarios.map(
      (scenario) =>
        `| ${scenario.name} | ${scenario.evidence.map((line) => `\`${line}\``).join("<br>")} | PASS |`,
    ),
    "",
    "## Summary",
    "",
    `- scenarios: ${scenarios.length}`,
    `- canonical_audit_events: ${auditEvents}`,
    "- storage: memory-backed staged run; no Neon rows were mutated",
    "- rollback: not required because no persistent database writes were performed",
    "",
    "Command:",
    "",
    "```sh",
    "pnpm --filter @spyglass/policy-gates dev-run:f06",
    "```",
    "",
  ];
  const out = resolve(REPO_ROOT, OUT);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, lines.join("\n"), "utf8");
  console.log(`wrote ${OUT}`);
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

void main();
