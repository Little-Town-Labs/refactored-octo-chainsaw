import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import yaml from "js-yaml";

const SPEC_DIR = resolve(__dirname, "../../../../.specify/specs/006-jurisdiction-policy-gates");

const schemas = [
  "gate-decision.schema.yaml",
  "kill-switch-event.schema.yaml",
  "failure-artifact.schema.yaml",
] as const;

describe("F06 contract schemas", () => {
  test.each(schemas)("%s is a valid JSON Schema", (schemaName) => {
    const ajv = new Ajv2020({ strict: true, allErrors: true });
    addFormats(ajv);

    const schema = loadYaml(resolve(SPEC_DIR, "contracts", schemaName));

    expect(() => ajv.compile(schema)).not.toThrow();
  });

  test("gate-decision.schema.yaml accepts allow and deny decision fixtures", () => {
    const ajv = new Ajv2020({ strict: true, allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(
      loadYaml(resolve(SPEC_DIR, "contracts", "gate-decision.schema.yaml")),
    );

    expect(validate(gateDecisionFixture("allow", "all_allowed"))).toBe(true);
    expect(validate(gateDecisionFixture("deny", "disabled_jurisdiction"))).toBe(true);
  });

  test("kill-switch-event.schema.yaml accepts a posture mutation fixture", () => {
    const ajv = new Ajv2020({ strict: true, allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(
      loadYaml(resolve(SPEC_DIR, "contracts", "kill-switch-event.schema.yaml")),
    );

    expect(validate(killSwitchEventFixture())).toBe(true);
  });

  test("failure-artifact.schema.yaml accepts every denial reason fixture", () => {
    const ajv = new Ajv2020({ strict: true, allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(
      loadYaml(resolve(SPEC_DIR, "contracts", "failure-artifact.schema.yaml")),
    );

    for (const reasonCode of [
      "missing_jurisdiction",
      "unknown_jurisdiction",
      "unsupported_jurisdiction",
      "disabled_jurisdiction",
      "review_required",
      "expired_policy",
      "conflicting_jurisdictions",
      "unauthorized",
    ]) {
      expect(validate(failureArtifactFixture(reasonCode))).toBe(true);
    }
  });
});

function loadYaml(path: string): unknown {
  return yaml.load(readFileSync(path, "utf8"));
}

function gateDecisionFixture(decision: "allow" | "deny", reasonCode: string) {
  return {
    gate_decision_id: "11111111-1111-4111-8111-111111111111",
    subject_kind: "match_ticket",
    subject_id: "match-001",
    decision,
    reason_code: reasonCode,
    jurisdiction_codes: ["US-MO"],
    policy_version: "launch-v1",
    policy_revision_ids: ["22222222-2222-4222-8222-222222222222"],
    correlation_id: "corr-001",
    principal_id: "33333333-3333-4333-8333-333333333333",
    audit_event_id: "44444444-4444-4444-8444-444444444444",
    created_at: "2026-05-20T12:00:00.000Z",
  };
}

function killSwitchEventFixture() {
  return {
    kill_switch_event_id: "55555555-5555-4555-8555-555555555555",
    jurisdiction_code: "US-MO",
    from_status: "allowed",
    to_status: "disabled",
    reason_code: "incident_response",
    policy_version: "launch-v2",
    operator_principal_id: "11111111-1111-4111-8111-111111111111",
    reviewer_principal_id: "22222222-2222-4222-8222-222222222222",
    correlation_id: "corr-002",
    audit_event_id: "44444444-4444-4444-8444-444444444444",
    created_at: "2026-05-20T12:00:00.000Z",
  };
}

function failureArtifactFixture(reasonCode: string) {
  return {
    failure_artifact_id: "jurisdiction-failure:11111111-1111-4111-8111-111111111111",
    gate_decision_id: "11111111-1111-4111-8111-111111111111",
    subject_kind: "match_ticket",
    subject_id: "match-001",
    decision: "deny",
    reason_code: reasonCode,
    jurisdiction_codes: ["US-MO"],
    policy_version: "launch-v1",
    correlation_id: "corr-001",
    audit_event_id: "44444444-4444-4444-8444-444444444444",
    created_at: "2026-05-20T12:00:00.000Z",
  };
}
