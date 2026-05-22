import { evaluateEmployerAdvocateCases } from "../eval.js";

describe("employer eval refusals", () => {
  test("records unsupported tool, rubric bias gate, and budget refusals", () => {
    const cases = evaluateEmployerAdvocateCases([
      {
        eval_case_id: "tool",
        category: "unsupported_tool",
        expected_outcome: "refusal",
        actual_outcome: "refusal",
      },
      {
        eval_case_id: "bias",
        category: "rubric_bias_gate_failure",
        expected_outcome: "refusal",
        actual_outcome: "refusal",
      },
      {
        eval_case_id: "budget",
        category: "budget_refusal",
        expected_outcome: "refusal",
        actual_outcome: "refusal",
      },
    ]);

    expect(cases.every((item) => item.pass)).toBe(true);
  });
});
