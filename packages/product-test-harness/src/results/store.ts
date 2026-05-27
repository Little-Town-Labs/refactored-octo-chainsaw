import {
  PRODUCT_RESULT_STORE_SCHEMA_VERSION,
  type ProductResultRunSummary,
  type ProductResultStoreSnapshot,
  type ProductResultStoreSnapshotInput,
} from "../contracts.js";
import { HarnessValidationError } from "../validation.js";
import { validateProductResultStoreSnapshot } from "./validation.js";

export class ProductResultStoreError extends Error {
  constructor(
    message: string,
    readonly code: "validation_failed" | "duplicate_conflict" | "read_failed" | "write_failed",
  ) {
    super(message);
    this.name = "ProductResultStoreError";
  }
}

export function createProductResultStoreSnapshot(
  input: ProductResultStoreSnapshotInput,
): ProductResultStoreSnapshot {
  const snapshot: ProductResultStoreSnapshot = {
    schema_version: PRODUCT_RESULT_STORE_SCHEMA_VERSION,
    run: input.run,
    seed_records: input.seed_records ?? [],
    agent_invocations: input.agent_invocations ?? [],
    browser_artifacts: input.browser_artifacts ?? [],
    webhook_captures: input.webhook_captures ?? [],
    observability_assertions: input.observability_assertions ?? [],
    created_at: input.created_at ?? new Date().toISOString(),
  };
  assertValidProductResultStoreSnapshot(snapshot);
  return snapshot;
}

export function assertValidProductResultStoreSnapshot(snapshot: ProductResultStoreSnapshot): void {
  const issues = validateProductResultStoreSnapshot(snapshot);
  if (issues.length > 0) throw new HarnessValidationError(issues);
}

export function summarizeProductResultRun(
  snapshot: ProductResultStoreSnapshot,
): ProductResultRunSummary {
  const summary: ProductResultRunSummary = {
    run_id: snapshot.run.run_id,
    scenario_id: snapshot.run.scenario.scenario_id,
    scenario_version: snapshot.run.scenario.version,
    mode: snapshot.run.scenario.mode,
    status: snapshot.run.status,
    environment_label: snapshot.run.environment.label,
    started_at: snapshot.run.started_at,
    ended_at: snapshot.run.ended_at,
    created_at: snapshot.created_at,
    summary: snapshot.run.summary,
    artifact_count:
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
    assertion_count: snapshot.run.assertions.length + snapshot.observability_assertions.length,
    step_count: snapshot.run.steps.length,
  };
  return {
    ...summary,
    ...(snapshot.run.git?.ref ? { git_ref: snapshot.run.git.ref } : {}),
    ...(snapshot.run.git?.sha ? { git_sha: snapshot.run.git.sha } : {}),
  };
}

export function stableSnapshotString(snapshot: ProductResultStoreSnapshot): string {
  return JSON.stringify(sortForStableString(snapshot));
}

function sortForStableString(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortForStableString);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, sortForStableString(entry)]),
  );
}
