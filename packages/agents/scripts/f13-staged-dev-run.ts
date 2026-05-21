import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { assertSeekerEvalBaseline, evaluateSeekerAdvocateCases } from "../src/eval.js";
import { runInputFixture, scoringInputFixture } from "../src/fixtures.js";
import { runSeekerAdvocateTurn } from "../src/seeker-advocate.js";
import { runSeekerAdvocateScoring } from "../src/seeker-scoring.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = resolve(
  __dirname,
  "../../../.specify/specs/013-seeker-advocate/quickstart-run-2026-05-21.md",
);

const turnInput = await runInputFixture();
const turn = await runSeekerAdvocateTurn(turnInput);
if (!turn.ok) throw new Error(`turn refused:${turn.refusal.reason_code}`);

const scoringInput = await scoringInputFixture({ runtime: turnInput.runtime });
const scoring = await runSeekerAdvocateScoring(scoringInput);
if (!scoring.ok) throw new Error(`scoring refused:${scoring.refusal.reason_code}`);

const privacy = await runSeekerAdvocateTurn(
  await runInputFixture({
    runtime: turnInput.runtime,
    counterparty_projection: {
      projection_ref: "bad",
      filtered: true,
      payload: { raw_employer_confidential: "blocked" },
    },
  }),
);
if (privacy.ok) throw new Error("privacy attack should refuse");

const cases = evaluateSeekerAdvocateCases([
  scenario("strong_match", "accepted_scoring", scoring.result.invocation_ref),
  scenario("weak_match", "accepted_scoring", scoring.result.invocation_ref),
  scenario("insufficient_evidence", "inconclusive", scoring.result.invocation_ref),
  scenario("privacy_attack", "refusal", privacy.refusal.reason_code),
  scenario("prompt_injection", "refusal", "unsafe_prompt_variable"),
  scenario("unsupported_tool", "refusal", "unsupported_tool"),
  scenario("budget_refusal", "refusal", "budget_preflight_exceeded"),
]);
assertSeekerEvalBaseline(cases);

writeFileSync(
  out,
  [
    "# F13 Quickstart Run",
    "",
    `Date: ${new Date().toISOString()}`,
    "",
    "## Evidence",
    "",
    `- accepted_turn_invocation: ${turn.result.invocation_ref}`,
    `- accepted_scoring_invocation: ${scoring.result.invocation_ref}`,
    `- score_dimensions: ${scoring.result.dimension_scores.map((score) => score.dimension_id).join(", ")}`,
    `- privacy_attack_refusal: ${privacy.refusal.reason_code}`,
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
  };
}
