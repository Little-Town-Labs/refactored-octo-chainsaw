import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import yaml from "js-yaml";

const SPEC_DIR = resolve(__dirname, "../../../../.specify/specs/007-agent-contract-registry");

const schemas = ["agent-contract-version.schema.yaml", "contract-resolution.schema.yaml"] as const;

describe("F07a contract schemas", () => {
  test.each(schemas)("%s is a valid JSON Schema", (schemaName) => {
    const ajv = new Ajv2020({ strict: true, allErrors: true });
    addFormats(ajv);

    const schema = loadYaml(resolve(SPEC_DIR, "contracts", schemaName));

    expect(() => ajv.compile(schema)).not.toThrow();
  });

  test("agent-contract-version.schema.yaml accepts a published contract fixture", () => {
    const ajv = new Ajv2020({ strict: true, allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(
      loadYaml(resolve(SPEC_DIR, "contracts", "agent-contract-version.schema.yaml")),
    );

    expect(validate(agentContractFixture())).toBe(true);
  });

  test("contract-resolution.schema.yaml accepts allow and deny fixtures", () => {
    const ajv = new Ajv2020({ strict: true, allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(
      loadYaml(resolve(SPEC_DIR, "contracts", "contract-resolution.schema.yaml")),
    );

    expect(validate(contractResolutionFixture("allow", "contract_resolved"))).toBe(true);
    expect(validate(contractResolutionFixture("deny", "missing_contract"))).toBe(true);
  });
});

function loadYaml(path: string): unknown {
  return yaml.load(readFileSync(path, "utf8"));
}

function agentContractFixture() {
  return {
    contract_id: "seeker.standard",
    version: "1.0.0",
    side: "seeker",
    status: "published",
    prompt_template_ref: { id: "seeker-standard", version: "1.0.0" },
    rubric_ref: { id: "seeker-fit", version: "1.0.0" },
    tool_surface_ref: { id: "seeker-tools", version: "1.0.0" },
    model_ref: { provider: "openai", model_id: "gpt-5.4-mini", version: "2026-05-01" },
    runtime_settings: { max_rounds: 3, timeout_ms: 30000, max_tool_calls_per_turn: 4 },
    description: "Initial seeker-side launch contract.",
    deprecated_after: null,
  };
}

function contractResolutionFixture(decision: "allow" | "deny", reasonCode: string) {
  return {
    decision,
    reason_code: reasonCode,
    contract_ref: { contract_id: "seeker.standard", version: "1.0.0" },
    effective_runtime_settings: { max_rounds: 3, timeout_ms: 30000 },
    runtime_clamps: [],
    dependency_results: [
      {
        kind: "prompt_template",
        status: decision === "allow" ? "available" : "unavailable",
        ref: { id: "seeker-standard", version: "1.0.0" },
      },
    ],
  };
}
