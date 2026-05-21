import type { ContractRef } from "@spyglass/agent-contracts";
import type {
  AiRepository,
  GatewayAdapter,
  ManifestRef,
  ModelInvocationRecord,
  ModelRef,
  PromptRef,
  ScopedAiPrincipal,
} from "@spyglass/ai";
import type { NegotiationContext } from "@spyglass/parley";
import type { PrivacyRulesetRef } from "@spyglass/privacy-filter";
import type { RubricRef, RubricVersion } from "@spyglass/rubrics";
import type { ToolSurfaceRef } from "@spyglass/tool-dispatcher";

export const SEEKER_ADVOCATE_REASON_CODES = [
  "missing_required_ref",
  "invalid_frozen_ref",
  "unauthorized_manifest_ref",
  "unfiltered_counterparty_data",
  "unsupported_tool",
  "prior_run_context_refused",
  "unsafe_prompt_variable",
  "budget_preflight_exceeded",
  "gateway_unavailable",
  "scoring_dimensions_invalid",
  "human_input_pause_refused",
  "audit_unavailable",
] as const;
export type SeekerAdvocateReasonCode = (typeof SEEKER_ADVOCATE_REASON_CODES)[number];

export type SeekerAdvocateOperation = "turn" | "score";

export interface SeekerAdvocateFrozenRefs {
  readonly contract_ref: ContractRef;
  readonly prompt_ref: PromptRef;
  readonly model_ref: ModelRef;
  readonly manifest_ref: ManifestRef;
  readonly rubric_ref: RubricRef;
  readonly privacy_ruleset_ref: PrivacyRulesetRef;
  readonly tool_surface_ref: ToolSurfaceRef;
}

export interface SeekerAdvocatePrincipalView {
  readonly seeker_ticket_id: string;
  readonly profile_summary: string;
  readonly preferences: readonly string[];
  readonly threshold: number;
}

export interface FilteredCounterpartyProjection {
  readonly projection_ref: string;
  readonly filtered: true;
  readonly payload: Record<string, unknown>;
}

export interface SeekerAdvocateRuntime {
  readonly repository: AiRepository;
  readonly gateway: GatewayAdapter;
  readonly caller: ScopedAiPrincipal;
  readonly caller_scope: string;
}

export interface SeekerAdvocateRunInput {
  readonly run_id: string;
  readonly match_ticket_id: string;
  readonly operation: SeekerAdvocateOperation;
  readonly round?: number;
  readonly refs: SeekerAdvocateFrozenRefs;
  readonly principal_view: SeekerAdvocatePrincipalView;
  readonly counterparty_projection: FilteredCounterpartyProjection;
  readonly context: NegotiationContext;
  readonly allowed_tool_names: readonly string[];
  readonly runtime: SeekerAdvocateRuntime;
}

export interface SeekerAdvocateTurnResult {
  readonly run_id: string;
  readonly side: "seeker";
  readonly round: number;
  readonly message_to_counterparty: string;
  readonly internal_rationale: string;
  readonly done_signal: boolean;
  readonly flag_proposals: readonly string[];
  readonly invocation_ref?: string;
  readonly frozen_refs: SeekerAdvocateFrozenRefs;
  readonly audit_refs: readonly string[];
}

export interface SeekerDimensionScore {
  readonly dimension_id: string;
  readonly score: number;
  readonly rationale: string;
  readonly evidence_refs?: readonly string[];
}

export interface SeekerAdvocateScoringResult {
  readonly run_id: string;
  readonly side: "seeker";
  readonly rubric_ref: RubricRef;
  readonly dimension_scores: readonly SeekerDimensionScore[];
  readonly headline_rationale: string;
  readonly flag_proposals: readonly string[];
  readonly ignored_holistic_score: number | null;
  readonly invocation_ref?: string;
  readonly frozen_refs: SeekerAdvocateFrozenRefs;
  readonly audit_refs: readonly string[];
}

export interface SeekerAdvocateRefusal {
  readonly run_id: string;
  readonly side: "seeker";
  readonly operation: SeekerAdvocateOperation;
  readonly reason_code: SeekerAdvocateReasonCode;
  readonly message: string;
  readonly affected_refs?: Record<string, unknown>;
  readonly audit_refs: readonly string[];
  readonly created_at: string;
}

export type SeekerTurnDecision =
  | { readonly ok: true; readonly result: SeekerAdvocateTurnResult }
  | { readonly ok: false; readonly refusal: SeekerAdvocateRefusal };

export type SeekerScoringDecision =
  | { readonly ok: true; readonly result: SeekerAdvocateScoringResult }
  | { readonly ok: false; readonly refusal: SeekerAdvocateRefusal };

export interface SeekerAdvocateScoreDraft {
  readonly dimension_scores: readonly SeekerDimensionScore[];
  readonly headline_rationale: string;
  readonly flag_proposals: readonly string[];
  readonly model_holistic_score?: number;
}

export interface SeekerAdvocateScoringInput extends SeekerAdvocateRunInput {
  readonly rubric: RubricVersion;
  readonly score_draft?: SeekerAdvocateScoreDraft;
}

export interface SeekerAdvocateEvalCase {
  readonly eval_case_id: string;
  readonly category:
    | "strong_match"
    | "weak_match"
    | "insufficient_evidence"
    | "privacy_attack"
    | "prompt_injection"
    | "unsupported_tool"
    | "budget_refusal";
  readonly expected_outcome: "accepted_turn" | "accepted_scoring" | "inconclusive" | "refusal";
  readonly actual_outcome:
    | "accepted_turn"
    | "accepted_scoring"
    | "inconclusive"
    | "refusal"
    | "failed";
  readonly required_reason_codes?: readonly string[];
  readonly expected_score_shape?: string;
  readonly privacy_attack_present?: boolean;
  readonly prompt_injection_present?: boolean;
  readonly budget_condition?: string;
  readonly pass: boolean;
  readonly evidence_refs: readonly string[];
}

export function auditRefsFromRecord(record: ModelInvocationRecord | null): readonly string[] {
  if (!record) return [];
  return [record.invocation_id, record.audit_event_id].filter((value): value is string =>
    Boolean(value),
  );
}
