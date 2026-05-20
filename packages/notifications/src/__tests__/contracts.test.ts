import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import yaml from "js-yaml";

describe("F11 contract schemas", () => {
  it("loads and compiles all contract schemas", () => {
    const ajv = new Ajv2020({ strict: false });
    addFormats(ajv);
    const base = resolve(
      process.cwd(),
      "../..",
      ".specify/specs/011-candidate-notifications/contracts",
    );
    for (const file of [
      "notice-timing-evidence.schema.yaml",
      "notice-template-version.schema.yaml",
      "candidate-notification-artifact.schema.yaml",
      "notification-gate-evaluation.schema.yaml",
      "notification-delivery-command.schema.yaml",
    ]) {
      expect(() => ajv.compile(yaml.load(readFileSync(resolve(base, file), "utf8")))).not.toThrow();
    }
  });
});
