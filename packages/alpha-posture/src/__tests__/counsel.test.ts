import { evaluatePhaseTransitionEvidence, validateCounselEvidence } from "../index.js";

describe("counsel evidence", () => {
  it("fails closed without signed dated evidence", () => {
    expect(evaluatePhaseTransitionEvidence(undefined).reason_code).toBe("missing_counsel_evidence");
    expect(() =>
      validateCounselEvidence({
        evidence_id: "memo_1",
        phase: "phase_1",
        transition: "phase_0_to_phase_1",
        memo_path: "docs/memo.md",
        reviewer: "Counsel",
        signed: true,
        dated_on: "2026-05-26",
      }),
    ).toThrow();
  });

  it("accepts signed dated counsel memo evidence at the required path", () => {
    const evidence = validateCounselEvidence({
      evidence_id: "memo_1",
      phase: "phase_1",
      transition: "phase_0_to_phase_1",
      memo_path: ".specify/memory/counsel-reviews/2026-05-26-phase-0-to-1.md",
      reviewer: "Counsel",
      signed: true,
      dated_on: "2026-05-26",
    });

    expect(evaluatePhaseTransitionEvidence(evidence).decision).toBe("allow");
  });
});
