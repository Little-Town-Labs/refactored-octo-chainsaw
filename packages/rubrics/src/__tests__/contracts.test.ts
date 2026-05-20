import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import yaml from "js-yaml";

const SPEC_DIR = resolve(__dirname, "../../../../.specify/specs/007b-rubric-registry-bias-gate");

const schemas = [
  "bias-test-artifact.schema.yaml",
  "rubric-dispatch-gate.schema.yaml",
  "rubric-version.schema.yaml",
  "weighted-score-result.schema.yaml",
] as const;

describe("F07b rubric schemas", () => {
  test.each(schemas)("%s is a valid JSON Schema", (schemaName) => {
    const ajv = new Ajv2020({ strict: true, allErrors: true });
    addFormats(ajv);
    expect(() => ajv.compile(loadYaml(resolve(SPEC_DIR, "contracts", schemaName)))).not.toThrow();
  });

  test("rubric-version.schema.yaml accepts a published rubric fixture", () => {
    const validate = validator("rubric-version.schema.yaml");
    expect(validate(rubricVersionFixture())).toBe(true);
  });

  test("bias-test-artifact.schema.yaml accepts a completed artifact fixture", () => {
    const validate = validator("bias-test-artifact.schema.yaml");
    expect(validate(biasTestArtifactFixture())).toBe(true);
  });

  test("dispatch and scoring schemas accept allow/deny and weighted score fixtures", () => {
    expect(validator("rubric-dispatch-gate.schema.yaml")(gateFixture("allow"))).toBe(true);
    expect(validator("rubric-dispatch-gate.schema.yaml")(gateFixture("deny"))).toBe(true);
    expect(validator("weighted-score-result.schema.yaml")(weightedScoreFixture())).toBe(true);
  });
});

function validator(schemaName: string) {
  const ajv = new Ajv2020({ strict: true, allErrors: true });
  addFormats(ajv);
  return ajv.compile(loadYaml(resolve(SPEC_DIR, "contracts", schemaName)));
}

function loadYaml(path: string): unknown {
  return yaml.load(readFileSync(path, "utf8"));
}

function rubricVersionFixture() {
  return {
    rubric_id: "seeker-fit",
    version: "1.0.0",
    side: "seeker",
    status: "published",
    dimensions: [
      {
        dimension_id: "skills",
        label: "Skills Match",
        description: "Role-relevant skills evidence.",
        min_score: 0,
        max_score: 5,
        weight: 2,
        required: true,
      },
    ],
    aggregation_policy: {
      kind: "weighted_sum",
      weight_normalization: "sum_to_one",
      rounding: "half_away_from_zero_4dp",
    },
    bias_test_ref: { bias_test_artifact_id: "33333333-3333-4333-8333-333333333333" },
    content_hash: "hash",
    description: "Initial seeker fit rubric.",
    author_principal_id: "11111111-1111-4111-8111-111111111111",
    reviewer_principal_id: "22222222-2222-4222-8222-222222222222",
    published_at: "2026-05-20T12:00:00.000Z",
    audit_event_id: "44444444-4444-4444-8444-444444444444",
    created_at: "2026-05-20T12:00:00.000Z",
  };
}

function biasTestArtifactFixture() {
  return {
    bias_test_artifact_id: "33333333-3333-4333-8333-333333333333",
    rubric_id: "seeker-fit",
    rubric_version: "1.0.0",
    rubric_content_hash: "hash",
    methodology_ref: { methodology_id: "nist-ai-rmf-measure-2.11", version: "1.0.0" },
    status: "completed",
    jurisdiction_coverage: ["phase-0"],
    reviewer_principal_id: "22222222-2222-4222-8222-222222222222",
    completed_at: "2026-05-20T13:00:00.000Z",
    artifact_uri: "evidence://bias-tests/seeker-fit/1.0.0",
    audit_event_id: "44444444-4444-4444-8444-444444444444",
    created_at: "2026-05-20T13:00:00.000Z",
  };
}

function gateFixture(decision: "allow" | "deny") {
  return {
    decision,
    reason_code: decision === "allow" ? "rubric_gate_allowed" : "rubric_missing_bias_test",
    rubric_ref: { rubric_id: "seeker-fit", version: "1.0.0" },
    bias_test_artifact_id: "33333333-3333-4333-8333-333333333333",
    checked_at: "2026-05-20T14:00:00.000Z",
  };
}

function weightedScoreFixture() {
  return {
    rubric_id: "seeker-fit",
    rubric_version: "1.0.0",
    dimension_scores: [{ dimension_id: "skills", score: 4 }],
    normalized_weights: [{ dimension_id: "skills", weight: 1 }],
    total_score: 4,
    rounding_policy: "half_away_from_zero_4dp",
    model_holistic_score_ignored: true,
    regression_signal_ref: "holistic-score:123",
  };
}
