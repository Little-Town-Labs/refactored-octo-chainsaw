export const ALPHA_PHASE = "phase_0_alpha" as const;
export const ALPHA_BANNER = "alpha - informational only" as const;
export const DEFAULT_ALPHA_CONSENT_VERSION = "phase-0-alpha-consent-v1" as const;
export const DEFAULT_ALPHA_POSTURE_VERSION = "phase-0-alpha-posture-v1" as const;

export type AlphaParticipantRole = "seeker" | "employer";
export type AlphaConsentState = "consented" | "declined" | "withdrawn" | "expired";
export type HumanReviewDecision = "approved" | "rejected" | "needs_changes";
export type AlphaGateDecision = "allow" | "block";

export interface AlphaConsentRecord {
  readonly consent_id: string;
  readonly participant_role: AlphaParticipantRole;
  readonly principal_id: string;
  readonly org_id?: string;
  readonly consent_version: string;
  readonly state: AlphaConsentState;
  readonly evidence_ref: string;
  readonly recorded_at: string;
  readonly withdrawn_at?: string;
}

export interface AlphaDossierPosture {
  readonly phase: typeof ALPHA_PHASE;
  readonly banner: typeof ALPHA_BANNER;
  readonly posture_version: string;
  readonly non_production_decision: true;
  readonly applied_at: string;
}

export type AlphaPosturedPayload<T extends Record<string, unknown> = Record<string, unknown>> =
  T & {
    readonly alpha_posture: AlphaDossierPosture;
  };

export interface AlphaHumanReviewRecord {
  readonly review_id: string;
  readonly match_id: string;
  readonly dossier_id: string;
  readonly reviewer_principal_id: string;
  readonly decision: HumanReviewDecision;
  readonly reason: string;
  readonly evidence_ref: string;
  readonly reviewed_at: string;
}

export interface CounselEvidenceReference {
  readonly evidence_id: string;
  readonly phase: "phase_0" | "phase_1";
  readonly transition: "phase_0_to_phase_1" | "phase_0_entry";
  readonly memo_path: string;
  readonly reviewer: string;
  readonly signed: boolean;
  readonly dated_on: string;
  readonly evidence_hash?: string;
}

export interface AlphaPostureGateResult {
  readonly decision: AlphaGateDecision;
  readonly reason_code:
    | "alpha_posture_allowed"
    | "missing_consent"
    | "withdrawn_consent"
    | "version_mismatch"
    | "missing_dossier_posture"
    | "missing_human_review"
    | "human_review_rejected"
    | "missing_counsel_evidence";
  readonly checked_at: string;
  readonly metadata?: Record<string, unknown>;
}
