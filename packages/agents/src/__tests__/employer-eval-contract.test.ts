import { assertEmployerEvalBaseline, evaluateEmployerAdvocateCases } from "../eval.js";

describe("employer eval contract", () => {
  test("passes when every required category matches expected outcome", () => {
    const cases = evaluateEmployerAdvocateCases([
      scenario("strong_match", "accepted_scoring"),
      scenario("weak_match", "accepted_scoring"),
      scenario("insufficient_evidence", "inconclusive"),
      scenario("privacy_attack", "refusal"),
      scenario("prompt_injection", "refusal"),
      scenario("unsupported_tool", "refusal"),
      scenario("rubric_bias_gate_failure", "refusal"),
      scenario("protected_class_boundary", "refusal"),
      scenario("budget_refusal", "refusal"),
    ]);

    expect(() => assertEmployerEvalBaseline(cases)).not.toThrow();
  });
});

function scenario(
  category: Parameters<typeof evaluateEmployerAdvocateCases>[0][number]["category"],
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
