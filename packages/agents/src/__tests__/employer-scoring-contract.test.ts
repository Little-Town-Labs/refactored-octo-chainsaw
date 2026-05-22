import { employerScoringInputFixture } from "../fixtures.js";
import { runEmployerAdvocateScoring } from "../employer-scoring.js";

describe("employer scoring contract", () => {
  test("returns accepted scoring with one entry per employer rubric dimension", async () => {
    const decision = await runEmployerAdvocateScoring(await employerScoringInputFixture());

    expect(decision.ok).toBe(true);
    if (!decision.ok) throw new Error(decision.refusal.reason_code);
    expect(decision.result.side).toBe("employer");
    expect(decision.result.dimension_scores).toHaveLength(2);
    expect(decision.result.invocation_ref).toBeDefined();
  });
});
