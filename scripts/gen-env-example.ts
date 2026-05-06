// Generate .env.example from packages/shared/src/env.ts.
//
// Run via `pnpm gen:env-example` (which uses tsx to execute this
// TypeScript file directly). CI verifies that the generated output
// matches the committed .env.example — drift = CI failure.
//
// The output is deterministic: keys are sorted; description-then-key
// pattern is consistent. This is what makes the drift check meaningful.

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { envDescriptions, envSchema } from "../packages/shared/src/env.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const outputPath = resolve(here, "..", ".env.example");

const shape = envSchema.shape;
const keys = Object.keys(shape).sort();

const lines: string[] = [
  "# Spyglass environment manifest — generated; do NOT edit by hand.",
  "# Source of truth: packages/shared/src/env.ts",
  "# Regenerate via `pnpm gen:env-example`.",
  "# CI verifies this file matches the schema; drift = build failure.",
  "",
];

for (const key of keys) {
  const description = envDescriptions[key as keyof typeof envDescriptions] ?? "(no description)";
  lines.push(`# ${description}`);
  lines.push(`${key}=`);
  lines.push("");
}

const content = lines.join("\n");
writeFileSync(outputPath, content, "utf-8");
console.log(`wrote ${outputPath} (${keys.length} variables)`);
