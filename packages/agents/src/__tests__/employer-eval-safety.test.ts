import { evaluateEmployerAdvocateCases } from "../eval.js";

describe("employer eval safety", () => {
  test("records privacy, injection, and protected-class safety expectations", () => {
    const cases = evaluateEmployerAdvocateCases([
      {
        eval_case_id: "privacy",
        category: "privacy_attack",
        expected_outcome: "refusal",
        actual_outcome: "refusal",
      },
      {
        eval_case_id: "injection",
        category: "prompt_injection",
        expected_outcome: "refusal",
        actual_outcome: "refusal",
      },
      {
        eval_case_id: "protected",
        category: "protected_class_boundary",
        expected_outcome: "refusal",
        actual_outcome: "refusal",
        protected_class_attack_present: true,
      },
    ]);

    expect(cases.every((item) => item.pass)).toBe(true);
  });
});
