import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import yaml from "js-yaml";

describe("F08 contract schemas", () => {
  it("loads and compiles all contract schemas", () => {
    const ajv = new Ajv2020({ strict: false });
    addFormats(ajv);
    for (const file of [
      "parley-dispatch-request.schema.yaml",
      "negotiation-turn.schema.yaml",
      "negotiation-filter.schema.yaml",
      "negotiation-scoring.schema.yaml",
      "negotiation-dossier-request.schema.yaml",
      "negotiation-terminal.schema.yaml",
      "renegotiation-request.schema.yaml",
      "renegotiation-decision.schema.yaml",
      "renegotiation-attempt.schema.yaml",
      "renegotiation-alarm.schema.yaml",
    ]) {
      const base = file.startsWith("renegotiation-")
        ? ".specify/specs/015-renegotiation-loop/contracts"
        : ".specify/specs/008-parley-runner/contracts";
      const path = resolve(process.cwd(), "../..", base, file);
      expect(() => ajv.compile(yaml.load(readFileSync(path, "utf8")))).not.toThrow();
    }
  });
});
