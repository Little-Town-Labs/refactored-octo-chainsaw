export const DOSSIER_AUDIENCES = ["seeker", "employer", "auditor", "a2a_receiver"] as const;
export type DossierAudience = (typeof DOSSIER_AUDIENCES)[number];

export const DOSSIER_STATUSES = ["conclusive", "inconclusive"] as const;
export type DossierStatus = (typeof DOSSIER_STATUSES)[number];

export const DOSSIER_SIDES = ["seeker", "employer"] as const;
export type DossierSide = (typeof DOSSIER_SIDES)[number];

export const INCONCLUSIVE_REASON_CODES = [
  "timed_out",
  "tool_failure",
  "projection_missing",
  "scoring_gap",
  "policy_blocked",
  "insufficient_evidence",
] as const;
export type InconclusiveReasonCode = (typeof INCONCLUSIVE_REASON_CODES)[number];

export const DOSSIER_REASON_CODES = [
  "dossier_built",
  "dossier_inconclusive",
  "signature_valid",
  "signature_invalid",
  "unknown_key",
  "signing_disabled",
  "missing_projection",
  "invalid_payload",
  "inconclusive",
] as const;
export type DossierReasonCode = (typeof DOSSIER_REASON_CODES)[number];

export type JsonObject = Record<string, unknown>;

export interface VersionRef {
  readonly id: string;
  readonly version: string;
}

export interface PrivacyRulesetRef {
  readonly ruleset_id: string;
  readonly version: string;
}

export interface DossierProjectionInput {
  readonly audience: DossierAudience;
  readonly disclosure_stage: string;
  readonly ruleset_ref: PrivacyRulesetRef;
  readonly payload: JsonObject;
}

export interface DossierProjection extends DossierProjectionInput {
  readonly projection_id: string;
  readonly dossier_id: string;
  readonly payload_hash: string;
  readonly created_at: Date;
}

export type NewDossierProjection = Omit<DossierProjection, "projection_id" | "created_at"> & {
  readonly projection_id?: string;
  readonly created_at?: Date;
};

export interface RubricDimensionBreakdown {
  readonly dimension_id: string;
  readonly score: number;
  readonly weight: number;
  readonly weighted_score: number;
  readonly reason_ref?: string;
}

export interface RubricBreakdown {
  readonly side: DossierSide;
  readonly rubric_id: string;
  readonly rubric_version: string;
  readonly dimensions: readonly RubricDimensionBreakdown[];
  readonly total: number;
}

export interface InconclusiveFlag {
  readonly reason_code: InconclusiveReasonCode;
  readonly source_ref: string;
  readonly resolution_hint: string;
}

export interface DossierSignature {
  readonly signature_id: string;
  readonly dossier_id: string;
  readonly algorithm: "Ed25519";
  readonly kid: string;
  readonly canonicalization_version: string;
  readonly signed_content_hash: string;
  readonly signature: string;
  readonly signed_at: Date;
  readonly audit_event_id: string | null;
  readonly created_at: Date;
}

export type NewDossierSignature = Omit<DossierSignature, "signature_id" | "created_at"> & {
  readonly signature_id?: string;
  readonly created_at?: Date;
};

export interface DossierArtifact {
  readonly dossier_id: string;
  readonly run_id: string;
  readonly match_id: string;
  readonly status: DossierStatus;
  readonly contract_refs: Readonly<Record<string, { contract_id: string; version: string }>>;
  readonly privacy_ruleset_refs: readonly PrivacyRulesetRef[];
  readonly harness_version: string;
  readonly model_invocation_refs: readonly string[];
  readonly rubric_breakdowns: readonly RubricBreakdown[];
  readonly rationales: Readonly<Record<DossierSide, string>>;
  readonly reconciled_flags: readonly JsonObject[];
  readonly inconclusive_flags: readonly InconclusiveFlag[];
  readonly projection_refs: Readonly<Record<DossierAudience, string>>;
  readonly content_hash: string;
  readonly signature: DossierSignature | null;
  readonly audit_event_id: string | null;
  readonly created_at: Date;
}

export type NewDossierArtifact = Omit<DossierArtifact, "dossier_id" | "created_at"> & {
  readonly dossier_id?: string;
  readonly created_at?: Date;
};

export interface DossierBuildInput {
  readonly run_id: string;
  readonly match_id: string;
  readonly status: DossierStatus;
  readonly contract_refs: DossierArtifact["contract_refs"];
  readonly harness_version: string;
  readonly model_invocation_refs: readonly string[];
  readonly rubric_breakdowns: readonly RubricBreakdown[];
  readonly rationales: DossierArtifact["rationales"];
  readonly reconciled_flags: readonly JsonObject[];
  readonly inconclusive_flags?: readonly InconclusiveFlag[];
  readonly projections: readonly DossierProjectionInput[];
  readonly audit_event_id?: string | null;
}

export interface VerificationResult {
  readonly verification_id: string;
  readonly dossier_id: string;
  readonly decision: "valid" | "invalid";
  readonly reason_code: DossierReasonCode;
  readonly kid: string | null;
  readonly content_hash: string;
  readonly audit_event_id: string | null;
  readonly created_at: Date;
}

export type NewVerificationResult = Omit<VerificationResult, "verification_id" | "created_at"> & {
  readonly verification_id?: string;
  readonly created_at?: Date;
};

export interface DossierPrincipal {
  readonly principal_id: string;
  readonly scopes: readonly string[];
}
