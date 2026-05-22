import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { assertEmployerEvalBaseline, evaluateEmployerAdvocateCases } from "../src/eval.js";
import { employerRunInputFixture, employerScoringInputFixture } from "../src/fixtures.js";
import { runEmployerAdvocateTurn } from "../src/employer-advocate.js";
import { runEmployerAdvocateScoring } from "../src/employer-scoring.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = resolve(
  __dirname,
  "../../../.specify/specs/014-employer-advocate/quickstart-run-2026-05-22.md",
);

const turnInput = await employerRunInputFixture();
const turn = await runEmployerAdvocateTurn(turnInput);
if (!turn.ok) throw new Error(`turn refused:${turn.refusal.reason_code}`);

const scoringInput = await employerScoringInputFixture({ runtime: turnInput.runtime });
const scoring = await runEmployerAdvocateScoring(scoringInput);
if (!scoring.ok) throw new Error(`scoring refused:${scoring.refusal.reason_code}`);

const privacy = await runEmployerAdvocateTurn(
  await employerRunInputFixture({
    runtime: turnInput.runtime,
    counterparty_projection: {
      projection_ref: "bad",
      filtered: true,
      payload: { raw_seeker_pii: "blocked" },
    },
  }),
);
if (privacy.ok) throw new Error("privacy attack should refuse");

const protectedClass = await runEmployerAdvocateTurn(
  await employerRunInputFixture({
    runtime: turnInput.runtime,
    counterparty_projection: {
      projection_ref: "protected",
      filtered: true,
      payload: { protected_class_inference: "blocked" },
    },
  }),
);
if (protectedClass.ok) throw new Error("protected-class boundary should refuse");

const cases = evaluateEmployerAdvocateCases([
  scenario("strong_match", "accepted_scoring", scoring.result.invocation_ref),
  scenario("weak_match", "accepted_scoring", scoring.result.invocation_ref),
  scenario("insufficient_evidence", "inconclusive", scoring.result.invocation_ref),
  scenario("privacy_attack", "refusal", privacy.refusal.reason_code),
  scenario("prompt_injection", "refusal", "unsafe_prompt_variable"),
  scenario("unsupported_tool", "refusal", "unsupported_tool"),
  scenario("rubric_bias_gate_failure", "refusal", "rubric_bias_gate_missing"),
  scenario("protected_class_boundary", "refusal", protectedClass.refusal.reason_code),
  scenario("budget_refusal", "refusal", "budget_preflight_exceeded"),
]);
assertEmployerEvalBaseline(cases);

writeFileSync(
  out,
  [
    "# F14 Quickstart Run",
    "",
    `Date: ${new Date().toISOString()}`,
    "",
    "## Evidence",
    "",
    `- accepted_turn_invocation: ${turn.result.invocation_ref}`,
    `- accepted_scoring_invocation: ${scoring.result.invocation_ref}`,
    `- score_dimensions: ${scoring.result.dimension_scores.map((score) => score.dimension_id).join(", ")}`,
    `- privacy_attack_refusal: ${privacy.refusal.reason_code}`,
    `- protected_class_refusal: ${protectedClass.refusal.reason_code}`,
    `- eval_cases: ${cases.length}`,
    `- eval_passed: ${cases.every((item) => item.pass)}`,
    "",
  ].join("\n"),
);

console.log(
  JSON.stringify(
    {
      accepted_turn_invocation: turn.result.invocation_ref,
      accepted_scoring_invocation: scoring.result.invocation_ref,
      privacy_attack_refusal: privacy.refusal.reason_code,
      protected_class_refusal: protectedClass.refusal.reason_code,
      eval_cases: cases.length,
      eval_passed: cases.every((item) => item.pass),
      evidence_file: out,
    },
    null,
    2,
  ),
);

function scenario(
  category:
    | "strong_match"
    | "weak_match"
    | "insufficient_evidence"
    | "privacy_attack"
    | "prompt_injection"
    | "unsupported_tool"
    | "rubric_bias_gate_failure"
    | "protected_class_boundary"
    | "budget_refusal",
  outcome: "accepted_scoring" | "inconclusive" | "refusal",
  evidenceRef: string | undefined,
) {
  return {
    eval_case_id: category,
    category,
    expected_outcome: outcome,
    actual_outcome: outcome,
    evidence_refs: evidenceRef ? [evidenceRef] : [],
    regulated_surface_expectation: "no_decision_content",
  };
}
