import { readFileSync } from "node:fs";

import type { PrivacyRepository } from "./repo.js";

export interface CounterpartyAccessBypassFinding {
  readonly source_path: string;
  readonly forbidden_access: string;
}

const FORBIDDEN_PATTERNS = [
  /from\s+["']@spyglass\/tickets["']/,
  /from\s+["'].*tickets\/src\/repo\//,
  /\.getCounterpartyRaw\(/,
  /\.counterpartyRaw\b/,
  /raw_counterparty/i,
];

export function findCounterpartyAccessBypassInText(
  sourcePath: string,
  text: string,
): readonly CounterpartyAccessBypassFinding[] {
  return FORBIDDEN_PATTERNS.flatMap((pattern) =>
    pattern.test(text) ? [{ source_path: sourcePath, forbidden_access: pattern.source }] : [],
  );
}

export function assertNoCounterpartyAccessBypass(paths: readonly string[]): void {
  const findings = paths.flatMap((path) =>
    findCounterpartyAccessBypassInText(path, readFileSync(path, "utf8")),
  );
  if (findings.length > 0) {
    throw new Error(
      `Counterparty access bypass detected: ${findings.map((finding) => `${finding.source_path}:${finding.forbidden_access}`).join(", ")}`,
    );
  }
}

export async function recordCounterpartyAccessFindings(input: {
  readonly repository: PrivacyRepository;
  readonly findings: readonly CounterpartyAccessBypassFinding[];
  readonly detected_by: string;
  readonly status?: "open" | "resolved" | "expected_fixture";
  readonly audit_event_id?: string | null;
}) {
  return Promise.all(
    input.findings.map((finding) =>
      input.repository.appendAccessFinding({
        source_path: finding.source_path,
        forbidden_access: finding.forbidden_access,
        detected_by: input.detected_by,
        status: input.status ?? "open",
        audit_event_id: input.audit_event_id ?? null,
      }),
    ),
  );
}
