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
