import { readFileSync } from "node:fs";

export interface ReachabilityFinding {
  readonly source_path: string;
  readonly forbidden_import: string;
}

const FORBIDDEN_PATTERNS = [
  /from\s+["']@spyglass\/ai["']/,
  /from\s+["']ai["']/,
  /from\s+["']openai["']/,
  /from\s+["']@ai-sdk\//,
  /chat\.completions/i,
];

export function findModelGatewayReachabilityInText(
  sourcePath: string,
  text: string,
): readonly ReachabilityFinding[] {
  return FORBIDDEN_PATTERNS.flatMap((pattern) =>
    pattern.test(text) ? [{ source_path: sourcePath, forbidden_import: pattern.source }] : [],
  );
}

export function assertNoModelGatewayReachability(paths: readonly string[]): void {
  const findings = paths.flatMap((path) =>
    findModelGatewayReachabilityInText(path, readFileSync(path, "utf8")),
  );
  if (findings.length > 0) {
    throw new Error(
      `Privacy filter model gateway reachability detected: ${findings.map((finding) => `${finding.source_path}:${finding.forbidden_import}`).join(", ")}`,
    );
  }
}
