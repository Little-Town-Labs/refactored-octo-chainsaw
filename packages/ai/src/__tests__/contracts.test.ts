import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import yaml from "js-yaml";

const SPEC_DIR = resolve(__dirname, "../../../../.specify/specs/012-ai-infrastructure");

const schemas = [
  "ai-operation-refusal.schema.yaml",
  "ai-runtime-manifest.schema.yaml",
  "model-invocation-record.schema.yaml",
  "model-profile-version.schema.yaml",
  "prompt-version.schema.yaml",
] as const;

describe("F12 AI infrastructure schemas", () => {
  test.each(schemas)("%s is a valid JSON Schema", (schemaName) => {
    const ajv = new Ajv2020({ strict: true, allErrors: true });
    addFormats(ajv);
    expect(() => ajv.compile(loadYaml(resolve(SPEC_DIR, "contracts", schemaName)))).not.toThrow();
  });
});

function loadYaml(path: string): unknown {
  return yaml.load(readFileSync(path, "utf8"));
}
