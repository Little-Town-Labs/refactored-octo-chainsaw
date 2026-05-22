import { employerScoringInputFixture, employerScoreDraftFixture } from "../fixtures.js";
import { runEmployerAdvocateScoring } from "../employer-scoring.js";

describe("employer scoring decision content", () => {
  test("ignores holistic model score as regression evidence", async () => {
    const decision = await runEmployerAdvocateScoring(
      await employerScoringInputFixture({
        score_draft: employerScoreDraftFixture({ model_holistic_score: 9 }),
      }),
    );

    expect(decision.ok).toBe(true);
    if (!decision.ok) throw new Error(decision.refusal.reason_code);
    expect(decision.result.ignored_holistic_score).toBe(9);
  });

  test("refuses hire or reject decision content", async () => {
    const decision = await runEmployerAdvocateScoring(
      await employerScoringInputFixture({
        score_draft: employerScoreDraftFixture({ decision_content: ["recommend hire"] }),
      }),
    );

    expect(decision.ok).toBe(false);
    if (decision.ok) throw new Error("expected refusal");
    expect(decision.refusal.reason_code).toBe("decision_content_refused");
  });
});
