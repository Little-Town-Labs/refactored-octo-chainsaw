export const AI_VERSION_STATUSES = [
  "draft",
  "published",
  "deprecated",
  "retired",
  "superseded",
] as const;
export type AiVersionStatus = (typeof AI_VERSION_STATUSES)[number];

export const MODEL_CAPABILITY_CLASSES = [
  "chat",
  "reasoning",
  "embedding",
  "classification",
  "evaluation",
] as const;
export type ModelCapabilityClass = (typeof MODEL_CAPABILITY_CLASSES)[number];

export const RISK_TIERS = ["low", "medium", "high"] as const;
export type RiskTier = (typeof RISK_TIERS)[number];

export const AI_RUNTIME_MANIFEST_STATUSES = [
  "draft",
  "active",
  "superseded",
  "retired",
  "revoked",
] as const;
export type AiRuntimeManifestStatus = (typeof AI_RUNTIME_MANIFEST_STATUSES)[number];

export const MODEL_INVOCATION_STATUSES = [
  "accepted",
  "refused",
  "completed",
  "failed",
  "usage_incomplete",
] as const;
export type ModelInvocationStatus = (typeof MODEL_INVOCATION_STATUSES)[number];

export const MODEL_INVOCATION_DECISIONS = ["allowed", "refused", "downgraded"] as const;
export type ModelInvocationDecision = (typeof MODEL_INVOCATION_DECISIONS)[number];

export const AI_OPERATION_REASON_CODES = [
  "missing_required_ref",
  "unauthorized_caller",
  "prompt_not_published",
  "model_not_published",
  "manifest_not_active",
  "manifest_signature_invalid",
  "provider_not_allowed",
  "model_not_allowed",
  "budget_preflight_exceeded",
  "budget_fallback_unavailable",
  "prompt_variable_missing",
  "prompt_variable_unexpected",
  "unsafe_prompt_variable",
  "rubric_policy_in_prompt",
  "audit_unavailable",
  "gateway_unavailable",
  "usage_metadata_missing",
  "unscoped_review",
] as const;
export type AiOperationReasonCode = (typeof AI_OPERATION_REASON_CODES)[number];

export type AiOperation =
  | "publish_prompt"
  | "publish_model"
  | "publish_manifest"
  | "render_prompt"
  | "invoke_model"
  | "review_read";

export interface PromptRef {
  readonly prompt_id: string;
  readonly version: string;
}

export interface ModelRef {
  readonly model_profile_id: string;
  readonly version: string;
}

export interface ManifestRef {
  readonly manifest_id: string;
  readonly version: string;
}

export type TrustClass =
  | "trusted_system"
  | "trusted_policy"
  | "untrusted_candidate"
  | "untrusted_employer"
  | "untrusted_tool";

export interface PromptVariableContract {
  readonly name: string;
  readonly value_type: "string" | "number" | "boolean" | "object" | "array";
  readonly required: boolean;
  readonly trust_class: TrustClass;
  readonly sentinel_required?: boolean;
}

export interface PromptVersion {
  readonly prompt_version_id: string;
  readonly prompt_id: string;
  readonly version: string;
  readonly status: AiVersionStatus;
  readonly purpose: string;
  readonly template_ref: string;
  readonly template: string;
  readonly content_hash: string;
  readonly variable_contract: readonly PromptVariableContract[];
  readonly allowed_scopes: readonly string[];
  readonly rubric_boundary: "no_rubric_weights" | "no_scoring_policy";
  readonly release_manifest_ref: string | null;
  readonly signature_ref: string | null;
  readonly published_by: string | null;
  readonly published_at: Date | null;
  readonly audit_event_id: string | null;
  readonly created_at: Date;
}

export type NewPromptVersion = Omit<PromptVersion, "prompt_version_id" | "created_at"> & {
  readonly prompt_version_id?: string;
  readonly created_at?: Date;
};

export interface ModelCostMetadata {
  readonly pricing_ref: string;
  readonly unit: "token" | "request" | "character";
  readonly input_unit_cost?: number;
  readonly output_unit_cost?: number;
  readonly request_unit_cost?: number;
  readonly captured_at: Date;
}

export interface ModelProfileVersion {
  readonly model_profile_version_id: string;
  readonly model_profile_id: string;
  readonly version: string;
  readonly status: AiVersionStatus;
  readonly provider: string;
  readonly model: string;
  readonly capability_class: ModelCapabilityClass;
  readonly risk_tier: RiskTier;
  readonly allowed_scopes: readonly string[];
  readonly cost_metadata: ModelCostMetadata;
  readonly supply_chain_evidence: readonly string[];
  readonly release_manifest_ref: string | null;
  readonly signature_ref: string | null;
  readonly published_by: string | null;
  readonly published_at: Date | null;
  readonly audit_event_id: string | null;
  readonly created_at: Date;
}

export type NewModelProfileVersion = Omit<
  ModelProfileVersion,
  "model_profile_version_id" | "created_at"
> & {
  readonly model_profile_version_id?: string;
  readonly created_at?: Date;
};

export interface CostControlPolicy {
  readonly scope: "run" | "match" | "caller" | "manifest" | "release";
  readonly ceiling: number;
  readonly unit: string;
  readonly on_preflight_exceeded: "refuse" | "downgrade";
  readonly fallback_model_ref?: ModelRef;
}

export interface AiRuntimeManifest {
  readonly runtime_manifest_id: string;
  readonly manifest_id: string;
  readonly version: string;
  readonly status: AiRuntimeManifestStatus;
  readonly deployment_scope: string;
  readonly prompt_refs: readonly PromptRef[];
  readonly model_refs: readonly ModelRef[];
  readonly caller_scopes: readonly string[];
  readonly provider_allowlist: readonly string[];
  readonly cost_controls: readonly CostControlPolicy[];
  readonly fallback_policy: "none" | "refuse" | "manifest_authorized";
  readonly no_hot_reload: true;
  readonly content_hash: string;
  readonly signature_ref: string;
  readonly published_by: string | null;
  readonly published_at: Date | null;
  readonly audit_event_id: string | null;
  readonly created_at: Date;
}

export type NewAiRuntimeManifest = Omit<AiRuntimeManifest, "runtime_manifest_id" | "created_at"> & {
  readonly runtime_manifest_id?: string;
  readonly created_at?: Date;
};

export interface UsageMetadata {
  readonly input_tokens?: number;
  readonly output_tokens?: number;
  readonly total_tokens?: number;
  readonly requests?: number;
}

export interface CostEvidence {
  readonly estimated_cost: number;
  readonly actual_cost: number | null;
  readonly pricing_ref: string;
  readonly ceiling: number | null;
  readonly decision: ModelInvocationDecision;
}

export interface ModelInvocationRecord {
  readonly invocation_id: string;
  readonly status: ModelInvocationStatus;
  readonly caller_principal_id: string;
  readonly caller_scope: string;
  readonly run_ref: string;
  readonly purpose: string;
  readonly prompt_ref: PromptRef;
  readonly model_ref: ModelRef;
  readonly manifest_ref: ManifestRef;
  readonly request_hash: string;
  readonly rendered_prompt_hash: string | null;
  readonly response_hash: string | null;
  readonly usage_metadata: UsageMetadata | null;
  readonly cost_evidence: CostEvidence | null;
  readonly decision: ModelInvocationDecision;
  readonly reason_code: AiOperationReasonCode | "invocation_completed";
  readonly started_at: Date;
  readonly completed_at: Date | null;
  readonly audit_event_id: string | null;
  readonly created_at: Date;
}

export type NewModelInvocationRecord = Omit<
  ModelInvocationRecord,
  "invocation_id" | "created_at"
> & {
  readonly invocation_id?: string;
  readonly created_at?: Date;
};

export interface AiOperationRefusal {
  readonly operation: AiOperation;
  readonly reason_code: AiOperationReasonCode;
  readonly message: string;
  readonly refs?: Record<string, unknown>;
  readonly audit_event_id?: string | null;
}

export interface ScopedAiPrincipal {
  readonly principal_id: string;
  readonly principal_kind: "human" | "agent" | "service";
  readonly scopes: readonly string[];
}

export const AI_PUBLISH_SCOPE = "ai:publish";
export const AI_INVOKE_SCOPE = "ai:invoke";
export const AI_REVIEW_SCOPE = "ai:review";
