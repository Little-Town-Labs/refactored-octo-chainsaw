import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import yaml from "js-yaml";

describe("F09 contract schemas", () => {
  it("loads and compiles all contract schemas", () => {
    const ajv = new Ajv2020({ strict: false });
    addFormats(ajv);
    for (const file of [
      "privacy-ruleset.schema.yaml",
      "untrusted-input-envelope.schema.yaml",
      "filtered-projection.schema.yaml",
      "filter-decision.schema.yaml",
      "counterparty-access-finding.schema.yaml",
    ]) {
      const path = resolve(
        process.cwd(),
        "../..",
        ".specify/specs/009-privacy-filter/contracts",
        file,
      );
      expect(() => ajv.compile(yaml.load(readFileSync(path, "utf8")))).not.toThrow();
    }
  });
});
