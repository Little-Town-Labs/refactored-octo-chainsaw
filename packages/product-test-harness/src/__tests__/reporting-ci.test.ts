import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  DEFAULT_PRODUCT_HARNESS_COMMANDS,
  DEFAULT_PRODUCT_HARNESS_WORKFLOWS,
  PRODUCT_HARNESS_REPORT_SCHEMA_VERSION,
  createProductHarnessSuiteReport,
  getProductHarnessCommandPlan,
  renderProductHarnessSuiteJson,
  renderProductHarnessSuiteMarkdown,
  runDefaultObservabilityGateSuite,
  runDefaultPiPersonaEvalSuite,
  summarizeProductHarnessSnapshots,
} from "../index.js";
import { runReportingCiScenarioSample } from "../samples/reporting-ci.js";

describe("PTH10 reporting, dashboard, and CI workflows", () => {
  it("summarizes result-store snapshots into a stable suite report", async () => {
    const observability = await runDefaultObservabilityGateSuite();
    const evals = await runDefaultPiPersonaEvalSuite();
    const snapshots = [
      observability.results[0]!.snapshot,
      observability.results[1]!.snapshot,
      evals.results[0]!.snapshot,
    ];

    const report = createProductHarnessSuiteReport({
      report_id: "pth10-suite-report",
      generated_at: "2026-05-28T18:00:00.000Z",
      command: getProductHarnessCommandPlan("product:gate"),
      snapshots,
    });

    expect(report).toMatchObject({
      schema_version: PRODUCT_HARNESS_REPORT_SCHEMA_VERSION,
      report_id: "pth10-suite-report",
      status: "passed",
      summary: {
        run_count: 3,
        passed_run_count: 3,
        failed_run_count: 0,
        agent_invocation_count: 1,
      },
    });
    expect(report.summary.observability_assertion_count).toBeGreaterThan(0);
    expect(report.scenario_coverage.map((entry) => entry.scenario_id)).toEqual(
      expect.arrayContaining([
        "observability.audit-signal-coverage",
        "observability.monitoring-latency-cost",
      ]),
    );
    expect(report.trend).toHaveLength(3);
  });

  it("renders aggregate reports as JSON and Markdown", async () => {
    const observability = await runDefaultObservabilityGateSuite();
    const report = createProductHarnessSuiteReport({
      report_id: "pth10-render-report",
      generated_at: "2026-05-28T18:05:00.000Z",
      command: getProductHarnessCommandPlan("product:canary"),
      snapshots: observability.results.map((result) => result.snapshot),
    });

    const parsed = JSON.parse(renderProductHarnessSuiteJson(report)) as typeof report;
    const markdown = renderProductHarnessSuiteMarkdown(report);

    expect(parsed.report_id).toBe("pth10-render-report");
    expect(markdown).toContain("# Product Harness Suite Report: product:canary");
    expect(markdown).toContain("- Status: `passed`");
    expect(markdown).toContain("## Scenario Coverage");
    expect(markdown).not.toMatch(/token=|password=|sk_live/i);
  });

  it("defines command and workflow metadata for gate, eval, and canary", () => {
    expect(DEFAULT_PRODUCT_HARNESS_COMMANDS.map((command) => command.command)).toEqual([
      "product:gate",
      "product:eval",
      "product:canary",
    ]);
    expect(getProductHarnessCommandPlan("product:eval")).toMatchObject({
      mode: "ci",
      scenario_refs: expect.arrayContaining(["PTH09 persona eval encounter matrix"]),
    });
    expect(DEFAULT_PRODUCT_HARNESS_WORKFLOWS.map((workflow) => workflow.workflow_file)).toEqual([
      ".github/workflows/product-gate.yml",
      ".github/workflows/persona-eval.yml",
      ".github/workflows/alpha-canary.yml",
    ]);
  });

  it("keeps the reporting sample deterministic and result-store backed", async () => {
    const sample = JSON.parse(await runReportingCiScenarioSample({ command: "product:gate" })) as {
      command: string;
      snapshot_count: number;
      report_json: unknown;
      report_markdown: string;
      workflow_count: number;
    };

    expect(sample.command).toBe("product:gate");
    expect(sample.snapshot_count).toBeGreaterThan(1);
    expect(sample.workflow_count).toBe(3);
    expect(sample.report_markdown).toContain("Product Harness Suite Report");
    expect(sample.report_json).toMatchObject({
      schema_version: PRODUCT_HARNESS_REPORT_SCHEMA_VERSION,
      command: { command: "product:gate" },
    });
  });

  it("records a safe canary target label when a target URL is provided", async () => {
    const sample = JSON.parse(
      await runReportingCiScenarioSample({
        command: "product:canary",
        target_url: "https://alpha-preview.example.test/path?token=unsafe",
      }),
    ) as {
      report_json: { runs: { environment_label: string }[] };
      report_markdown: string;
      target_url_label: string;
    };

    expect(sample.target_url_label).toBe("canary:alpha-preview.example.test");
    expect(
      sample.report_json.runs.every((run) => run.environment_label === sample.target_url_label),
    ).toBe(true);
    expect(sample.report_markdown).toContain("canary:alpha-preview.example.test");
    expect(sample.report_markdown).not.toContain("token=unsafe");
  });

  it("declares runnable GitHub workflows for product harness reports", async () => {
    const root = process.cwd().endsWith("packages/product-test-harness")
      ? path.resolve(process.cwd(), "../..")
      : process.cwd();

    for (const workflow of DEFAULT_PRODUCT_HARNESS_WORKFLOWS) {
      const content = await readFile(path.join(root, workflow.workflow_file), "utf8");
      expect(content).toContain("workflow_dispatch:");
      expect(content).toContain(`name: ${workflow.workflow_id}`);
      expect(content).toContain("product-harness-report");
      expect(content).toContain("actions/upload-artifact");
    }
  });

  it("handles empty report inputs as invalid but queryable", () => {
    const summary = summarizeProductHarnessSnapshots([]);

    expect(summary).toMatchObject({
      run_count: 0,
      passed_run_count: 0,
      failed_run_count: 0,
      invalid_run_count: 0,
      total_duration_ms: 0,
    });
  });
});
