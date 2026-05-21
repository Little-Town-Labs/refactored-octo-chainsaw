import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { scanDirectProviderImports } from "../import-boundary.js";

describe("direct provider import boundary", () => {
  test("detects direct provider SDK imports", () => {
    const dir = mkdtempSync(join(tmpdir(), "spyglass-ai-boundary-"));
    const file = join(dir, "bad.ts");
    writeFileSync(file, 'import OpenAI from "openai";\n');

    try {
      expect(scanDirectProviderImports([file])).toEqual([{ file, forbidden_import: "openai" }]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
