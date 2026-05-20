import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import yaml from "js-yaml";

describe("F08.5 contract schemas", () => {
  it("loads and compiles all contract schemas", () => {
    const ajv = new Ajv2020({ strict: false });
    addFormats(ajv);
    for (const file of [
      "tool-descriptor.schema.yaml",
      "tool-catalog-version.schema.yaml",
      "tool-advertisement.schema.yaml",
      "tool-dispatch-result.schema.yaml",
      "disclosure-routing-evidence.schema.yaml",
    ]) {
      const path = resolve(
        process.cwd(),
        "../..",
        ".specify/specs/008-tool-surface-dispatcher/contracts",
        file,
      );
      expect(() => ajv.compile(yaml.load(readFileSync(path, "utf8")))).not.toThrow();
    }
  });
});
