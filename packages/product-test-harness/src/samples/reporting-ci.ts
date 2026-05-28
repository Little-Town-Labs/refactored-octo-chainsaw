import { DEFAULT_PRODUCT_HARNESS_WORKFLOWS } from "../reporting/workflows.js";
import {
  assertValidProductCanaryEnvironment,
  productCanaryTargetLabel,
} from "../reporting/canary-env.js";
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
  readonly validate_canary_env?: boolean;
  readonly canary_env?: Readonly<Record<string, string | undefined>>;
}

export async function runReportingCiScenarioSample(
  options: RunReportingCiScenarioSampleOptions = {},
): Promise<string> {
  const command = options.command ?? envCommand() ?? "product:gate";
  const shouldValidateCanaryEnv =
    command === "product:canary" &&
    (options.validate_canary_env ?? process.env.PRODUCT_CANARY_VALIDATE_ENV === "true");
  const canaryValidation = shouldValidateCanaryEnv
    ? assertValidProductCanaryEnvironment(canaryEnv(options))
    : undefined;
  const environment = commandEnvironment(
    command,
    options.target_url ?? process.env.PRODUCT_CANARY_URL,
    canaryValidation?.target_url_label,
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
      ...(canaryValidation
        ? {
            canary_environment: {
              mode: canaryValidation.mode,
              target_url_label: canaryValidation.target_url_label,
              required_env: canaryValidation.required_env,
              missing_env: canaryValidation.missing_env,
              issues: canaryValidation.issues,
            },
          }
        : {}),
      snapshot_count: snapshots.length,
      workflow_count: DEFAULT_PRODUCT_HARNESS_WORKFLOWS.length,
      report_json: JSON.parse(renderProductHarnessSuiteJson(report)) as unknown,
      report_markdown: renderProductHarnessSuiteMarkdown(report),
    },
    null,
    2,
  );
}

function canaryEnv(
  options: RunReportingCiScenarioSampleOptions,
): Readonly<Record<string, string | undefined>> {
  return {
    ...(options.canary_env ?? process.env),
    ...(options.target_url ? { PRODUCT_CANARY_URL: options.target_url } : {}),
  };
}

function commandEnvironment(
  command: ProductHarnessCommandName,
  targetUrl: string | undefined,
  validatedLabel: string | undefined,
): ScenarioEnvironment {
  if (command !== "product:canary") return { label: "local-reporting-ci" };
  return {
    label: validatedLabel ?? (targetUrl ? productCanaryTargetLabel(targetUrl) : "canary:dry-run"),
  };
}

function envCommand(): ProductHarnessCommandName | undefined {
  const value = process.env.PRODUCT_HARNESS_COMMAND;
  if (value === "product:gate" || value === "product:eval" || value === "product:canary") {
    return value;
  }
  return undefined;
}
