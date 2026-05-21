import {
  rubricFixture,
  scoringInputFixture,
  scoreDraftFixture,
  seededRuntime,
} from "../fixtures.js";
import { runSeekerAdvocateScoring, validateSeekerDimensionScores } from "../seeker-scoring.js";

describe("seeker advocate scoring", () => {
  test("returns accepted scoring with one entry per rubric dimension", async () => {
    const input = await scoringInputFixture();

    const decision = await runSeekerAdvocateScoring(input);

    expect(decision.ok).toBe(true);
    if (!decision.ok) throw new Error(decision.refusal.reason_code);
    expect(decision.result.dimension_scores).toHaveLength(2);
    expect(decision.result.ignored_holistic_score).toBeNull();
    expect(decision.result.invocation_ref).toBeDefined();
  });

  test("ignores holistic model score as regression evidence", async () => {
    const input = await scoringInputFixture({
      score_draft: scoreDraftFixture({ model_holistic_score: 9 }),
    });

    const decision = await runSeekerAdvocateScoring(input);

    expect(decision.ok).toBe(true);
    if (!decision.ok) throw new Error(decision.refusal.reason_code);
    expect(decision.result.ignored_holistic_score).toBe(9);
  });

  test("rejects missing dimensions", async () => {
    const result = validateSeekerDimensionScores(rubricFixture(), [
      { dimension_id: "role_fit", score: 8, rationale: "Role fit is strong." },
    ]);

    expect(result).toEqual({ ok: false, message: "Missing dimension constraints_fit." });
  });

  test("rejects out-of-range scores", async () => {
    const result = validateSeekerDimensionScores(rubricFixture(), [
      { dimension_id: "role_fit", score: 99, rationale: "Too high." },
      { dimension_id: "constraints_fit", score: 7, rationale: "OK." },
    ]);

    expect(result).toEqual({ ok: false, message: "Score out of range for role_fit." });
  });

  test("returns scoring refusal for invalid score shape", async () => {
    const input = await scoringInputFixture({
      score_draft: scoreDraftFixture({
        dimension_scores: [
          { dimension_id: "role_fit", score: 8, rationale: "Role fit is strong." },
        ],
      }),
    });

    const decision = await runSeekerAdvocateScoring(input);

    expect(decision.ok).toBe(false);
    if (decision.ok) throw new Error("expected refusal");
    expect(decision.refusal.reason_code).toBe("scoring_dimensions_invalid");
  });

  test("preserves budget refusal reason codes from governed invocation", async () => {
    const runtime = await seededRuntime({
      manifest: {
        cost_controls: [
          {
            scope: "run",
            ceiling: 0.000001,
            unit: "usd",
            on_preflight_exceeded: "refuse",
          },
        ],
      },
    });
    const input = await scoringInputFixture({ runtime });

    const decision = await runSeekerAdvocateScoring(input);

    expect(decision.ok).toBe(false);
    if (decision.ok) throw new Error("expected refusal");
    expect(decision.refusal.reason_code).toBe("budget_preflight_exceeded");
  });
});
