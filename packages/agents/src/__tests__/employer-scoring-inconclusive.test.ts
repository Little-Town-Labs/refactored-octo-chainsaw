import { employerContextFixture, employerScoringInputFixture } from "../fixtures.js";
import { runEmployerAdvocateScoring } from "../employer-scoring.js";

describe("employer scoring inconclusive flags", () => {
  test("normalizes missing rubric scratch to insufficient evidence flags", async () => {
    const decision = await runEmployerAdvocateScoring(
      await employerScoringInputFixture({
        score_draft: undefined,
        context: employerContextFixture({ rubric_scratch: {} }),
      }),
    );

    expect(decision.ok).toBe(false);
    if (decision.ok) throw new Error("expected invalid dimensions");
    expect(decision.refusal.reason_code).toBe("scoring_dimensions_invalid");
  });
});
