import { employerRubricFixture } from "../fixtures.js";
import { validateEmployerDimensionScores } from "../employer-scoring.js";

describe("employer scoring validation", () => {
  test("rejects missing dimensions", () => {
    const result = validateEmployerDimensionScores(employerRubricFixture(), [
      { dimension_id: "skills_fit", score: 8, rationale: "Strong skills." },
    ]);

    expect(result).toEqual({ ok: false, message: "Missing dimension role_constraints_fit." });
  });

  test("rejects out-of-range scores", () => {
    const result = validateEmployerDimensionScores(employerRubricFixture(), [
      { dimension_id: "skills_fit", score: 99, rationale: "Too high." },
      { dimension_id: "role_constraints_fit", score: 7, rationale: "OK." },
    ]);

    expect(result).toEqual({ ok: false, message: "Score out of range for skills_fit." });
  });
});
