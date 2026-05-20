export const RUBRIC_SIDES = ["seeker", "employer", "both"] as const;
export type RubricSide = (typeof RUBRIC_SIDES)[number];

export const RUBRIC_STATUSES = ["draft", "published", "deprecated", "retired"] as const;
export type RubricStatus = (typeof RUBRIC_STATUSES)[number];

export const RUBRIC_EVENT_TYPES = ["published", "deprecated"] as const;
export type RubricEventType = (typeof RUBRIC_EVENT_TYPES)[number];

export const RUBRIC_EVENT_REASON_CODES = [
  "initial_launch",
  "policy_update",
  "bias_methodology_update",
  "dimension_update",
  "weight_update",
  "compliance_deprecation",
] as const;
export type RubricEventReasonCode = (typeof RUBRIC_EVENT_REASON_CODES)[number];

export const BIAS_TEST_STATUSES = [
  "draft",
  "completed",
  "rejected",
  "superseded",
  "expired",
] as const;
export type BiasTestStatus = (typeof BIAS_TEST_STATUSES)[number];

export const RUBRIC_GATE_DECISIONS = ["allow", "deny"] as const;
export type RubricGateDecision = (typeof RUBRIC_GATE_DECISIONS)[number];

export const RUBRIC_GATE_REASON_CODES = [
  "rubric_gate_allowed",
  "rubric_missing",
  "rubric_unpublished",
  "rubric_deprecated",
  "rubric_invalid",
  "rubric_missing_bias_test",
  "rubric_bias_test_incomplete",
  "rubric_bias_test_mismatched_hash",
  "rubric_bias_test_expired",
  "rubric_bias_test_insufficient_coverage",
] as const;
export type RubricGateReasonCode = (typeof RUBRIC_GATE_REASON_CODES)[number];

export interface RubricRef {
  readonly rubric_id: string;
  readonly version: string;
}

export interface RubricDimension {
  readonly dimension_id: string;
  readonly label: string;
  readonly description: string;
  readonly min_score: number;
  readonly max_score: number;
  readonly weight: number;
  readonly evidence_expectations?: string;
  readonly required: boolean;
}

export interface RubricAggregationPolicy {
  readonly kind: "weighted_sum";
  readonly weight_normalization: "sum_to_one";
  readonly rounding: "half_away_from_zero_4dp";
}

export interface BiasTestRef {
  readonly bias_test_artifact_id: string;
}

export interface RubricVersion {
  readonly rubric_version_id: string;
  readonly rubric_id: string;
  readonly version: string;
  readonly side: RubricSide;
  readonly status: RubricStatus;
  readonly dimensions: readonly RubricDimension[];
  readonly aggregation_policy: RubricAggregationPolicy;
  readonly bias_test_ref: BiasTestRef | null;
  readonly content_hash: string;
  readonly description: string;
  readonly author_principal_id: string;
  readonly reviewer_principal_id: string | null;
  readonly published_at: Date | null;
  readonly deprecated_after: Date | null;
  readonly audit_event_id: string | null;
  readonly created_at: Date;
}

export type NewRubricVersion = Omit<RubricVersion, "rubric_version_id" | "created_at"> & {
  readonly rubric_version_id?: string;
  readonly created_at?: Date;
};

export interface BiasTestMethodologyRef {
  readonly methodology_id: string;
  readonly version: string;
}

export interface BiasTestArtifact {
  readonly bias_test_artifact_id: string;
  readonly rubric_id: string;
  readonly rubric_version: string;
  readonly rubric_content_hash: string;
  readonly methodology_ref: BiasTestMethodologyRef;
  readonly status: BiasTestStatus;
  readonly jurisdiction_coverage: readonly string[];
  readonly reviewer_principal_id: string | null;
  readonly completed_at: Date | null;
  readonly expires_at: Date | null;
  readonly artifact_uri: string | null;
  readonly audit_event_id: string | null;
  readonly created_at: Date;
}

export type NewBiasTestArtifact = Omit<BiasTestArtifact, "created_at"> & {
  readonly created_at?: Date;
};

export interface RubricEvent {
  readonly rubric_event_id: string;
  readonly rubric_version_id: string;
  readonly event_type: RubricEventType;
  readonly reason_code: RubricEventReasonCode;
  readonly principal_id: string;
  readonly reviewer_principal_id: string | null;
  readonly correlation_id: string;
  readonly audit_event_id: string;
  readonly created_at: Date;
}

export type NewRubricEvent = Omit<RubricEvent, "rubric_event_id" | "created_at"> & {
  readonly rubric_event_id?: string;
  readonly created_at?: Date;
};

export interface RubricDispatchGateEvent {
  readonly gate_event_id: string;
  readonly rubric_id: string;
  readonly rubric_version: string;
  readonly decision: RubricGateDecision;
  readonly reason_code: RubricGateReasonCode;
  readonly bias_test_artifact_id: string | null;
  readonly audit_event_id: string;
  readonly correlation_id: string;
  readonly created_at: Date;
}

export type NewRubricDispatchGateEvent = Omit<
  RubricDispatchGateEvent,
  "gate_event_id" | "created_at"
> & {
  readonly gate_event_id?: string;
  readonly created_at?: Date;
};

export interface RubricDispatchGateResult {
  readonly decision: RubricGateDecision;
  readonly reason_code: RubricGateReasonCode;
  readonly rubric_ref: RubricRef;
  readonly rubric: RubricVersion | null;
  readonly bias_test_artifact: BiasTestArtifact | null;
  readonly audit_event_id?: string;
  readonly checked_at: Date;
}

export interface DimensionScore {
  readonly dimension_id: string;
  readonly score: number;
}

export interface NormalizedWeight {
  readonly dimension_id: string;
  readonly weight: number;
}

export interface WeightedScoreResult {
  readonly rubric_id: string;
  readonly rubric_version: string;
  readonly dimension_scores: readonly DimensionScore[];
  readonly normalized_weights: readonly NormalizedWeight[];
  readonly total_score: number;
  readonly rounding_policy: "half_away_from_zero_4dp";
  readonly model_holistic_score_ignored: boolean;
  readonly regression_signal_ref?: string;
}
