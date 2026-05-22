import type {
  AgentContractRuntimeSettings,
  AgentContractVersion,
  ContractRef,
} from "@spyglass/agent-contracts";
import type { DossierArtifact, InconclusiveFlag, RubricBreakdown } from "@spyglass/dossiers";
import type { PrivacyRulesetRef } from "@spyglass/privacy-filter";
import type { RubricVersion } from "@spyglass/rubrics";
import type { ToolDescriptorVersion, ToolSurfaceRef } from "@spyglass/tool-dispatcher";

export const PARLEY_RUN_STATES = [
  "pending",
  "seeker_turn",
  "seeker_filtering",
  "employer_turn",
  "employer_filtering",
  "round_complete",
  "scoring",
  "producing_dossier",
  "complete",
  "inconclusive",
  "aborted",
  "timed_out",
  "tool_failure",
  "dispatch_refused",
] as const;
export type ParleyRunState = (typeof PARLEY_RUN_STATES)[number];

export const PARLEY_TERMINAL_STATES = [
  "complete",
  "inconclusive",
  "aborted",
  "timed_out",
  "tool_failure",
  "dispatch_refused",
] as const;
export type ParleyTerminalState = (typeof PARLEY_TERMINAL_STATES)[number];

export type ParleySide = "seeker" | "employer";

export interface ParleyConfig {
  readonly harness_version: string;
  readonly default_round_cap: number;
  readonly runtime_ceilings?: AgentContractRuntimeSettings;
}

export interface ParleyDispatchRequest {
  readonly event_name: "match_ticket.match_made" | "match_ticket.renegotiation_requested";
  readonly event_version: 1;
  readonly correlation_id: string;
  readonly match_ticket_id: string;
  readonly match_ticket_identifier: string;
  readonly attempt: number;
  readonly seeker_contract_ref: ContractRef;
  readonly employer_contract_ref: ContractRef;
  readonly privacy_ruleset_ref: PrivacyRulesetRef;
}

export interface FrozenParleyRefs {
  readonly seeker_contract: AgentContractVersion;
  readonly employer_contract: AgentContractVersion;
  readonly seeker_rubric: RubricVersion;
  readonly employer_rubric: RubricVersion;
  readonly seeker_tools: readonly ToolDescriptorVersion[];
  readonly employer_tools: readonly ToolDescriptorVersion[];
}

export interface ParleyRun {
  readonly run_id: string;
  readonly match_ticket_id: string;
  readonly match_ticket_identifier: string;
  readonly attempt: number;
  readonly status: ParleyRunState;
  readonly round: number;
  readonly round_cap: number;
  readonly seeker_contract_ref: ContractRef;
  readonly employer_contract_ref: ContractRef;
  readonly privacy_ruleset_ref: PrivacyRulesetRef;
  readonly harness_version: string;
  readonly terminal_reason: string | null;
  readonly dossier_id: string | null;
  readonly started_at: Date;
  readonly completed_at: Date | null;
}

export interface ParleyTransitionEvent {
  readonly transition_id: string;
  readonly run_id: string;
  readonly match_ticket_id: string;
  readonly round: number;
  readonly side: ParleySide | null;
  readonly from_state: ParleyRunState;
  readonly to_state: ParleyRunState;
  readonly reason_code: string;
  readonly audit_event_id: string | null;
  readonly created_at: Date;
}

export interface NegotiationContext {
  readonly run_id: string;
  readonly side: ParleySide;
  readonly principal_view: Record<string, unknown>;
  readonly counterparty_view: Record<string, unknown>;
  readonly prompt_history: readonly PromptMessage[];
  readonly tool_call_log: readonly Record<string, unknown>[];
  readonly rubric_scratch: Readonly<
    Record<string, { score: number | null; rationale: string | null }>
  >;
  readonly projection_refs: readonly string[];
  readonly released: boolean;
}

export interface PromptMessage {
  readonly role: "system" | "user" | "assistant" | "tool";
  readonly content: string;
}

export interface ProjectedCounterpartyView {
  readonly projection_ref: string;
  readonly payload: Record<string, unknown>;
}

export interface SideTurnOutput {
  readonly message_to_counterparty: string;
  readonly internal_notes: string;
  readonly done_signal: boolean;
  readonly flag_proposals: readonly string[];
  readonly model_invocation_ref?: string;
}

export interface SideScoringOutput {
  readonly dimension_scores: readonly {
    readonly dimension_id: string;
    readonly score: number;
    readonly rationale: string;
  }[];
  readonly headline_rationale: string;
  readonly flag_proposals: readonly string[];
  readonly model_holistic_score?: number;
  readonly model_invocation_ref?: string;
}

export interface SideAgentDriver {
  turn(input: {
    readonly run: ParleyRun;
    readonly context: NegotiationContext;
    readonly side: ParleySide;
    readonly round: number;
  }): Promise<SideTurnOutput>;
  score(input: {
    readonly run: ParleyRun;
    readonly context: NegotiationContext;
    readonly side: ParleySide;
    readonly rubric: RubricVersion;
  }): Promise<SideScoringOutput>;
}

export interface DossierProductionRequest {
  readonly run: ParleyRun;
  readonly status: "conclusive" | "inconclusive";
  readonly rubric_breakdowns: readonly RubricBreakdown[];
  readonly rationales: Readonly<Record<ParleySide, string>>;
  readonly model_invocation_refs: readonly string[];
  readonly flags: readonly string[];
  readonly inconclusive_flags: readonly InconclusiveFlag[];
  readonly projections: readonly {
    readonly audience: "seeker" | "employer" | "auditor" | "a2a_receiver";
    readonly disclosure_stage: string;
    readonly ruleset_ref: PrivacyRulesetRef;
    readonly payload: Record<string, unknown>;
  }[];
}

export interface DossierProductionResult {
  readonly dossier: DossierArtifact;
  readonly terminal_event: ParleyTerminalEvent;
  readonly dossier_event: ParleyTerminalEvent;
}

export interface ParleyTerminalEvent {
  readonly event_name: "negotiation.run.terminated" | "dossier.produced";
  readonly event_version: 1;
  readonly run_id: string;
  readonly match_ticket_id: string;
  readonly terminal_state: ParleyTerminalState;
  readonly reason_code: string;
  readonly dossier_id?: string;
  readonly produced_at?: string;
}

export interface ToolSurfaceResolution {
  readonly ref: ToolSurfaceRef;
  readonly descriptors: readonly ToolDescriptorVersion[];
}

export const RENEGOTIATION_EVENT_NAME = "match_ticket.renegotiation_requested" as const;
export const DEFAULT_RENEGOTIATION_ROUND_CAP = 3;

export const RENEGOTIATION_REASON_CODES = [
  "renegotiation_allowed",
  "duplicate_request",
  "unauthorized_requester",
  "requester_not_cleared_side",
  "match_ticket_not_found",
  "match_ticket_not_eligible",
  "prior_outcome_not_asymmetric",
  "round_cap_exhausted",
  "cost_ceiling_exceeded",
  "legal_hold_blocks_processing",
  "tombstone_blocks_processing",
  "active_run_exists",
  "missing_required_reference",
] as const;
export type RenegotiationReasonCode = (typeof RENEGOTIATION_REASON_CODES)[number];

export type RenegotiationDecisionKind = "allow" | "deny" | "idempotent_replay";
export type RenegotiationAttemptStatus =
  | "accepted"
  | "dispatched"
  | "running"
  | "complete"
  | "inconclusive"
  | "refused"
  | "terminated";
export type RenegotiationPriorOutcome =
  | "seeker_cleared"
  | "employer_cleared"
  | "both_cleared"
  | "none_cleared"
  | "inconclusive";
export type RenegotiationMatchStatus = "open" | "negotiating" | "closed" | "withdrawn";
export type RenegotiationAlarmType =
  | "cost_ceiling_exceeded"
  | "round_cap_exhausted"
  | "duplicate_run_allocation_attempt";
export type RenegotiationAlarmSeverity = "warning" | "high" | "critical";

export interface RenegotiationRequest {
  readonly request_id: string;
  readonly event_name: typeof RENEGOTIATION_EVENT_NAME;
  readonly event_version: 1;
  readonly match_ticket_id: string;
  readonly match_ticket_identifier: string;
  readonly requester_side: ParleySide;
  readonly requester_principal_id: string;
  readonly requester_scopes: readonly string[];
  readonly prior_run_id: string;
  readonly prior_dossier_id?: string | null;
  readonly requested_attempt: number;
  readonly reason_code: string;
  readonly requested_at: Date;
}

export interface RenegotiationMatchTicketSnapshot {
  readonly match_ticket_id: string;
  readonly match_ticket_identifier: string;
  readonly status: RenegotiationMatchStatus;
  readonly current_attempt: number;
  readonly prior_outcome: RenegotiationPriorOutcome;
  readonly authorized_sides: readonly ParleySide[];
  readonly prior_run_ids: readonly string[];
  readonly legal_hold: boolean;
  readonly tombstoned: boolean;
  readonly seeker_contract_ref: ContractRef;
  readonly employer_contract_ref: ContractRef;
  readonly privacy_ruleset_ref: PrivacyRulesetRef;
  readonly seeker_round_cap?: number;
  readonly employer_round_cap?: number;
  readonly cost_ceiling: number;
}

export interface RenegotiationIsolationBoundary {
  readonly prompt_history_entries: 0;
  readonly tool_call_entries: 0;
  readonly seeker_scratch_entries: 0;
  readonly employer_scratch_entries: 0;
  readonly prior_context_rehydrated: false;
  readonly allowed_reference_types: readonly string[];
}

export interface RenegotiationAttempt {
  readonly attempt_id: string;
  readonly match_ticket_id: string;
  readonly attempt: number;
  readonly run_id: string;
  readonly request_id: string;
  readonly requester_side: ParleySide;
  readonly status: RenegotiationAttemptStatus;
  readonly effective_round_cap: number;
  readonly cost_ceiling: number;
  readonly cost_observed: number;
  readonly prior_run_id: string;
  readonly prior_dossier_id: string | null;
  readonly isolation_boundary: RenegotiationIsolationBoundary;
  readonly created_at: Date;
  readonly started_at: Date | null;
  readonly completed_at: Date | null;
  readonly terminal_reason: string | null;
}

export interface RenegotiationAuditEvent {
  readonly audit_event_id: string;
  readonly event_name:
    | "renegotiation.request.accepted"
    | "renegotiation.request.refused"
    | "renegotiation.request.replayed"
    | "renegotiation.run.allocated"
    | "renegotiation.cost.alarm"
    | "renegotiation.run.terminated";
  readonly match_ticket_id: string;
  readonly request_id: string;
  readonly run_id: string | null;
  readonly reason_code: RenegotiationReasonCode;
  readonly created_at: Date;
}

export interface RenegotiationAlarm {
  readonly alarm_id: string;
  readonly alarm_type: RenegotiationAlarmType;
  readonly severity: RenegotiationAlarmSeverity;
  readonly match_ticket_id: string;
  readonly attempt: number;
  readonly run_id: string | null;
  readonly threshold: number;
  readonly observed: number;
  readonly audit_event_ref: string;
  readonly raised_at: Date;
}

export interface RenegotiationDecision {
  readonly decision_id: string;
  readonly request_id: string;
  readonly decision: RenegotiationDecisionKind;
  readonly reason_code: RenegotiationReasonCode;
  readonly match_ticket_id: string;
  readonly attempt: number;
  readonly run_id: string | null;
  readonly effective_round_cap: number;
  readonly cost_ceiling: number;
  readonly estimated_cost: number;
  readonly audit_event_ref: string;
  readonly notification_policy: { readonly non_cleared_side_notified: false };
  readonly decided_at: Date;
  readonly attempt_record?: RenegotiationAttempt;
  readonly alarms: readonly RenegotiationAlarm[];
}

export interface RenegotiationOutcomeProjection {
  readonly match_ticket_id: string;
  readonly attempt: number;
  readonly decision: RenegotiationDecisionKind;
  readonly reason_code: RenegotiationReasonCode;
  readonly run_id: string | null;
  readonly hidden_run_state_exposed: false;
  readonly non_cleared_side_notified: false;
}
