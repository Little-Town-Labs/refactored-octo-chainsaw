import { employerRubricFixture, employerScoringInputFixture } from "../fixtures.js";
import { runEmployerAdvocateScoring, validateEmployerRubricBiasGate } from "../employer-scoring.js";

describe("employer scoring bias gate", () => {
  test("rejects employer rubrics without bias-test evidence", async () => {
    const rubric = employerRubricFixture({ bias_test_ref: null });
    const decision = await runEmployerAdvocateScoring(
      await employerScoringInputFixture({ rubric }),
    );

    expect(decision.ok).toBe(false);
    if (decision.ok) throw new Error("expected refusal");
    expect(decision.refusal.reason_code).toBe("rubric_bias_gate_missing");
  });

  test("validates employer side rubric", () => {
    expect(validateEmployerRubricBiasGate(employerRubricFixture())).toEqual({ ok: true });
  });
});
