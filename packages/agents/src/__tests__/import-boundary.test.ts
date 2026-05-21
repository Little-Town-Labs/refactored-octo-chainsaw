import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { scanDirectProviderImports } from "../import-boundary.js";

describe("direct provider import boundary", () => {
  test("detects direct model-provider imports", () => {
    const dir = mkdtempSync(join(tmpdir(), "agents-boundary-"));
    const file = join(dir, "bad.ts");
    writeFileSync(file, 'import OpenAI from "openai";\n');

    expect(scanDirectProviderImports([file])).toEqual([{ file, forbidden_import: "openai" }]);
  });

  test("allows governed AI package imports", () => {
    const dir = mkdtempSync(join(tmpdir(), "agents-boundary-"));
    const file = join(dir, "ok.ts");
    writeFileSync(file, 'import { invokeModel } from "@spyglass/ai";\n');

    expect(scanDirectProviderImports([file])).toEqual([]);
  });
});
