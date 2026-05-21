import { assertSeekerEvalBaseline, evaluateSeekerAdvocateCases } from "../eval.js";

describe("seeker advocate eval baseline", () => {
  test("passes when every required category matches expected outcome", () => {
    const cases = evaluateSeekerAdvocateCases([
      scenario("strong_match", "accepted_scoring"),
      scenario("weak_match", "accepted_scoring"),
      scenario("insufficient_evidence", "inconclusive"),
      scenario("privacy_attack", "refusal"),
      scenario("prompt_injection", "refusal"),
      scenario("unsupported_tool", "refusal"),
      scenario("budget_refusal", "refusal"),
    ]);

    expect(() => assertSeekerEvalBaseline(cases)).not.toThrow();
  });

  test("fails when a required category is missing", () => {
    const cases = evaluateSeekerAdvocateCases([scenario("strong_match", "accepted_scoring")]);

    expect(() => assertSeekerEvalBaseline(cases)).toThrow("missing_eval_case:weak_match");
  });
});

function scenario(
  category:
    | "strong_match"
    | "weak_match"
    | "insufficient_evidence"
    | "privacy_attack"
    | "prompt_injection"
    | "unsupported_tool"
    | "budget_refusal",
  outcome: "accepted_scoring" | "inconclusive" | "refusal",
) {
  return {
    eval_case_id: category,
    category,
    expected_outcome: outcome,
    actual_outcome: outcome,
    evidence_refs: [`evidence:${category}`],
  };
}
