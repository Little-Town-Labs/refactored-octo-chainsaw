import type { ToolDescriptorVersion } from "@spyglass/tool-dispatcher";

const FORBIDDEN_HUMAN_INPUT_PATTERNS = [
  /\bask\s+(the\s+)?principal\b/i,
  /\bwait\s+for\s+(human|principal|manual)\s+(confirmation|approval|input)\b/i,
  /\bhuman\s+(confirmation|approval|input)\b/i,
  /\bmanual\s+(confirmation|approval)\b/i,
  /\bpause\s+.*\b(human|principal|approval|confirmation)\b/i,
];

export interface ToolSemanticFinding {
  readonly tool_ref: { readonly name: string; readonly version: string };
  readonly reason_code: "human_input_semantics";
  readonly matched_pattern: string;
}

export function scanToolCatalogForHumanInputSemantics(
  descriptors: readonly ToolDescriptorVersion[],
): readonly ToolSemanticFinding[] {
  const findings: ToolSemanticFinding[] = [];
  for (const descriptor of descriptors) {
    const haystack = [
      descriptor.name,
      descriptor.description,
      descriptor.adapter_ref,
      JSON.stringify(descriptor.input_schema),
      JSON.stringify(descriptor.output_schema),
    ].join("\n");
    const pattern = FORBIDDEN_HUMAN_INPUT_PATTERNS.find((candidate) => candidate.test(haystack));
    if (pattern) {
      findings.push({
        tool_ref: { name: descriptor.name, version: descriptor.version },
        reason_code: "human_input_semantics",
        matched_pattern: pattern.source,
      });
    }
  }
  return findings;
}

export function assertNoHumanInputToolSemantics(
  descriptors: readonly ToolDescriptorVersion[],
): void {
  const findings = scanToolCatalogForHumanInputSemantics(descriptors);
  if (findings.length > 0) {
    const first = findings[0];
    throw new Error(
      `tool_human_input_semantics:${first?.tool_ref.name}@${first?.tool_ref.version}`,
    );
  }
}
