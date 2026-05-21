import { scoringOutputToDossierBreakdown } from "../scoring.js";
import { testRubric } from "./fixtures.js";

describe("scoring adapter", () => {
  it("computes deterministic weighted dossier breakdowns and ignores holistic scores", () => {
    const rubric = testRubric({ rubric_id: "seeker.standard", side: "seeker" });
    const breakdown = scoringOutputToDossierBreakdown({
      side: "seeker",
      rubric,
      output: {
        dimension_scores: [
          { dimension_id: "fit", score: 9, rationale: "strong" },
          { dimension_id: "timing", score: 7, rationale: "soon" },
        ],
        headline_rationale: "Strong fit.",
        flag_proposals: [],
        model_holistic_score: 1,
      },
    });

    expect(breakdown.total).toBe(8);
    expect(breakdown.dimensions.map((dimension) => dimension.weighted_score)).toEqual([4.5, 3.5]);
  });
});
