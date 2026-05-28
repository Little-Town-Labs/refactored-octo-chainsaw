import {
  PRODUCT_HARNESS_REPORT_SCHEMA_VERSION,
  type ProductHarnessCommandPlan,
  type ProductHarnessReportSummary,
  type ProductHarnessScenarioCoverage,
  type ProductHarnessSuiteReport,
  type ProductHarnessTrendPoint,
  type ProductResultRunSummary,
  type ProductResultStoreSnapshot,
  type RunStatus,
} from "../contracts.js";
import { summarizeProductResultRun } from "../results/store.js";

export interface CreateProductHarnessSuiteReportInput {
  readonly report_id: string;
  readonly generated_at: string;
  readonly command: ProductHarnessCommandPlan;
  readonly snapshots: readonly ProductResultStoreSnapshot[];
}

export function createProductHarnessSuiteReport(
  input: CreateProductHarnessSuiteReportInput,
): ProductHarnessSuiteReport {
  const runs = input.snapshots.map(summarizeProductResultRun);
  const summary = summarizeProductHarnessSnapshots(input.snapshots);
  return {
    schema_version: PRODUCT_HARNESS_REPORT_SCHEMA_VERSION,
    report_id: input.report_id,
    generated_at: input.generated_at,
    command: input.command,
    status: deriveSuiteStatus(summary),
    summary,
    runs,
    scenario_coverage: summarizeScenarioCoverage(runs),
    trend: summarizeTrend(input.snapshots),
  };
}

export function summarizeProductHarnessSnapshots(
  snapshots: readonly ProductResultStoreSnapshot[],
): ProductHarnessReportSummary {
  return snapshots.reduce<ProductHarnessReportSummary>(
    (summary, snapshot) => ({
      run_count: summary.run_count + 1,
      passed_run_count: summary.passed_run_count + (snapshot.run.status === "passed" ? 1 : 0),
      failed_run_count: summary.failed_run_count + (snapshot.run.status === "failed" ? 1 : 0),
      invalid_run_count: summary.invalid_run_count + (snapshot.run.status === "invalid" ? 1 : 0),
      assertion_count:
        summary.assertion_count +
        snapshot.run.assertions.length +
        snapshot.observability_assertions.length,
      failed_assertion_count:
        summary.failed_assertion_count +
        snapshot.run.assertions.filter((assertion) => assertion.status === "failed").length +
        snapshot.observability_assertions.filter((assertion) => assertion.status === "failed")
          .length,
      artifact_count:
        summary.artifact_count +
        snapshot.run.artifacts.length +
        snapshot.browser_artifacts.length +
        snapshot.agent_invocations.reduce(
          (count, record) => count + (record.artifact_refs?.length ?? 0),
          0,
        ) +
        snapshot.webhook_captures.reduce(
          (count, record) => count + (record.artifact_refs?.length ?? 0),
          0,
        ),
      seed_record_count: summary.seed_record_count + snapshot.seed_records.length,
      agent_invocation_count: summary.agent_invocation_count + snapshot.agent_invocations.length,
      browser_artifact_count: summary.browser_artifact_count + snapshot.browser_artifacts.length,
      webhook_capture_count: summary.webhook_capture_count + snapshot.webhook_captures.length,
      observability_assertion_count:
        summary.observability_assertion_count + snapshot.observability_assertions.length,
      total_duration_ms: summary.total_duration_ms + snapshot.run.duration_ms,
    }),
    emptyReportSummary(),
  );
}

export function renderProductHarnessSuiteJson(report: ProductHarnessSuiteReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export function renderProductHarnessSuiteMarkdown(report: ProductHarnessSuiteReport): string {
  const lines = [
    `# Product Harness Suite Report: ${report.command.command}`,
    "",
    `- Status: \`${report.status}\``,
    `- Generated At: ${report.generated_at}`,
    `- Runs: ${report.summary.run_count}`,
    `- Passed: ${report.summary.passed_run_count}`,
    `- Failed: ${report.summary.failed_run_count}`,
    `- Invalid: ${report.summary.invalid_run_count}`,
    `- Assertions: ${report.summary.assertion_count}`,
    `- Failed Assertions: ${report.summary.failed_assertion_count}`,
    `- Artifacts: ${report.summary.artifact_count}`,
    `- Agent Invocations: ${report.summary.agent_invocation_count}`,
    `- Webhook Captures: ${report.summary.webhook_capture_count}`,
    `- Observability Assertions: ${report.summary.observability_assertion_count}`,
    "",
    "## Command",
    "",
    `- Mode: \`${report.command.mode}\``,
    `- Description: ${report.command.description}`,
    `- Scenario Refs: ${report.command.scenario_refs.join(", ")}`,
    `- Output Artifacts: ${report.command.output_artifacts.join(", ")}`,
    "",
    "## Scenario Coverage",
    "",
    "| Scenario | Mode | Runs | Statuses | Latest Run |",
    "|---|---|---:|---|---|",
    ...report.scenario_coverage.map(
      (entry) =>
        `| \`${entry.scenario_id}\` | \`${entry.mode}\` | ${entry.run_count} | ${entry.statuses
          .map((status) => `\`${status}\``)
          .join(", ")} | \`${entry.latest_run_id}\` |`,
    ),
    "",
    "## Runs",
    "",
    "| Run | Scenario | Environment | Status | Assertions | Artifacts |",
    "|---|---|---|---|---:|---:|",
    ...report.runs.map(
      (run) =>
        `| \`${run.run_id}\` | \`${run.scenario_id}\` | ${run.environment_label} | \`${run.status}\` | ${run.assertion_count} | ${run.artifact_count} |`,
    ),
  ];
  return `${lines.join("\n")}\n`;
}

function emptyReportSummary(): ProductHarnessReportSummary {
  return {
    run_count: 0,
    passed_run_count: 0,
    failed_run_count: 0,
    invalid_run_count: 0,
    assertion_count: 0,
    failed_assertion_count: 0,
    artifact_count: 0,
    seed_record_count: 0,
    agent_invocation_count: 0,
    browser_artifact_count: 0,
    webhook_capture_count: 0,
    observability_assertion_count: 0,
    total_duration_ms: 0,
  };
}

function deriveSuiteStatus(summary: ProductHarnessReportSummary): RunStatus {
  if (summary.run_count === 0) return "invalid";
  if (summary.failed_run_count > 0 || summary.invalid_run_count > 0) return "failed";
  return "passed";
}

function summarizeScenarioCoverage(
  runs: readonly ProductResultRunSummary[],
): readonly ProductHarnessScenarioCoverage[] {
  const grouped = new Map<string, ProductResultRunSummary[]>();
  for (const run of runs) {
    grouped.set(run.scenario_id, [...(grouped.get(run.scenario_id) ?? []), run]);
  }
  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([scenarioId, entries]) => ({
      scenario_id: scenarioId,
      scenario_version: entries.at(-1)!.scenario_version,
      mode: entries.at(-1)!.mode,
      run_count: entries.length,
      statuses: [...new Set(entries.map((entry) => entry.status))].sort(),
      latest_run_id: entries.at(-1)!.run_id,
    }));
}

function summarizeTrend(
  snapshots: readonly ProductResultStoreSnapshot[],
): readonly ProductHarnessTrendPoint[] {
  return snapshots.map((snapshot) => {
    const assertionCount =
      snapshot.run.assertions.length + snapshot.observability_assertions.length;
    const artifactCount =
      snapshot.run.artifacts.length +
      snapshot.browser_artifacts.length +
      snapshot.agent_invocations.reduce(
        (count, record) => count + (record.artifact_refs?.length ?? 0),
        0,
      ) +
      snapshot.webhook_captures.reduce(
        (count, record) => count + (record.artifact_refs?.length ?? 0),
        0,
      );
    return {
      label: snapshot.run.run_id,
      created_at: snapshot.created_at,
      run_count: 1,
      passed_run_count: snapshot.run.status === "passed" ? 1 : 0,
      failed_run_count: snapshot.run.status === "failed" ? 1 : 0,
      assertion_count: assertionCount,
      artifact_count: artifactCount,
    };
  });
}
