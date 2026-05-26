import {
  applyAlphaDossierPosture,
  evaluateAlphaOutreachGate,
  recordAlphaConsent,
} from "../index.js";

const now = "2026-05-26T12:00:00.000Z";
const seekerConsent = recordAlphaConsent({
  consent_id: "consent_s",
  participant_role: "seeker",
  principal_id: "seeker_1",
  evidence_ref: "consent:v1",
  recorded_at: now,
});
const employerConsent = recordAlphaConsent({
  consent_id: "consent_e",
  participant_role: "employer",
  principal_id: "employer_1",
  org_id: "org_1",
  evidence_ref: "consent:v1",
  recorded_at: now,
});
const humanReview = {
  review_id: "review_1",
  match_id: "match_1",
  dossier_id: "dossier_1",
  reviewer_principal_id: "operator_1",
  decision: "approved" as const,
  reason: "Informational alpha outreach only",
  evidence_ref: "review:1",
  reviewed_at: now,
};

describe("alpha outreach gate", () => {
  it("blocks without human review or with rejected review", () => {
    const dossierPayload = applyAlphaDossierPosture({ dossier_id: "dossier_1" }, now);
    expect(
      evaluateAlphaOutreachGate({ seekerConsent, employerConsent, dossierPayload }).reason_code,
    ).toBe("missing_human_review");
    expect(
      evaluateAlphaOutreachGate({
        seekerConsent,
        employerConsent,
        dossierPayload,
        humanReview: { ...humanReview, decision: "rejected" },
      }).reason_code,
    ).toBe("human_review_rejected");
  });

  it("allows only when consent, dossier posture, and approved review are present", () => {
    const dossierPayload = applyAlphaDossierPosture({ dossier_id: "dossier_1" }, now);
    expect(
      evaluateAlphaOutreachGate({
        seekerConsent,
        employerConsent,
        dossierPayload,
        humanReview,
      }).decision,
    ).toBe("allow");
  });
});
