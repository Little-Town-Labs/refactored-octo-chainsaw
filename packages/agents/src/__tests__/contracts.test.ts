import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import yaml from "js-yaml";

import { counterpartyProjection, frozenRefs, scoreDraftFixture } from "../fixtures.js";

const SPEC_DIR = resolve(__dirname, "../../../../.specify/specs/013-seeker-advocate");

describe("F13 contracts", () => {
  const ajv = new Ajv2020({ strict: false });
  addFormats(ajv);

  test("seeker turn schema accepts a turn fixture", () => {
    const validate = ajv.compile(loadYaml("seeker-advocate-turn.schema.yaml"));
    expect(
      validate({
        run_id: "run_f13",
        side: "seeker",
        round: 1,
        message_to_counterparty: "Seeker perspective: strong alignment.",
        internal_rationale: "Generated through governed F12 invocation.",
        done_signal: false,
        flag_proposals: [],
        invocation_ref: "inv_123",
        frozen_refs: frozenRefs(),
        audit_refs: ["inv_123"],
      }),
    ).toBe(true);
  });

  test("seeker scoring schema accepts a scoring fixture", () => {
    const validate = ajv.compile(loadYaml("seeker-advocate-scoring.schema.yaml"));
    expect(
      validate({
        run_id: "run_f13",
        side: "seeker",
        rubric_ref: frozenRefs().rubric_ref,
        dimension_scores: scoreDraftFixture().dimension_scores,
        headline_rationale: "Good fit.",
        flag_proposals: [],
        ignored_holistic_score: null,
        invocation_ref: "inv_123",
        frozen_refs: frozenRefs(),
        audit_refs: ["inv_123"],
      }),
    ).toBe(true);
  });

  test("seeker refusal schema accepts a refusal fixture", () => {
    const validate = ajv.compile(loadYaml("seeker-advocate-refusal.schema.yaml"));
    expect(
      validate({
        run_id: "run_f13",
        side: "seeker",
        operation: "turn",
        reason_code: "unfiltered_counterparty_data",
        message: "Counterparty data must be filtered.",
        affected_refs: { projection: counterpartyProjection().projection_ref },
        audit_refs: [],
        created_at: "2026-05-21T12:00:00.000Z",
      }),
    ).toBe(true);
  });

  test("seeker eval schema accepts an eval fixture", () => {
    const validate = ajv.compile(loadYaml("seeker-advocate-eval-case.schema.yaml"));
    expect(
      validate({
        eval_case_id: "strong-match",
        category: "strong_match",
        expected_outcome: "accepted_scoring",
        actual_outcome: "accepted_scoring",
        required_reason_codes: [],
        expected_score_shape: "complete",
        privacy_attack_present: false,
        prompt_injection_present: false,
        budget_condition: "within_budget",
        pass: true,
        evidence_refs: ["inv_123"],
      }),
    ).toBe(true);
  });
});

function loadYaml(file: string): unknown {
  return yaml.load(readFileSync(resolve(SPEC_DIR, "contracts", file), "utf8"));
}
