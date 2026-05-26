import {
  ALPHA_BANNER,
  applyAlphaDossierPosture,
  evaluateDossierPosture,
  hasAlphaDossierPosture,
} from "../index.js";

describe("alpha dossier posture", () => {
  it("adds informational-only posture metadata to dossier payloads", () => {
    const payload = applyAlphaDossierPosture(
      { dossier_id: "dossier_1" },
      "2026-05-26T12:00:00.000Z",
    );

    expect(payload.alpha_posture.banner).toBe(ALPHA_BANNER);
    expect(payload.alpha_posture.non_production_decision).toBe(true);
    expect(evaluateDossierPosture(payload).decision).toBe("allow");
  });

  it("is idempotent and refuses unmarked payloads", () => {
    const payload = applyAlphaDossierPosture({ dossier_id: "dossier_1" });
    expect(applyAlphaDossierPosture(payload)).toBe(payload);
    expect(hasAlphaDossierPosture({ dossier_id: "dossier_1" })).toBe(false);
    expect(evaluateDossierPosture({ dossier_id: "dossier_1" }).reason_code).toBe(
      "missing_dossier_posture",
    );
  });
});
