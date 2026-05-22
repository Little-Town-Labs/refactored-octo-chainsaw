import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import yaml from "js-yaml";

import {
  counterpartyProjection,
  employerFrozenRefs,
  employerScoreDraftFixture,
  frozenRefs,
  scoreDraftFixture,
  seekerProjection,
} from "../fixtures.js";

const F13_SPEC_DIR = resolve(__dirname, "../../../../.specify/specs/013-seeker-advocate");
const F14_SPEC_DIR = resolve(__dirname, "../../../../.specify/specs/014-employer-advocate");

describe("F13 contracts", () => {
  const ajv = new Ajv2020({ strict: false });
  addFormats(ajv);

  test("seeker turn schema accepts a turn fixture", () => {
    const validate = ajv.compile(loadYaml(F13_SPEC_DIR, "seeker-advocate-turn.schema.yaml"));
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
    const validate = ajv.compile(loadYaml(F13_SPEC_DIR, "seeker-advocate-scoring.schema.yaml"));
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
    const validate = ajv.compile(loadYaml(F13_SPEC_DIR, "seeker-advocate-refusal.schema.yaml"));
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
    const validate = ajv.compile(loadYaml(F13_SPEC_DIR, "seeker-advocate-eval-case.schema.yaml"));
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

describe("F14 contracts", () => {
  const ajv = new Ajv2020({ strict: false });
  addFormats(ajv);

  test("employer turn schema accepts a turn fixture", () => {
    const validate = ajv.compile(loadYaml(F14_SPEC_DIR, "employer-advocate-turn.schema.yaml"));
    expect(
      validate({
        run_id: "run_f14",
        side: "employer",
        round: 1,
        message_to_counterparty: "Employer perspective: strong alignment.",
        internal_rationale: "Generated through governed F12 invocation.",
        done_signal: false,
        flag_proposals: [],
        invocation_ref: "inv_123",
        frozen_refs: employerFrozenRefs(),
        audit_refs: ["inv_123"],
      }),
    ).toBe(true);
  });

  test("employer scoring schema accepts a scoring fixture", () => {
    const validate = ajv.compile(loadYaml(F14_SPEC_DIR, "employer-advocate-scoring.schema.yaml"));
    expect(
      validate({
        run_id: "run_f14",
        side: "employer",
        rubric_ref: employerFrozenRefs().rubric_ref,
        dimension_scores: employerScoreDraftFixture().dimension_scores,
        headline_rationale: "Good fit.",
        flag_proposals: [],
        ignored_holistic_score: null,
        rejected_decision_content: [],
        protected_class_boundary: "none",
        invocation_ref: "inv_123",
        frozen_refs: employerFrozenRefs(),
        audit_refs: ["inv_123"],
      }),
    ).toBe(true);
  });

  test("employer refusal schema accepts a refusal fixture", () => {
    const validate = ajv.compile(loadYaml(F14_SPEC_DIR, "employer-advocate-refusal.schema.yaml"));
    expect(
      validate({
        run_id: "run_f14",
        side: "employer",
        operation: "turn",
        reason_code: "unfiltered_counterparty_data",
        message: "Counterparty data must be filtered.",
        affected_refs: { projection: seekerProjection().projection_ref },
        audit_refs: [],
        created_at: "2026-05-22T12:00:00.000Z",
      }),
    ).toBe(true);
  });

  test("employer eval schema accepts an eval fixture", () => {
    const validate = ajv.compile(loadYaml(F14_SPEC_DIR, "employer-advocate-eval-case.schema.yaml"));
    expect(
      validate({
        eval_case_id: "strong-match",
        category: "strong_match",
        expected_outcome: "accepted_scoring",
        actual_outcome: "accepted_scoring",
        required_reason_codes: [],
        expected_score_shape: "complete",
        regulated_surface_expectation: "no_decision_content",
        privacy_attack_present: false,
        prompt_injection_present: false,
        protected_class_attack_present: false,
        budget_condition: "within_budget",
        pass: true,
        evidence_refs: ["inv_123"],
      }),
    ).toBe(true);
  });
});

function loadYaml(specDir: string, file: string): unknown {
  return yaml.load(readFileSync(resolve(specDir, "contracts", file), "utf8"));
}
