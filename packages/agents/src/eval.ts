import type { SeekerAdvocateEvalCase } from "./types.js";

export interface SeekerEvalScenario {
  readonly eval_case_id: string;
  readonly category: SeekerAdvocateEvalCase["category"];
  readonly expected_outcome: SeekerAdvocateEvalCase["expected_outcome"];
  readonly actual_outcome: SeekerAdvocateEvalCase["actual_outcome"];
  readonly evidence_refs?: readonly string[];
  readonly required_reason_codes?: readonly string[];
}

export function evaluateSeekerAdvocateCases(
  scenarios: readonly SeekerEvalScenario[],
): readonly SeekerAdvocateEvalCase[] {
  return scenarios.map((scenario) => {
    const pass = scenario.expected_outcome === scenario.actual_outcome;
    return {
      eval_case_id: scenario.eval_case_id,
      category: scenario.category,
      expected_outcome: scenario.expected_outcome,
      actual_outcome: scenario.actual_outcome,
      required_reason_codes: scenario.required_reason_codes ?? [],
      pass,
      evidence_refs: scenario.evidence_refs ?? [],
    };
  });
}

export function assertSeekerEvalBaseline(cases: readonly SeekerAdvocateEvalCase[]): void {
  const required: readonly SeekerAdvocateEvalCase["category"][] = [
    "strong_match",
    "weak_match",
    "insufficient_evidence",
    "privacy_attack",
    "prompt_injection",
    "unsupported_tool",
    "budget_refusal",
  ];
  for (const category of required) {
    if (!cases.some((item) => item.category === category)) {
      throw new Error(`missing_eval_case:${category}`);
    }
  }
  const failed = cases.filter((item) => !item.pass);
  if (failed.length > 0) {
    throw new Error(`seeker_eval_failed:${failed.map((item) => item.eval_case_id).join(",")}`);
  }
}
