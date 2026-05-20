import { randomUUID } from "node:crypto";

import { appendCanonicalAuditEvent, type CanonicalAuditWriterStore } from "@spyglass/audit-log";
import {
  type Db,
  jurisdictionGateDecisions,
  type JurisdictionGateDecisionRow,
  jurisdictionKillSwitchEvents,
  type JurisdictionKillSwitchEventRow,
  jurisdictionPolicies,
  type JurisdictionPolicyRow,
  type NewJurisdictionGateDecisionRow,
  type NewJurisdictionKillSwitchEventRow,
  type NewJurisdictionPolicyRow,
} from "@spyglass/db";
import { and, desc, eq, gte, inArray, isNull, lte, sql, type SQL } from "drizzle-orm";

import type {
  GateDecisionRecord,
  JurisdictionPolicyRevision,
  KillSwitchEventRecord,
  NewGateDecisionRecord,
  NewJurisdictionPolicyRevision,
  NewKillSwitchEventRecord,
  PendingGateDecisionRecord,
} from "./types.js";

export interface JurisdictionPolicyGateRepository {
  getActivePolicies(
    jurisdictionCodes: readonly string[],
  ): Promise<readonly JurisdictionPolicyRevision[]>;
  listGateDecisions(query: GateDecisionHistoryQuery): Promise<readonly GateDecisionRecord[]>;
  insertGateDecision(input: GateDecisionInsert): Promise<GateDecisionRecord>;
  closeActivePolicy(jurisdictionCode: string, effectiveUntil: Date): Promise<void>;
  insertPolicyRevision(input: NewJurisdictionPolicyRevision): Promise<JurisdictionPolicyRevision>;
  appendKillSwitchEvent(input: NewKillSwitchEventRecord): Promise<KillSwitchEventRecord>;
}

export type GateDecisionInsert = NewGateDecisionRecord & {
  readonly gate_decision_id?: string;
  readonly created_at?: Date;
};

export interface GateDecisionHistoryQuery {
  readonly correlationId?: string;
  readonly subjectKind?: GateDecisionRecord["subject_kind"];
  readonly subjectId?: string;
  readonly jurisdictionCodes?: readonly string[];
  readonly from?: Date;
  readonly until?: Date;
  readonly limit: number;
}

export interface AppendGateDecisionWithAuditInput {
  readonly decision: PendingGateDecisionRecord;
  readonly audit: {
    readonly principalKind: "human" | "agent" | "service";
    readonly roleOrScope?: string | null;
    readonly chainNamespace?: string;
  };
}

export interface DrizzleJurisdictionPolicyGateRepositoryOptions {
  readonly db: Db;
}

export function createDrizzleJurisdictionPolicyGateRepository(
  options: DrizzleJurisdictionPolicyGateRepositoryOptions,
): JurisdictionPolicyGateRepository {
  const db = options.db;

  return {
    async getActivePolicies(jurisdictionCodes) {
      if (jurisdictionCodes.length === 0) return [];

      const rows = await db
        .select()
        .from(jurisdictionPolicies)
        .where(
          and(
            inArray(jurisdictionPolicies.jurisdiction_code, [...new Set(jurisdictionCodes)]),
            isNull(jurisdictionPolicies.effective_until),
          ),
        );

      return rows.map(toPolicyRevision);
    },
    async insertGateDecision(input) {
      const [row] = await db
        .insert(jurisdictionGateDecisions)
        .values(toGateDecisionInsert(input))
        .returning();
      if (!row) throw new Error("failed to insert jurisdiction gate decision");
      return toGateDecisionRecord(row);
    },
    async listGateDecisions(query) {
      const rows = await db
        .select()
        .from(jurisdictionGateDecisions)
        .where(buildGateDecisionWhere(query))
        .orderBy(desc(jurisdictionGateDecisions.created_at))
        .limit(query.limit);
      return rows.map(toGateDecisionRecord);
    },
    async closeActivePolicy(jurisdictionCode, effectiveUntil) {
      await db
        .update(jurisdictionPolicies)
        .set({ effective_until: effectiveUntil })
        .where(
          and(
            eq(jurisdictionPolicies.jurisdiction_code, jurisdictionCode),
            isNull(jurisdictionPolicies.effective_until),
          ),
        );
    },
    async insertPolicyRevision(input) {
      const [row] = await db.insert(jurisdictionPolicies).values(toPolicyInsert(input)).returning();
      if (!row) throw new Error("failed to insert jurisdiction policy revision");
      return toPolicyRevision(row);
    },
    async appendKillSwitchEvent(input) {
      const [row] = await db
        .insert(jurisdictionKillSwitchEvents)
        .values(toKillSwitchEventInsert(input))
        .returning();
      if (!row) throw new Error("failed to insert jurisdiction kill-switch event");
      return toKillSwitchEventRecord(row);
    },
  };
}

export async function appendGateDecisionWithAudit(
  repository: JurisdictionPolicyGateRepository,
  auditStore: CanonicalAuditWriterStore,
  input: AppendGateDecisionWithAuditInput,
): Promise<GateDecisionRecord> {
  const gateDecisionId = input.decision.gate_decision_id ?? randomUUID();
  const auditEvent = await appendCanonicalAuditEvent(auditStore, {
    sourceTable: "jurisdiction_gate_decisions",
    sourceEventId: gateDecisionId,
    eventName: "jurisdiction_gate.decision",
    principalId: input.decision.principal_id ?? "00000000-0000-4000-8000-000000000000",
    principalKind: input.audit.principalKind,
    roleOrScope: input.audit.roleOrScope ?? null,
    correlationId: input.decision.correlation_id,
    chainNamespace: input.audit.chainNamespace ?? "jurisdiction-policy-gates",
    payload: {
      subject_kind: input.decision.subject_kind,
      subject_id: input.decision.subject_id,
      decision: input.decision.decision,
      reason_code: input.decision.reason_code,
      jurisdiction_codes: [...input.decision.jurisdiction_codes],
      policy_version: input.decision.policy_version,
      policy_revision_ids: [...input.decision.policy_revision_ids],
    },
    ...(input.decision.created_at ? { createdAt: input.decision.created_at } : {}),
  });

  return repository.insertGateDecision({
    ...input.decision,
    gate_decision_id: gateDecisionId,
    audit_event_id: auditEvent.audit_event_id,
    created_at: auditEvent.created_at,
  });
}

function buildGateDecisionWhere(query: GateDecisionHistoryQuery): SQL | undefined {
  const clauses: SQL[] = [];
  if (query.correlationId) {
    clauses.push(eq(jurisdictionGateDecisions.correlation_id, query.correlationId));
  }
  if (query.subjectKind) {
    clauses.push(eq(jurisdictionGateDecisions.subject_kind, query.subjectKind));
  }
  if (query.subjectId) {
    clauses.push(eq(jurisdictionGateDecisions.subject_id, query.subjectId));
  }
  if (query.from) {
    clauses.push(gte(jurisdictionGateDecisions.created_at, query.from));
  }
  if (query.until) {
    clauses.push(lte(jurisdictionGateDecisions.created_at, query.until));
  }
  for (const jurisdictionCode of query.jurisdictionCodes ?? []) {
    clauses.push(
      sql`${jurisdictionGateDecisions.jurisdiction_codes} @> ${JSON.stringify([
        jurisdictionCode,
      ])}::jsonb`,
    );
  }
  return clauses.length > 0 ? and(...clauses) : undefined;
}

function toGateDecisionInsert(input: GateDecisionInsert): NewJurisdictionGateDecisionRow {
  return {
    ...(input.gate_decision_id ? { gate_decision_id: input.gate_decision_id } : {}),
    subject_kind: input.subject_kind,
    subject_id: input.subject_id,
    decision: input.decision,
    reason_code: input.reason_code,
    jurisdiction_codes: [...input.jurisdiction_codes],
    policy_version: input.policy_version,
    policy_revision_ids: [...input.policy_revision_ids],
    correlation_id: input.correlation_id,
    principal_id: input.principal_id,
    audit_event_id: input.audit_event_id,
    ...(input.created_at ? { created_at: input.created_at } : {}),
  };
}

function toPolicyInsert(input: NewJurisdictionPolicyRevision): NewJurisdictionPolicyRow {
  return {
    ...(input.jurisdiction_policy_id
      ? { jurisdiction_policy_id: input.jurisdiction_policy_id }
      : {}),
    jurisdiction_code: input.jurisdiction_code,
    status: input.status,
    policy_version: input.policy_version,
    effective_from: input.effective_from,
    effective_until: input.effective_until,
    operational_reason: input.operational_reason,
    reviewer_principal_id: input.reviewer_principal_id,
    created_by_principal_id: input.created_by_principal_id,
    ...(input.created_at ? { created_at: input.created_at } : {}),
  };
}

function toKillSwitchEventInsert(
  input: NewKillSwitchEventRecord,
): NewJurisdictionKillSwitchEventRow {
  return {
    ...(input.kill_switch_event_id ? { kill_switch_event_id: input.kill_switch_event_id } : {}),
    jurisdiction_code: input.jurisdiction_code,
    from_status: input.from_status,
    to_status: input.to_status,
    reason_code: input.reason_code,
    policy_version: input.policy_version,
    operator_principal_id: input.operator_principal_id,
    reviewer_principal_id: input.reviewer_principal_id,
    correlation_id: input.correlation_id,
    audit_event_id: input.audit_event_id,
    ...(input.created_at ? { created_at: input.created_at } : {}),
  };
}

function toPolicyRevision(row: JurisdictionPolicyRow): JurisdictionPolicyRevision {
  return {
    jurisdiction_policy_id: row.jurisdiction_policy_id,
    jurisdiction_code: row.jurisdiction_code,
    status: row.status as JurisdictionPolicyRevision["status"],
    policy_version: row.policy_version,
    effective_from: row.effective_from,
    effective_until: row.effective_until,
    operational_reason: row.operational_reason,
    reviewer_principal_id: row.reviewer_principal_id,
    created_by_principal_id: row.created_by_principal_id,
    created_at: row.created_at,
  };
}

function toGateDecisionRecord(row: JurisdictionGateDecisionRow): GateDecisionRecord {
  return {
    gate_decision_id: row.gate_decision_id,
    subject_kind: row.subject_kind as GateDecisionRecord["subject_kind"],
    subject_id: row.subject_id,
    decision: row.decision as GateDecisionRecord["decision"],
    reason_code: row.reason_code as GateDecisionRecord["reason_code"],
    jurisdiction_codes: row.jurisdiction_codes,
    policy_version: row.policy_version,
    policy_revision_ids: row.policy_revision_ids,
    correlation_id: row.correlation_id,
    principal_id: row.principal_id,
    audit_event_id: row.audit_event_id,
    created_at: row.created_at,
  };
}

function toKillSwitchEventRecord(row: JurisdictionKillSwitchEventRow): KillSwitchEventRecord {
  return {
    kill_switch_event_id: row.kill_switch_event_id,
    jurisdiction_code: row.jurisdiction_code,
    from_status: row.from_status as KillSwitchEventRecord["from_status"],
    to_status: row.to_status as KillSwitchEventRecord["to_status"],
    reason_code: row.reason_code as KillSwitchEventRecord["reason_code"],
    policy_version: row.policy_version,
    operator_principal_id: row.operator_principal_id,
    reviewer_principal_id: row.reviewer_principal_id,
    correlation_id: row.correlation_id,
    audit_event_id: row.audit_event_id,
    created_at: row.created_at,
  };
}
