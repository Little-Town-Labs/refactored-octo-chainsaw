export const PRIVACY_AUDIENCES = ["seeker", "employer", "platform"] as const;
export type PrivacyAudience = (typeof PRIVACY_AUDIENCES)[number];

export const PRIVACY_RULESET_STATUSES = ["draft", "published", "deprecated"] as const;
export type PrivacyRulesetStatus = (typeof PRIVACY_RULESET_STATUSES)[number];

export const PRIVACY_INPUT_CLASSES = [
  "seeker_resume",
  "employer_req",
  "ats_import",
  "tool_returned",
  "a2a_received",
] as const;
export type PrivacyInputClass = (typeof PRIVACY_INPUT_CLASSES)[number];

export const PRIVACY_FILTER_DECISIONS = ["allow", "redact", "refuse"] as const;
export type PrivacyFilterDecisionKind = (typeof PRIVACY_FILTER_DECISIONS)[number];

export const PRIVACY_REASON_CODES = [
  "privacy_allowed",
  "privacy_redacted",
  "privacy_refused",
  "privacy_ruleset_missing",
  "privacy_ruleset_unpublished",
  "privacy_ruleset_invalid",
  "privacy_payload_oversized",
  "privacy_unsupported_input_class",
  "privacy_all_content_redacted",
  "sentinel_missing",
  "sentinel_mismatch",
  "sentinel_duplicate",
  "sentinel_injection_detected",
  "counterparty_access_bypass_detected",
] as const;
export type PrivacyReasonCode = (typeof PRIVACY_REASON_CODES)[number];

export type JsonObject = Record<string, unknown>;

export interface DisclosureStage {
  readonly stage: string;
  readonly order: number;
  readonly allowed_fields: readonly string[];
}

export interface PrivacyRedactionRule {
  readonly category: string;
  readonly pattern: string;
}

export interface PrivacyRefusalRule {
  readonly category: string;
  readonly reason_code: PrivacyReasonCode;
}

export interface PrivacyRulesetRef {
  readonly ruleset_id: string;
  readonly version: string;
}

export interface PrivacyRulesetVersion extends PrivacyRulesetRef {
  readonly privacy_ruleset_version_id: string;
  readonly audience: PrivacyAudience;
  readonly status: PrivacyRulesetStatus;
  readonly disclosure_stages: readonly DisclosureStage[];
  readonly allowed_fields: readonly string[];
  readonly redaction_rules: readonly PrivacyRedactionRule[];
  readonly refusal_rules: readonly PrivacyRefusalRule[];
  readonly max_input_chars: number;
  readonly content_hash: string;
  readonly audit_event_id: string | null;
  readonly published_at: Date | null;
  readonly deprecated_at: Date | null;
  readonly created_at: Date;
}

export type NewPrivacyRulesetVersion = Omit<
  PrivacyRulesetVersion,
  "privacy_ruleset_version_id" | "created_at"
> & {
  readonly privacy_ruleset_version_id?: string;
  readonly created_at?: Date;
};

export interface UntrustedInputEnvelope {
  readonly run_id: string;
  readonly nonce: string;
  readonly input_class: PrivacyInputClass;
  readonly source_ref: string;
  readonly wrapped_text: string;
  readonly content_hash: string;
}

export interface FilteredProjection {
  readonly filtered_view_ref: string;
  readonly run_id: string;
  readonly audience: PrivacyAudience;
  readonly disclosure_stage: string;
  readonly ruleset_ref: PrivacyRulesetRef;
  readonly output: JsonObject;
  readonly redaction_summary: Readonly<Record<string, number>>;
  readonly created_at: Date;
}

export interface FilterDecision {
  readonly filter_decision_id: string;
  readonly run_id: string;
  readonly ruleset_id: string;
  readonly ruleset_version: string;
  readonly audience: PrivacyAudience;
  readonly disclosure_stage: string;
  readonly decision: PrivacyFilterDecisionKind;
  readonly reason_code: PrivacyReasonCode;
  readonly redaction_summary: Readonly<Record<string, number>>;
  readonly source_content_hash: string;
  readonly filtered_view_ref: string | null;
  readonly audit_event_id: string | null;
  readonly created_at: Date;
}

export type NewFilterDecision = Omit<FilterDecision, "filter_decision_id" | "created_at"> & {
  readonly filter_decision_id?: string;
  readonly created_at?: Date;
};

export interface SentinelFailure {
  readonly sentinel_failure_id: string;
  readonly run_id: string;
  readonly input_class: PrivacyInputClass;
  readonly reason_code: PrivacyReasonCode;
  readonly source_content_hash: string;
  readonly audit_event_id: string | null;
  readonly created_at: Date;
}

export type NewSentinelFailure = Omit<SentinelFailure, "sentinel_failure_id" | "created_at"> & {
  readonly sentinel_failure_id?: string;
  readonly created_at?: Date;
};

export interface CounterpartyAccessFinding {
  readonly finding_id: string;
  readonly source_path: string;
  readonly forbidden_access: string;
  readonly detected_by: string;
  readonly status: "open" | "resolved" | "expected_fixture";
  readonly audit_event_id: string | null;
  readonly created_at: Date;
}

export type NewCounterpartyAccessFinding = Omit<
  CounterpartyAccessFinding,
  "finding_id" | "created_at"
> & {
  readonly finding_id?: string;
  readonly created_at?: Date;
};

export interface PrivacyPrincipal {
  readonly principal_id: string;
  readonly scopes: readonly string[];
}

export interface PrivacyFilterInput {
  readonly run_id: string;
  readonly ruleset_ref: PrivacyRulesetRef;
  readonly audience: PrivacyAudience;
  readonly disclosure_stage?: string;
  readonly input_class: PrivacyInputClass;
  readonly source_ref: string;
  readonly content: JsonObject;
  readonly audit_event_id?: string | null;
}

export interface PrivacyFilterOutput {
  readonly decision: FilterDecision;
  readonly projection: FilteredProjection | null;
}
