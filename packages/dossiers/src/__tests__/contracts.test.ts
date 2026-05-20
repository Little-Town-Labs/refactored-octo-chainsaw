import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import yaml from "js-yaml";

describe("F10 contract schemas", () => {
  it("loads and compiles all contract schemas", () => {
    const ajv = new Ajv2020({ strict: false });
    addFormats(ajv);
    for (const file of [
      "dossier-artifact.schema.yaml",
      "dossier-projection.schema.yaml",
      "dossier-signature.schema.yaml",
      "verification-result.schema.yaml",
      "inconclusive-flag.schema.yaml",
    ]) {
      const path = resolve(
        process.cwd(),
        "../..",
        ".specify/specs/010-dossier-builder-signer/contracts",
        file,
      );
      expect(() => ajv.compile(yaml.load(readFileSync(path, "utf8")))).not.toThrow();
    }
  });
});
