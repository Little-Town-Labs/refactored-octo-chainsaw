import type {
  ProductScenario,
  RunScenarioOptions,
  ScenarioIdentity,
  ScenarioRunContext,
  ScenarioRunResult,
  ScenarioStepRecord,
  StepStatus,
} from "./contracts.js";
import { assertValidArtifact, assertValidRunResult, assertValidScenario } from "./validation.js";

export async function runScenario(
  scenario: ProductScenario,
  options: RunScenarioOptions,
): Promise<ScenarioRunResult> {
  assertValidScenario(scenario);

  const now = options.now ?? (() => new Date());
  const runId = options.run_id ?? `${scenario.scenario_id}:${Date.now().toString(36)}`;
  const startedAt = now();
  const scenarioIdentity = toScenarioIdentity(scenario);
  const context: ScenarioRunContext = {
    run_id: runId,
    scenario: scenarioIdentity,
    environment: options.environment,
  };

  const steps: ScenarioStepRecord[] = [];
  const assertions = [];
  const artifacts = [];

  for (const [index, step] of scenario.steps.entries()) {
    const stepStarted = now();
    try {
      const output = await step.run(context);
      for (const artifact of output.artifacts ?? []) {
        assertValidArtifact(artifact);
        artifacts.push(artifact);
      }
      assertions.push(...(output.assertions ?? []));
      const stepEnded = now();
      steps.push({
        step_id: step.step_id,
        order: index + 1,
        name: step.name,
        status: output.status ?? "passed",
        started_at: stepStarted.toISOString(),
        ended_at: stepEnded.toISOString(),
        duration_ms: durationMs(stepStarted, stepEnded),
        ...(output.evidence_refs ? { evidence_refs: output.evidence_refs } : {}),
        ...(output.metadata ? { metadata: output.metadata } : {}),
      });
    } catch (err) {
      const stepEnded = now();
      steps.push({
        step_id: step.step_id,
        order: index + 1,
        name: step.name,
        status: "failed",
        started_at: stepStarted.toISOString(),
        ended_at: stepEnded.toISOString(),
        duration_ms: durationMs(stepStarted, stepEnded),
        error: safeErrorSummary(err),
      });
    }
  }

  const endedAt = now();
  const result: ScenarioRunResult = {
    run_id: runId,
    scenario: scenarioIdentity,
    environment: options.environment,
    ...(options.git ? { git: options.git } : {}),
    started_at: startedAt.toISOString(),
    ended_at: endedAt.toISOString(),
    duration_ms: durationMs(startedAt, endedAt),
    status: deriveRunStatus(steps, assertions),
    steps,
    assertions,
    artifacts,
    summary: buildSummary(scenarioIdentity, steps, assertions),
    ...(options.metadata ? { metadata: options.metadata } : {}),
  };

  assertValidRunResult(result);
  return result;
}

export function deriveRunStatus(
  steps: readonly Pick<ScenarioStepRecord, "status">[],
  assertions: readonly { readonly status: string; readonly severity: string }[],
): "passed" | "failed" {
  if (steps.some((step) => step.status === "failed")) return "failed";
  if (
    assertions.some(
      (assertion) =>
        assertion.status === "failed" &&
        (assertion.severity === "blocker" || assertion.severity === "major"),
    )
  ) {
    return "failed";
  }
  return "passed";
}

function toScenarioIdentity(scenario: ProductScenario): ScenarioIdentity {
  return {
    scenario_id: scenario.scenario_id,
    version: scenario.version,
    title: scenario.title,
    ...(scenario.description ? { description: scenario.description } : {}),
    mode: scenario.mode,
    ...(scenario.owner ? { owner: scenario.owner } : {}),
    ...(scenario.tags ? { tags: scenario.tags } : {}),
  };
}

function durationMs(startedAt: Date, endedAt: Date): number {
  return Math.max(0, endedAt.getTime() - startedAt.getTime());
}

function safeErrorSummary(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  return message.replace(/(secret|token|key)=\S+/gi, "$1=[redacted]").slice(0, 500);
}

function buildSummary(
  scenario: ScenarioIdentity,
  steps: readonly Pick<ScenarioStepRecord, "status">[],
  assertions: readonly { readonly status: string; readonly severity: string }[],
): string {
  const status = deriveRunStatus(steps, assertions);
  return `${scenario.scenario_id} ${status}: ${steps.length} step(s), ${assertions.length} assertion(s)`;
}

export type { StepStatus };
