import { counselEvidenceReferenceSchema } from "./schemas.js";
import type { AlphaPostureGateResult, CounselEvidenceReference } from "./types.js";

export function validateCounselEvidence(
  evidence: CounselEvidenceReference,
): CounselEvidenceReference {
  counselEvidenceReferenceSchema.parse(evidence);
  return evidence;
}

export function evaluatePhaseTransitionEvidence(
  evidence: CounselEvidenceReference | undefined,
  checkedAt = new Date().toISOString(),
): AlphaPostureGateResult {
  if (!evidence) {
    return { decision: "block", reason_code: "missing_counsel_evidence", checked_at: checkedAt };
  }
  validateCounselEvidence(evidence);
  return { decision: "allow", reason_code: "alpha_posture_allowed", checked_at: checkedAt };
}
