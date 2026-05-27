import {
  noopScenario,
  renderJsonReport,
  renderMarkdownReport,
  runScenario,
  type ScenarioRunResult,
} from "../index.js";

const clock = (): (() => Date) => {
  let tick = 0;
  return () => new Date(Date.UTC(2026, 4, 27, 12, 0, tick++));
};

describe("product harness reports", () => {
  it("renders a JSON report with stable top-level fields", async () => {
    const result = await sampleResult();
    const parsed = JSON.parse(renderJsonReport(result)) as ScenarioRunResult;

    expect(parsed).toMatchObject({
      run_id: "report-run",
      status: "passed",
      scenario: { scenario_id: "pth.sample.noop", mode: "gate" },
    });
    expect(parsed.steps).toHaveLength(1);
    expect(parsed.assertions).toHaveLength(1);
    expect(parsed.artifacts).toHaveLength(1);
  });

  it("renders a Markdown report for passed runs", async () => {
    const result = await sampleResult();
    const markdown = renderMarkdownReport(result);

    expect(markdown).toContain("# Product Harness Run: Product harness no-op sample");
    expect(markdown).toContain("- Status: `passed`");
    expect(markdown).toContain("- Steps: 1");
    expect(markdown).toContain("- Assertions: 1");
    expect(markdown).toContain("- Artifacts: 1");
  });

  it("highlights failed assertions before supporting details", async () => {
    const result = await runScenario(
      {
        ...noopScenario,
        scenario_id: "report.failed",
        steps: [
          {
            step_id: "failed-assertion",
            name: "Failed assertion",
            run: () => ({
              assertions: [
                {
                  assertion_id: "a-fail",
                  name: "Blocker fails",
                  severity: "blocker",
                  status: "failed",
                  expected: "allowed",
                  actual: "blocked",
                },
              ],
            }),
          },
        ],
      },
      { run_id: "failed-run", environment: { label: "test" }, now: clock() },
    );

    const markdown = renderMarkdownReport(result);
    expect(result.status).toBe("failed");
    expect(markdown.indexOf("## Failed Assertions")).toBeLessThan(markdown.indexOf("## Steps"));
  });

  it("does not include common secret markers in sample output", async () => {
    const output = `${renderJsonReport(await sampleResult())}\n${renderMarkdownReport(
      await sampleResult(),
    )}`;
    expect(output).not.toMatch(/secret|token=|password|sk_live/i);
  });
});

async function sampleResult(): Promise<ScenarioRunResult> {
  return runScenario(noopScenario, {
    run_id: "report-run",
    environment: { label: "test" },
    now: clock(),
  });
}
