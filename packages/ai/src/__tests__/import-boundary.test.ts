import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { scanDirectProviderImports } from "../import-boundary.js";

describe("direct provider import boundary", () => {
  test.each([
    ["openai", 'import OpenAI from "openai";\n'],
    ["openrouter", 'import OpenRouter from "openrouter";\n'],
  ])("detects direct %s provider imports", (forbiddenImport, source) => {
    const dir = mkdtempSync(join(tmpdir(), "spyglass-ai-boundary-"));
    const file = join(dir, "bad.ts");
    writeFileSync(file, source);

    try {
      expect(scanDirectProviderImports([file])).toEqual([
        { file, forbidden_import: forbiddenImport },
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
