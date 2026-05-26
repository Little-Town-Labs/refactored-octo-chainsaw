import { evaluateAlphaConsent } from "./consent.js";
import { evaluateDossierPosture } from "./dossier.js";
import type {
  AlphaConsentRecord,
  AlphaHumanReviewRecord,
  AlphaPostureGateResult,
} from "./types.js";

export function evaluateAlphaOutreachGate(input: {
  seekerConsent?: AlphaConsentRecord;
  employerConsent?: AlphaConsentRecord;
  dossierPayload: Record<string, unknown>;
  humanReview?: AlphaHumanReviewRecord;
  checkedAt?: string;
}): AlphaPostureGateResult {
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const seeker = evaluateAlphaConsent(input.seekerConsent, undefined, checkedAt);
  if (seeker.decision === "block") return seeker;
  const employer = evaluateAlphaConsent(input.employerConsent, undefined, checkedAt);
  if (employer.decision === "block") return employer;
  const dossier = evaluateDossierPosture(input.dossierPayload, checkedAt);
  if (dossier.decision === "block") return dossier;
  if (!input.humanReview) {
    return { decision: "block", reason_code: "missing_human_review", checked_at: checkedAt };
  }
  if (input.humanReview.decision !== "approved") {
    return { decision: "block", reason_code: "human_review_rejected", checked_at: checkedAt };
  }
  return { decision: "allow", reason_code: "alpha_posture_allowed", checked_at: checkedAt };
}
