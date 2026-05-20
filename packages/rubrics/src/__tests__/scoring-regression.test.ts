import { publishRubricVersion } from "../publish.js";
import { computeWeightedScore } from "../scoring.js";
import { MemoryRubricRepository, OPERATOR_ID, rubricMaterial } from "./fixtures.js";

describe("model holistic score regression signal", () => {
  test("ignores model holistic score for final total", async () => {
    const rubric = await publishRubricVersion(new MemoryRubricRepository(), {
      ...rubricMaterial(),
      author_principal_id: OPERATOR_ID,
    });

    const result = computeWeightedScore({
      rubric,
      dimensionScores: [
        { dimension_id: "skills", score: 4 },
        { dimension_id: "availability", score: 5 },
      ],
      modelHolisticScore: 1,
    });

    expect(result.total_score).toBe(4.3333);
    expect(result.model_holistic_score_ignored).toBe(true);
    expect(result.regression_signal_ref).toMatch(/^holistic-score:/);
  });
});
