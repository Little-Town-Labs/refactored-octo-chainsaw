import { randomUUID } from "node:crypto";

import { appendCanonicalAuditEvent, type CanonicalAuditWriterStore } from "@spyglass/audit-log";

import type { JurisdictionPolicyGateRepository } from "./repo.js";
import {
  POLICY_KILL_SWITCH_MANAGE_SCOPE,
  requirePolicyScope,
  type ScopedPrincipal,
} from "./scopes.js";
import type {
  JurisdictionKillSwitchReasonCode,
  JurisdictionPolicyRevision,
  JurisdictionPolicyStatus,
  KillSwitchEventRecord,
} from "./types.js";

export interface ChangeJurisdictionPostureInput {
  readonly jurisdictionCode: string;
  readonly toStatus: JurisdictionPolicyStatus;
  readonly reasonCode: JurisdictionKillSwitchReasonCode;
  readonly policyVersion: string;
  readonly operator: ScopedPrincipal;
  readonly reviewerPrincipalId?: string | null;
  readonly correlationId: string;
  readonly changedAt?: Date;
}

export class JurisdictionPolicyNotFoundError extends Error {
  constructor(jurisdictionCode: string) {
    super(`No active jurisdiction policy found for "${jurisdictionCode}".`);
    this.name = "JurisdictionPolicyNotFoundError";
  }
}

export class JurisdictionPolicyNoopError extends Error {
  constructor(jurisdictionCode: string, status: JurisdictionPolicyStatus) {
    super(`Jurisdiction "${jurisdictionCode}" is already "${status}".`);
    this.name = "JurisdictionPolicyNoopError";
  }
}

export async function changeJurisdictionPosture(
  repository: JurisdictionPolicyGateRepository,
  auditStore: CanonicalAuditWriterStore,
  input: ChangeJurisdictionPostureInput,
): Promise<{
  readonly policy: JurisdictionPolicyRevision;
  readonly event: KillSwitchEventRecord;
}> {
  requirePolicyScope(input.operator, POLICY_KILL_SWITCH_MANAGE_SCOPE);

  const jurisdictionCode = normalizeJurisdictionCode(input.jurisdictionCode);
  const changedAt = input.changedAt ?? new Date();
  const [current] = await repository.getActivePolicies([jurisdictionCode]);
  if (!current) throw new JurisdictionPolicyNotFoundError(jurisdictionCode);
  if (current.status === input.toStatus) {
    throw new JurisdictionPolicyNoopError(jurisdictionCode, input.toStatus);
  }

  const killSwitchEventId = randomUUID();
  const auditEvent = await appendCanonicalAuditEvent(auditStore, {
    sourceTable: "jurisdiction_kill_switch_events",
    sourceEventId: killSwitchEventId,
    eventName: "jurisdiction_policy.kill_switch",
    principalId: input.operator.principal_id,
    principalKind: input.operator.principal_kind,
    roleOrScope: POLICY_KILL_SWITCH_MANAGE_SCOPE,
    correlationId: input.correlationId,
    chainNamespace: "jurisdiction-policy-gates",
    payload: {
      jurisdiction_code: jurisdictionCode,
      from_status: current.status,
      to_status: input.toStatus,
      reason_code: input.reasonCode,
      policy_version: input.policyVersion,
      previous_policy_revision_id: current.jurisdiction_policy_id,
      reviewer_principal_id: input.reviewerPrincipalId ?? null,
    },
    createdAt: changedAt,
  });

  await repository.closeActivePolicy(jurisdictionCode, changedAt);
  const policy = await repository.insertPolicyRevision({
    jurisdiction_code: jurisdictionCode,
    status: input.toStatus,
    policy_version: input.policyVersion,
    effective_from: changedAt,
    effective_until: null,
    operational_reason: input.reasonCode,
    reviewer_principal_id: input.reviewerPrincipalId ?? null,
    created_by_principal_id: input.operator.principal_id,
    created_at: changedAt,
  });
  const event = await repository.appendKillSwitchEvent({
    kill_switch_event_id: killSwitchEventId,
    jurisdiction_code: jurisdictionCode,
    from_status: current.status,
    to_status: input.toStatus,
    reason_code: input.reasonCode,
    policy_version: input.policyVersion,
    operator_principal_id: input.operator.principal_id,
    reviewer_principal_id: input.reviewerPrincipalId ?? null,
    correlation_id: input.correlationId,
    audit_event_id: auditEvent.audit_event_id,
    created_at: auditEvent.created_at,
  });

  return { policy, event };
}

function normalizeJurisdictionCode(jurisdictionCode: string): string {
  return jurisdictionCode.trim().toUpperCase();
}
