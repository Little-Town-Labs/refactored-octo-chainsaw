import type { ScenarioAssertion, ScenarioRunResult } from "../contracts.js";
import { assertValidRunResult } from "../validation.js";

export function renderMarkdownReport(result: ScenarioRunResult): string {
  assertValidRunResult(result);
  const failedAssertions = result.assertions.filter((assertion) => assertion.status === "failed");
  const lines = [
    `# Product Harness Run: ${result.scenario.title}`,
    "",
    `- Scenario: \`${result.scenario.scenario_id}\``,
    `- Version: \`${result.scenario.version}\``,
    `- Mode: \`${result.scenario.mode}\``,
    `- Status: \`${result.status}\``,
    `- Duration: ${result.duration_ms}ms`,
    `- Steps: ${result.steps.length}`,
    `- Assertions: ${result.assertions.length}`,
    `- Artifacts: ${result.artifacts.length}`,
    "",
  ];

  if (failedAssertions.length > 0) {
    lines.push("## Failed Assertions", "");
    for (const assertion of failedAssertions) {
      lines.push(formatAssertion(assertion), "");
    }
  }

  lines.push("## Steps", "");
  for (const step of result.steps) {
    lines.push(`- ${step.order}. \`${step.status}\` ${step.name}`);
  }

  lines.push("", "## Assertions", "");
  for (const assertion of result.assertions) {
    lines.push(formatAssertion(assertion));
  }

  lines.push("", "## Artifacts", "");
  for (const artifact of result.artifacts) {
    lines.push(`- \`${artifact.type}\` ${artifact.label}: ${artifact.uri}`);
  }

  return `${lines.join("\n")}\n`;
}

function formatAssertion(assertion: ScenarioAssertion): string {
  return `- \`${assertion.status}\` [${assertion.severity}] ${assertion.name} (expected: ${assertion.expected}; actual: ${assertion.actual})`;
}
