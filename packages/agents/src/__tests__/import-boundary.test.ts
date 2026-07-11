import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { scanDirectProviderImports } from "../import-boundary.js";

describe("direct provider import boundary", () => {
  test.each([
    ["openai", 'import OpenAI from "openai";\n'],
    ["openrouter", 'import OpenRouter from "openrouter";\n'],
  ])("detects direct %s model-provider imports", (forbiddenImport, source) => {
    const dir = mkdtempSync(join(tmpdir(), "agents-boundary-"));
    const file = join(dir, "bad.ts");
    writeFileSync(file, source);

    expect(scanDirectProviderImports([file])).toEqual([
      { file, forbidden_import: forbiddenImport },
    ]);
  });

  test("allows governed AI package imports", () => {
    const dir = mkdtempSync(join(tmpdir(), "agents-boundary-"));
    const file = join(dir, "ok.ts");
    writeFileSync(file, 'import { invokeModel } from "@spyglass/ai";\n');

    expect(scanDirectProviderImports([file])).toEqual([]);
  });
});

test("employer advocate source files stay behind governed AI imports", () => {
  expect(
    scanDirectProviderImports(["src/employer-advocate.ts", "src/employer-scoring.ts"]),
  ).toEqual([]);
});
