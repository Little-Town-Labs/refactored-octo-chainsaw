import { DEFAULT_PRODUCT_HARNESS_WORKFLOWS } from "../reporting/workflows.js";
import { getProductHarnessCommandPlan } from "../reporting/commands.js";
import {
  createProductHarnessSuiteReport,
  renderProductHarnessSuiteJson,
  renderProductHarnessSuiteMarkdown,
} from "../reporting/reports.js";
import { runDefaultObservabilityGateSuite } from "../observability/runner.js";
import { runDefaultPiPersonaEvalSuite } from "../persona-evals/runner.js";
import type { ProductHarnessCommandName, ScenarioEnvironment } from "../contracts.js";

export interface RunReportingCiScenarioSampleOptions {
  readonly command?: ProductHarnessCommandName;
  readonly target_url?: string;
}

export async function runReportingCiScenarioSample(
  options: RunReportingCiScenarioSampleOptions = {},
): Promise<string> {
  const command = options.command ?? envCommand() ?? "product:gate";
  const environment = commandEnvironment(
    command,
    options.target_url ?? process.env.PRODUCT_CANARY_URL,
  );
  const observability = await runDefaultObservabilityGateSuite({ environment });
  const evals = await runDefaultPiPersonaEvalSuite({ environment });
  const snapshots =
    command === "product:eval"
      ? evals.results.map((result) => result.snapshot)
      : [
          ...observability.results.map((result) => result.snapshot),
          ...evals.results.slice(0, 1).map((result) => result.snapshot),
        ];
  const report = createProductHarnessSuiteReport({
    report_id: `sample-${command.replace(":", "-")}`,
    generated_at: "2026-05-28T18:30:00.000Z",
    command: getProductHarnessCommandPlan(command),
    snapshots,
  });

  return JSON.stringify(
    {
      command,
      target_url_label: environment.label,
      snapshot_count: snapshots.length,
      workflow_count: DEFAULT_PRODUCT_HARNESS_WORKFLOWS.length,
      report_json: JSON.parse(renderProductHarnessSuiteJson(report)) as unknown,
      report_markdown: renderProductHarnessSuiteMarkdown(report),
    },
    null,
    2,
  );
}

function commandEnvironment(
  command: ProductHarnessCommandName,
  targetUrl: string | undefined,
): ScenarioEnvironment {
  if (command !== "product:canary") return { label: "local-reporting-ci" };
  const label = targetUrl ? `canary:${safeUrlHost(targetUrl)}` : "canary:dry-run";
  return { label };
}

function safeUrlHost(value: string): string {
  try {
    return new URL(value).hostname || "unknown-target";
  } catch {
    return "invalid-target";
  }
}

function envCommand(): ProductHarnessCommandName | undefined {
  const value = process.env.PRODUCT_HARNESS_COMMAND;
  if (value === "product:gate" || value === "product:eval" || value === "product:canary") {
    return value;
  }
  return undefined;
}
