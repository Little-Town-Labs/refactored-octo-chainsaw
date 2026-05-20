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

import { evaluateJurisdictionGate } from "../evaluator.js";
import { changeJurisdictionPosture } from "../kill-switch.js";
import type { GateDecisionInsert, JurisdictionPolicyGateRepository } from "../repo.js";
import { POLICY_KILL_SWITCH_MANAGE_SCOPE, PolicyScopeRequiredError } from "../scopes.js";
import type {
  GateDecisionRecord,
  JurisdictionPolicyRevision,
  KillSwitchEventRecord,
  NewKillSwitchEventRecord,
} from "../types.js";

const OPERATOR_ID = "11111111-1111-4111-8111-111111111111";

describe("changeJurisdictionPosture", () => {
  test("rejects principals without policy.kill_switch.manage", async () => {
    const repository = new MemoryPolicyGateRepository([policy("US-MO", "allowed")]);

    await expect(
      changeJurisdictionPosture(repository, new MemoryCanonicalAuditStore(), {
        jurisdictionCode: "US-MO",
        toStatus: "disabled",
        reasonCode: "incident_response",
        policyVersion: "launch-v2",
        operator: { principal_id: OPERATOR_ID, principal_kind: "human", scopes: [] },
        correlationId: "corr-001",
      }),
    ).rejects.toBeInstanceOf(PolicyScopeRequiredError);
  });

  test("records a scoped kill-switch mutation and audit event", async () => {
    const repository = new MemoryPolicyGateRepository([policy("US-MO", "allowed")]);
    const auditStore = new MemoryCanonicalAuditStore();

    const result = await changeJurisdictionPosture(repository, auditStore, {
      jurisdictionCode: "us-mo",
      toStatus: "disabled",
      reasonCode: "incident_response",
      policyVersion: "launch-v2",
      operator: {
        principal_id: OPERATOR_ID,
        principal_kind: "human",
        scopes: [POLICY_KILL_SWITCH_MANAGE_SCOPE],
      },
      reviewerPrincipalId: "22222222-2222-4222-8222-222222222222",
      correlationId: "corr-002",
      changedAt: new Date("2026-05-20T12:00:00.000Z"),
    });

    expect(result.policy).toMatchObject({
      jurisdiction_code: "US-MO",
      status: "disabled",
      policy_version: "launch-v2",
      created_by_principal_id: OPERATOR_ID,
    });
    expect(result.event).toMatchObject({
      jurisdiction_code: "US-MO",
      from_status: "allowed",
      to_status: "disabled",
      reason_code: "incident_response",
      operator_principal_id: OPERATOR_ID,
    });
    expect(auditStore.rows[0]).toMatchObject({
      source_table: "jurisdiction_kill_switch_events",
      source_event_id: result.event.kill_switch_event_id,
      event_name: "jurisdiction_policy.kill_switch",
      principal_id: OPERATOR_ID,
      role_or_scope: POLICY_KILL_SWITCH_MANAGE_SCOPE,
      correlation_id: "corr-002",
    });
  });

  test("new decisions immediately read the changed active posture", async () => {
    const repository = new MemoryPolicyGateRepository([policy("US-MO", "allowed")]);

    await changeJurisdictionPosture(repository, new MemoryCanonicalAuditStore(), {
      jurisdictionCode: "US-MO",
      toStatus: "disabled",
      reasonCode: "incident_response",
      policyVersion: "launch-v2",
      operator: {
        principal_id: OPERATOR_ID,
        principal_kind: "human",
        scopes: [POLICY_KILL_SWITCH_MANAGE_SCOPE],
      },
      correlationId: "corr-003",
    });

    const decision = evaluateJurisdictionGate(
      {
        subject_kind: "match_ticket",
        subject_id: "match-001",
        jurisdiction_codes: ["US-MO"],
        correlation_id: "corr-004",
        principal_id: OPERATOR_ID,
      },
      await repository.getActivePolicies(["US-MO"]),
    );

    expect(decision).toMatchObject({
      decision: "deny",
      reason_code: "disabled_jurisdiction",
      policy_version: "launch-v2",
    });
  });
});

class MemoryPolicyGateRepository implements JurisdictionPolicyGateRepository {
  readonly policies: JurisdictionPolicyRevision[];
  readonly killSwitchEvents: KillSwitchEventRecord[] = [];

  constructor(policies: readonly JurisdictionPolicyRevision[]) {
    this.policies = [...policies];
  }

  async getActivePolicies(
    jurisdictionCodes: readonly string[],
  ): Promise<readonly JurisdictionPolicyRevision[]> {
    const codeSet = new Set(jurisdictionCodes);
    return this.policies.filter(
      (policy) => codeSet.has(policy.jurisdiction_code) && policy.effective_until === null,
    );
  }

  async insertGateDecision(_input: GateDecisionInsert): Promise<GateDecisionRecord> {
    throw new Error("not needed in US2 tests");
  }

  async closeActivePolicy(jurisdictionCode: string, effectiveUntil: Date): Promise<void> {
    for (const policy of this.policies) {
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
      jurisdiction_policy_id:
        input.jurisdiction_policy_id ?? `${input.jurisdiction_code}-policy-v2`,
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
      kill_switch_event_id: input.kill_switch_event_id ?? "33333333-3333-4333-8333-333333333333",
      jurisdiction_code: input.jurisdiction_code,
      from_status: input.from_status,
      to_status: input.to_status,
      reason_code: input.reason_code,
      policy_version: input.policy_version,
      operator_principal_id: input.operator_principal_id,
      reviewer_principal_id: input.reviewer_principal_id,
      correlation_id: input.correlation_id,
      audit_event_id: input.audit_event_id,
      created_at: input.created_at ?? new Date("2026-05-20T12:00:00.000Z"),
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

function policy(
  jurisdictionCode: string,
  status: JurisdictionPolicyStatus,
): JurisdictionPolicyRevision {
  return {
    jurisdiction_policy_id: `${jurisdictionCode}-policy-v1`,
    jurisdiction_code: jurisdictionCode,
    status,
    policy_version: "launch-v1",
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
