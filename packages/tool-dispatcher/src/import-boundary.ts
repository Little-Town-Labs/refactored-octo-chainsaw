import { readFileSync } from "node:fs";

export interface ImportBoundaryFinding {
  readonly source_path: string;
  readonly forbidden_import: string;
}

const FORBIDDEN_PATTERNS = [
  /@spyglass\/tool-dispatcher\/src\/adapter-registry/,
  /@spyglass\/tool-dispatcher\/src\/adapters/,
  /from\s+["'].*\/adapters\//,
  /from\s+["']@trpc\/client["']/,
];

export function findDispatcherBypassInText(
  sourcePath: string,
  text: string,
): readonly ImportBoundaryFinding[] {
  return FORBIDDEN_PATTERNS.flatMap((pattern) =>
    pattern.test(text) ? [{ source_path: sourcePath, forbidden_import: pattern.source }] : [],
  );
}

export function assertNoDispatcherBypass(paths: readonly string[]): void {
  const findings = paths.flatMap((path) =>
    findDispatcherBypassInText(path, readFileSync(path, "utf8")),
  );
  if (findings.length > 0) {
    throw new Error(
      `Dispatcher bypass detected: ${findings.map((finding) => `${finding.source_path}:${finding.forbidden_import}`).join(", ")}`,
    );
  }
}
