import {
  DEFAULT_ALPHA_CONSENT_VERSION,
  type AlphaConsentRecord,
  type AlphaParticipantRole,
  type AlphaPostureGateResult,
} from "./types.js";

export const PHASE_0_ALPHA_CONSENT_TEXT =
  "Spyglass Phase 0 is a private alpha shakedown. Outputs are informational only and are not production hiring decisions.";

export function recordAlphaConsent(input: {
  consent_id: string;
  participant_role: AlphaParticipantRole;
  principal_id: string;
  org_id?: string;
  evidence_ref: string;
  consent_version?: string;
  recorded_at: string;
}): AlphaConsentRecord {
  return {
    consent_id: input.consent_id,
    participant_role: input.participant_role,
    principal_id: input.principal_id,
    ...(input.org_id ? { org_id: input.org_id } : {}),
    consent_version: input.consent_version ?? DEFAULT_ALPHA_CONSENT_VERSION,
    state: "consented",
    evidence_ref: input.evidence_ref,
    recorded_at: input.recorded_at,
  };
}

export function withdrawAlphaConsent(
  record: AlphaConsentRecord,
  withdrawnAt: string,
): AlphaConsentRecord {
  return { ...record, state: "withdrawn", withdrawn_at: withdrawnAt };
}

export function evaluateAlphaConsent(
  record: AlphaConsentRecord | undefined,
  requiredVersion = DEFAULT_ALPHA_CONSENT_VERSION,
  checkedAt = new Date().toISOString(),
): AlphaPostureGateResult {
  if (!record) return { decision: "block", reason_code: "missing_consent", checked_at: checkedAt };
  if (record.state !== "consented") {
    return { decision: "block", reason_code: "withdrawn_consent", checked_at: checkedAt };
  }
  if (record.consent_version !== requiredVersion) {
    return { decision: "block", reason_code: "version_mismatch", checked_at: checkedAt };
  }
  return { decision: "allow", reason_code: "alpha_posture_allowed", checked_at: checkedAt };
}
