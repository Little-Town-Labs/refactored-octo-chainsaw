import type {
  JurisdictionGateDecision,
  JurisdictionGateReasonCode,
  JurisdictionGateSubjectKind,
  JurisdictionKillSwitchReasonCode,
  JurisdictionPolicyStatus,
} from "@spyglass/db";

export {
  JURISDICTION_GATE_DECISIONS,
  JURISDICTION_GATE_REASON_CODES,
  JURISDICTION_GATE_SUBJECT_KINDS,
  JURISDICTION_KILL_SWITCH_REASON_CODES,
  JURISDICTION_POLICY_STATUSES,
} from "@spyglass/db";

export type {
  JurisdictionGateDecision,
  JurisdictionGateReasonCode,
  JurisdictionGateSubjectKind,
  JurisdictionKillSwitchReasonCode,
  JurisdictionPolicyStatus,
} from "@spyglass/db";

export interface JurisdictionPolicyRevision {
  readonly jurisdiction_policy_id: string;
  readonly jurisdiction_code: string;
  readonly status: JurisdictionPolicyStatus;
  readonly policy_version: string;
  readonly effective_from: Date;
  readonly effective_until: Date | null;
  readonly operational_reason: string;
  readonly reviewer_principal_id: string | null;
  readonly created_by_principal_id: string;
  readonly created_at: Date;
}

export type NewJurisdictionPolicyRevision = Omit<
  JurisdictionPolicyRevision,
  "jurisdiction_policy_id" | "created_at"
> & {
  readonly jurisdiction_policy_id?: string;
  readonly created_at?: Date;
};

export interface GateDecisionRecord {
  readonly gate_decision_id: string;
  readonly subject_kind: JurisdictionGateSubjectKind;
  readonly subject_id: string;
  readonly decision: JurisdictionGateDecision;
  readonly reason_code: JurisdictionGateReasonCode;
  readonly jurisdiction_codes: readonly string[];
  readonly policy_version: string;
  readonly policy_revision_ids: readonly string[];
  readonly correlation_id: string;
  readonly principal_id: string | null;
  readonly audit_event_id: string;
  readonly created_at: Date;
}

export type NewGateDecisionRecord = Omit<GateDecisionRecord, "gate_decision_id" | "created_at">;

export type PendingGateDecisionRecord = Omit<
  GateDecisionRecord,
  "gate_decision_id" | "audit_event_id" | "created_at"
> & {
  readonly gate_decision_id?: string;
  readonly created_at?: Date;
};

export interface KillSwitchEventRecord {
  readonly kill_switch_event_id: string;
  readonly jurisdiction_code: string;
  readonly from_status: JurisdictionPolicyStatus;
  readonly to_status: JurisdictionPolicyStatus;
  readonly reason_code: JurisdictionKillSwitchReasonCode;
  readonly policy_version: string;
  readonly operator_principal_id: string;
  readonly reviewer_principal_id: string | null;
  readonly correlation_id: string;
  readonly audit_event_id: string;
  readonly created_at: Date;
}

export type NewKillSwitchEventRecord = Omit<
  KillSwitchEventRecord,
  "kill_switch_event_id" | "created_at"
> & {
  readonly kill_switch_event_id?: string;
  readonly created_at?: Date;
};
