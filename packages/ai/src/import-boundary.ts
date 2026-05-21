import { readFileSync } from "node:fs";

const FORBIDDEN_IMPORTS = [
  "@ai-sdk/openai",
  "@ai-sdk/anthropic",
  "@ai-sdk/google",
  "openai",
  "anthropic",
];

export interface ImportBoundaryFinding {
  readonly file: string;
  readonly forbidden_import: string;
}

export function scanDirectProviderImports(
  files: readonly string[],
): readonly ImportBoundaryFinding[] {
  const findings: ImportBoundaryFinding[] = [];
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    for (const forbidden of FORBIDDEN_IMPORTS) {
      if (text.includes(`"${forbidden}"`) || text.includes(`'${forbidden}'`)) {
        findings.push({ file, forbidden_import: forbidden });
      }
    }
  }
  return findings;
}
