import { evaluateEmployerAdvocateCases } from "../eval.js";

describe("employer eval quality", () => {
  test("records strong and weak match outcomes", () => {
    const cases = evaluateEmployerAdvocateCases([
      {
        eval_case_id: "strong",
        category: "strong_match",
        expected_outcome: "accepted_scoring",
        actual_outcome: "accepted_scoring",
      },
      {
        eval_case_id: "weak",
        category: "weak_match",
        expected_outcome: "accepted_scoring",
        actual_outcome: "accepted_scoring",
      },
    ]);

    expect(cases.every((item) => item.pass)).toBe(true);
  });
});
