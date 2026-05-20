import type { AuditLogEventRow } from "@spyglass/db";
import type {
  CanonicalAuditWriterStore,
  CanonicalAuditWriterTx,
  InsertCanonicalAuditEventRow,
} from "@spyglass/audit-log";

import {
  appendGateDecisionWithAudit,
  type GateDecisionInsert,
  type JurisdictionPolicyGateRepository,
} from "../repo.js";
import type {
  GateDecisionRecord,
  JurisdictionPolicyRevision,
  KillSwitchEventRecord,
  NewKillSwitchEventRecord,
} from "../types.js";

const PRINCIPAL_ID = "11111111-1111-4111-8111-111111111111";
const GATE_DECISION_ID = "22222222-2222-4222-8222-222222222222";

describe("gate decision audit linkage", () => {
  test("persists a gate decision linked to a canonical audit event", async () => {
    const repository = new MemoryPolicyGateRepository();
    const auditStore = new MemoryCanonicalAuditStore();

    const decision = await appendGateDecisionWithAudit(repository, auditStore, {
      decision: {
        gate_decision_id: GATE_DECISION_ID,
        subject_kind: "match_ticket",
        subject_id: "match-001",
        decision: "deny",
        reason_code: "disabled_jurisdiction",
        jurisdiction_codes: ["US-TX"],
        policy_version: "launch-v1",
        policy_revision_ids: ["33333333-3333-4333-8333-333333333333"],
        correlation_id: "corr-001",
        principal_id: PRINCIPAL_ID,
        created_at: new Date("2026-05-20T12:00:00.000Z"),
      },
      audit: { principalKind: "human", roleOrScope: "policy.decide" },
    });

    expect(auditStore.rows).toHaveLength(1);
    expect(auditStore.rows[0]).toMatchObject({
      source_table: "jurisdiction_gate_decisions",
      source_event_id: GATE_DECISION_ID,
      event_name: "jurisdiction_gate.decision",
      principal_id: PRINCIPAL_ID,
      correlation_id: "corr-001",
    });
    expect(decision.audit_event_id).toBe(auditStore.rows[0]?.audit_event_id);
    expect(repository.gateDecisions).toEqual([decision]);
  });
});

class MemoryPolicyGateRepository implements JurisdictionPolicyGateRepository {
  readonly gateDecisions: GateDecisionRecord[] = [];

  async getActivePolicies(): Promise<readonly JurisdictionPolicyRevision[]> {
    return [];
  }

  async insertGateDecision(input: GateDecisionInsert): Promise<GateDecisionRecord> {
    const row: GateDecisionRecord = {
      gate_decision_id: input.gate_decision_id ?? GATE_DECISION_ID,
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
      created_at: input.created_at ?? new Date("2026-05-20T12:00:00.000Z"),
    };
    this.gateDecisions.push(row);
    return row;
  }

  async appendKillSwitchEvent(_input: NewKillSwitchEventRecord): Promise<KillSwitchEventRecord> {
    throw new Error("not needed in US1 audit tests");
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
