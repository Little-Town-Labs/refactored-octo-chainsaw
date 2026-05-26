import {
  DEFAULT_ALPHA_CONSENT_VERSION,
  PHASE_0_ALPHA_CONSENT_TEXT,
  evaluateAlphaConsent,
  recordAlphaConsent,
  withdrawAlphaConsent,
} from "../index.js";

const now = "2026-05-26T12:00:00.000Z";

describe("alpha consent", () => {
  it("records explicit seeker and employer consent", () => {
    const seeker = recordAlphaConsent({
      consent_id: "consent_1",
      participant_role: "seeker",
      principal_id: "principal_seeker",
      evidence_ref: "consent-form:v1",
      recorded_at: now,
    });
    const employer = recordAlphaConsent({
      consent_id: "consent_2",
      participant_role: "employer",
      principal_id: "principal_employer",
      org_id: "org_1",
      evidence_ref: "consent-form:v1",
      recorded_at: now,
    });

    expect(PHASE_0_ALPHA_CONSENT_TEXT).toContain("informational only");
    expect(evaluateAlphaConsent(seeker).decision).toBe("allow");
    expect(employer.org_id).toBe("org_1");
  });

  it("blocks missing, withdrawn, and version-mismatched consent", () => {
    const consent = recordAlphaConsent({
      consent_id: "consent_1",
      participant_role: "seeker",
      principal_id: "principal_seeker",
      evidence_ref: "consent-form:v1",
      recorded_at: now,
    });

    expect(evaluateAlphaConsent(undefined).reason_code).toBe("missing_consent");
    expect(evaluateAlphaConsent(withdrawAlphaConsent(consent, now)).reason_code).toBe(
      "withdrawn_consent",
    );
    expect(evaluateAlphaConsent(consent, `${DEFAULT_ALPHA_CONSENT_VERSION}-next`).reason_code).toBe(
      "version_mismatch",
    );
  });
});
