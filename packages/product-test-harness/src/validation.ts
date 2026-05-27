import type {
  RunArtifact,
  ScenarioAssertion,
  ScenarioRunResult,
  ScenarioStepRecord,
  ProductScenario,
} from "./contracts.js";

const ARTIFACT_TYPES = new Set([
  "json",
  "markdown",
  "screenshot",
  "video",
  "trace",
  "webhook_capture",
  "agent_transcript",
  "log_excerpt",
  "other",
]);

const REDACTION_STATUSES = new Set([
  "not_required",
  "redacted",
  "contains_sensitive_synthetic_data",
]);

const SCENARIO_MODES = new Set(["gate", "eval"]);
const STEP_STATUSES = new Set(["passed", "failed", "skipped"]);
const ASSERTION_STATUSES = new Set(["passed", "failed", "skipped"]);
const ASSERTION_SEVERITIES = new Set(["blocker", "major", "minor", "info"]);
const RUN_STATUSES = new Set(["passed", "failed", "invalid"]);

export class HarnessValidationError extends Error {
  constructor(readonly issues: readonly string[]) {
    super(`Product harness validation failed:\n${issues.map((issue) => `- ${issue}`).join("\n")}`);
    this.name = "HarnessValidationError";
  }
}

export function validateScenario(scenario: ProductScenario): string[] {
  const issues: string[] = [];
  requireNonEmpty("scenario.scenario_id", scenario.scenario_id, issues);
  requireNonEmpty("scenario.version", scenario.version, issues);
  requireNonEmpty("scenario.title", scenario.title, issues);
  if (!SCENARIO_MODES.has(scenario.mode)) issues.push("scenario.mode must be gate or eval");
  if (scenario.steps.length === 0) issues.push("scenario.steps must contain at least one step");

  const stepIds = new Set<string>();
  scenario.steps.forEach((step, index) => {
    requireNonEmpty(`scenario.steps[${index}].step_id`, step.step_id, issues);
    requireNonEmpty(`scenario.steps[${index}].name`, step.name, issues);
    if (stepIds.has(step.step_id)) issues.push(`duplicate step_id: ${step.step_id}`);
    stepIds.add(step.step_id);
  });
  return issues;
}

export function assertValidScenario(scenario: ProductScenario): void {
  const issues = validateScenario(scenario);
  if (issues.length > 0) throw new HarnessValidationError(issues);
}

export function validateArtifact(artifact: RunArtifact, path = "artifact"): string[] {
  const issues: string[] = [];
  requireNonEmpty(`${path}.artifact_id`, artifact.artifact_id, issues);
  requireNonEmpty(`${path}.label`, artifact.label, issues);
  requireNonEmpty(`${path}.uri`, artifact.uri, issues);
  if (!ARTIFACT_TYPES.has(artifact.type)) issues.push(`${path}.type is invalid`);
  if (!REDACTION_STATUSES.has(artifact.redaction_status)) {
    issues.push(`${path}.redaction_status is invalid`);
  }
  return issues;
}

export function assertValidArtifact(artifact: RunArtifact): void {
  const issues = validateArtifact(artifact);
  if (issues.length > 0) throw new HarnessValidationError(issues);
}

export function validateAssertion(assertion: ScenarioAssertion, path = "assertion"): string[] {
  const issues: string[] = [];
  requireNonEmpty(`${path}.assertion_id`, assertion.assertion_id, issues);
  requireNonEmpty(`${path}.name`, assertion.name, issues);
  requireNonEmpty(`${path}.expected`, assertion.expected, issues);
  requireNonEmpty(`${path}.actual`, assertion.actual, issues);
  if (!ASSERTION_STATUSES.has(assertion.status)) issues.push(`${path}.status is invalid`);
  if (!ASSERTION_SEVERITIES.has(assertion.severity)) issues.push(`${path}.severity is invalid`);
  return issues;
}

export function validateStepRecord(step: ScenarioStepRecord, path = "step"): string[] {
  const issues: string[] = [];
  requireNonEmpty(`${path}.step_id`, step.step_id, issues);
  requireNonEmpty(`${path}.name`, step.name, issues);
  if (step.order < 1) issues.push(`${path}.order must be greater than 0`);
  if (!STEP_STATUSES.has(step.status)) issues.push(`${path}.status is invalid`);
  if (step.duration_ms < 0) issues.push(`${path}.duration_ms must not be negative`);
  return issues;
}

export function validateRunResult(result: ScenarioRunResult): string[] {
  const issues: string[] = [];
  requireNonEmpty("run_id", result.run_id, issues);
  requireNonEmpty("scenario.scenario_id", result.scenario.scenario_id, issues);
  requireNonEmpty("scenario.version", result.scenario.version, issues);
  requireNonEmpty("scenario.title", result.scenario.title, issues);
  requireNonEmpty("environment.label", result.environment.label, issues);
  requireNonEmpty("started_at", result.started_at, issues);
  requireNonEmpty("ended_at", result.ended_at, issues);
  requireNonEmpty("summary", result.summary, issues);
  if (!RUN_STATUSES.has(result.status)) issues.push("status is invalid");
  if (result.duration_ms < 0) issues.push("duration_ms must not be negative");
  if (result.steps.length === 0) issues.push("steps must contain at least one step");

  result.steps.forEach((step, index) => {
    issues.push(...validateStepRecord(step, `steps[${index}]`));
  });
  result.assertions.forEach((assertion, index) => {
    issues.push(...validateAssertion(assertion, `assertions[${index}]`));
  });
  result.artifacts.forEach((artifact, index) => {
    issues.push(...validateArtifact(artifact, `artifacts[${index}]`));
  });
  return issues;
}

export function assertValidRunResult(result: ScenarioRunResult): void {
  const issues = validateRunResult(result);
  if (issues.length > 0) throw new HarnessValidationError(issues);
}

function requireNonEmpty(path: string, value: string, issues: string[]): void {
  if (value.trim() === "") issues.push(`${path} must be non-empty`);
}
