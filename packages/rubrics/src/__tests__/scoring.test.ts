import { publishRubricVersion } from "../publish.js";
import { computeWeightedScore } from "../scoring.js";
import { MemoryRubricRepository, OPERATOR_ID, rubricMaterial } from "./fixtures.js";

describe("deterministic weighted scoring", () => {
  test("computes reproducible weighted totals", async () => {
    const rubric = await publishRubricVersion(new MemoryRubricRepository(), {
      ...rubricMaterial(),
      author_principal_id: OPERATOR_ID,
    });

    const input = {
      rubric,
      dimensionScores: [
        { dimension_id: "skills", score: 4 },
        { dimension_id: "availability", score: 5 },
      ],
    };

    expect(computeWeightedScore(input)).toMatchObject({
      total_score: 4.3333,
      normalized_weights: [
        { dimension_id: "skills", weight: 2 / 3 },
        { dimension_id: "availability", weight: 1 / 3 },
      ],
      model_holistic_score_ignored: false,
    });
    expect(computeWeightedScore(input).total_score).toBe(computeWeightedScore(input).total_score);
  });

  test("fails closed for missing or out-of-range scores", async () => {
    const rubric = await publishRubricVersion(new MemoryRubricRepository(), {
      ...rubricMaterial(),
      author_principal_id: OPERATOR_ID,
    });

    expect(() =>
      computeWeightedScore({ rubric, dimensionScores: [{ dimension_id: "skills", score: 4 }] }),
    ).toThrow("missing required dimension score");
    expect(() =>
      computeWeightedScore({
        rubric,
        dimensionScores: [
          { dimension_id: "skills", score: 6 },
          { dimension_id: "availability", score: 5 },
        ],
      }),
    ).toThrow("dimension score out of range");
  });
});
