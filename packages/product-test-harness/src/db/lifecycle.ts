import { applyMigrations, NeonBranchManager, type NeonBranch } from "@spyglass/test-harness";

import type {
  ProductCleanupResult,
  ProductDatabaseBranchContext,
  ProductDatabaseCleanupPolicy,
  ProductDatabaseLifecycleConfig,
  ProductDatabaseLifecycleMetadata,
  ProductMigrationExecution,
  ProductScenario,
  ProductSeedExecution,
  ProductSeedOutput,
  RunScenarioOptions,
  ScenarioRunResult,
  ScenarioStepRecord,
} from "../contracts.js";
import { runScenario } from "../runner.js";
import {
  assertValidProductDatabaseLifecycleMetadata,
  assertValidRunResult,
} from "../validation.js";
import { redactDatabaseUrls } from "./redaction.js";

export interface ProductBranchManager {
  createBranch(name: string): Promise<NeonBranch>;
  deleteBranch(branchId: string): Promise<void>;
}

export type ProductMigrationRunner = (input: {
  readonly database_url: string;
  readonly migrations_folder: string;
}) => Promise<void>;

export type ProductSeedCallback = (
  context: ProductDatabaseBranchContext,
) => Promise<ProductSeedOutput> | ProductSeedOutput;

export interface RunScenarioWithDatabaseLifecycleOptions {
  readonly scenario: ProductScenario;
  readonly lifecycle: ProductDatabaseLifecycleConfig;
  readonly scenario_options: RunScenarioOptions;
  readonly branch_manager: ProductBranchManager;
  readonly migration_runner: ProductMigrationRunner;
  readonly seed?: ProductSeedCallback;
}

export interface CreateNeonLifecycleDependenciesOptions {
  readonly api_key: string;
  readonly project_id: string;
  readonly parent_branch_id?: string;
  readonly api_base?: string;
}

export class ProductDatabaseLifecycleError extends Error {
  constructor(
    readonly phase: "configuration" | "branch" | "migration" | "seed" | "scenario" | "cleanup",
    message: string,
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ProductDatabaseLifecycleError";
  }
}

export async function runScenarioWithDatabaseLifecycle(
  options: RunScenarioWithDatabaseLifecycleOptions,
): Promise<ScenarioRunResult> {
  assertLifecycleConfig(options.lifecycle);
  const now = options.scenario_options.now ?? (() => new Date());
  const cleanupPolicy = options.lifecycle.cleanup_policy ?? "always_delete";
  const runId =
    options.scenario_options.run_id ?? `${options.scenario.scenario_id}:${Date.now().toString(36)}`;
  const branchName = `${options.lifecycle.branch_name_prefix}-${runId}`.replace(
    /[^a-zA-Z0-9_-]/g,
    "-",
  );
  let branchContext: ProductDatabaseBranchContext | undefined;
  let result: ScenarioRunResult | undefined;
  let terminalError: ProductDatabaseLifecycleError | undefined;
  let migration: ProductMigrationExecution = {
    status: "not_started",
    migrations_folder: options.lifecycle.migrations_folder,
  };
  let seed: ProductSeedExecution = options.seed
    ? {
        status: "not_started",
        ...(options.lifecycle.seed_version ? { seed_version: options.lifecycle.seed_version } : {}),
      }
    : {
        status: "not_configured",
        ...(options.lifecycle.seed_version ? { seed_version: options.lifecycle.seed_version } : {}),
      };

  try {
    const branch = await options.branch_manager.createBranch(branchName);
    branchContext = {
      branch_id: branch.id,
      branch_name: branch.name,
      parent_branch_id: options.lifecycle.parent_branch_id,
      database_url: branch.connectionUrl,
      safe_database_ref: safeDatabaseRef(branch.connectionUrl),
    };

    migration = await executeMigration(
      options.migration_runner,
      branchContext,
      options.lifecycle,
      now,
    );
    if (migration.status === "failed") {
      terminalError = new ProductDatabaseLifecycleError(
        "migration",
        migration.error ?? "Migration failed",
      );
    } else if (options.seed) {
      seed = await executeSeed(options.seed, branchContext, options.lifecycle, now);
      if (seed.status === "failed") {
        terminalError = new ProductDatabaseLifecycleError("seed", seed.error ?? "Seed failed");
      }
    }

    if (!terminalError) {
      try {
        result = await runScenario(options.scenario, {
          ...options.scenario_options,
          run_id: runId,
          database: branchContext,
        });
      } catch (err) {
        terminalError = new ProductDatabaseLifecycleError("scenario", safeErrorSummary(err), err);
      }
    }
  } catch (err) {
    terminalError =
      err instanceof ProductDatabaseLifecycleError
        ? err
        : new ProductDatabaseLifecycleError("branch", safeErrorSummary(err), err);
  }

  const cleanup = await cleanupBranch({
    branchContext,
    branchManager: options.branch_manager,
    cleanupPolicy,
    retainReason: options.lifecycle.retain_reason,
    runPassed: result?.status === "passed" && !terminalError,
    now,
  });

  const lifecycleMetadata = buildLifecycleMetadata({
    branchContext,
    migration,
    seed,
    cleanup,
  });

  if (!result) {
    result = buildLifecycleFailureResult({
      scenario: options.scenario,
      options: options.scenario_options,
      runId,
      error: terminalError,
      lifecycleMetadata,
      now,
    });
  } else {
    result = {
      ...result,
      metadata: {
        ...(result.metadata ?? {}),
        product_database_lifecycle: lifecycleMetadata,
      },
    };
  }

  result = redactRunResult(result);
  assertValidProductDatabaseLifecycleMetadata(lifecycleMetadata);
  assertValidRunResult(result);
  return result;
}

export function createNeonLifecycleDependencies(options: CreateNeonLifecycleDependenciesOptions): {
  readonly branch_manager: ProductBranchManager;
  readonly migration_runner: ProductMigrationRunner;
} {
  return {
    branch_manager: new NeonBranchManager({
      apiKey: options.api_key,
      projectId: options.project_id,
      ...(options.parent_branch_id ? { parentBranchId: options.parent_branch_id } : {}),
      ...(options.api_base ? { apiBase: options.api_base } : {}),
    }),
    migration_runner: ({ database_url, migrations_folder }) =>
      applyMigrations({ connectionUrl: database_url, migrationsFolder: migrations_folder }),
  };
}

function assertLifecycleConfig(config: ProductDatabaseLifecycleConfig): void {
  const cleanupPolicy = config.cleanup_policy ?? "always_delete";
  const issues: string[] = [];
  if (config.parent_branch_id.trim() === "") issues.push("parent_branch_id must be non-empty");
  if (config.branch_name_prefix.trim() === "") issues.push("branch_name_prefix must be non-empty");
  if (config.migrations_folder.trim() === "") issues.push("migrations_folder must be non-empty");
  if (
    (cleanupPolicy === "retain_always" || cleanupPolicy === "retain_on_failure") &&
    !config.retain_reason?.trim()
  ) {
    issues.push("retain_reason is required when cleanup policy can retain a branch");
  }
  if (issues.length > 0) {
    throw new ProductDatabaseLifecycleError("configuration", issues.join("; "));
  }
}

async function executeMigration(
  migrationRunner: ProductMigrationRunner,
  branchContext: ProductDatabaseBranchContext,
  lifecycle: ProductDatabaseLifecycleConfig,
  now: () => Date,
): Promise<ProductMigrationExecution> {
  const startedAt = now();
  try {
    await migrationRunner({
      database_url: branchContext.database_url,
      migrations_folder: lifecycle.migrations_folder,
    });
    const endedAt = now();
    return {
      status: "passed",
      migrations_folder: lifecycle.migrations_folder,
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      duration_ms: durationMs(startedAt, endedAt),
    };
  } catch (err) {
    const endedAt = now();
    return {
      status: "failed",
      migrations_folder: lifecycle.migrations_folder,
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      duration_ms: durationMs(startedAt, endedAt),
      error: safeErrorSummary(err),
    };
  }
}

async function executeSeed(
  seedCallback: ProductSeedCallback,
  branchContext: ProductDatabaseBranchContext,
  lifecycle: ProductDatabaseLifecycleConfig,
  now: () => Date,
): Promise<ProductSeedExecution> {
  const startedAt = now();
  try {
    const output = await seedCallback(branchContext);
    const endedAt = now();
    const seedVersion = output.seed_version ?? lifecycle.seed_version;
    return {
      status: "passed",
      ...(seedVersion ? { seed_version: seedVersion } : {}),
      ...(output.seed_refs ? { seed_refs: output.seed_refs } : {}),
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      duration_ms: durationMs(startedAt, endedAt),
    };
  } catch (err) {
    const endedAt = now();
    return {
      status: "failed",
      ...(lifecycle.seed_version ? { seed_version: lifecycle.seed_version } : {}),
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      duration_ms: durationMs(startedAt, endedAt),
      error: safeErrorSummary(err),
    };
  }
}

async function cleanupBranch(input: {
  readonly branchContext: ProductDatabaseBranchContext | undefined;
  readonly branchManager: ProductBranchManager;
  readonly cleanupPolicy: ProductDatabaseCleanupPolicy;
  readonly retainReason: string | undefined;
  readonly runPassed: boolean;
  readonly now: () => Date;
}): Promise<ProductCleanupResult> {
  if (!input.branchContext) {
    return { status: "not_created", policy: input.cleanupPolicy };
  }
  const retainReason = shouldRetain(input.cleanupPolicy, input.runPassed)
    ? input.retainReason
    : undefined;
  if (retainReason) {
    return { status: "retained", policy: input.cleanupPolicy, reason: retainReason };
  }
  const startedAt = input.now();
  try {
    await input.branchManager.deleteBranch(input.branchContext.branch_id);
    const endedAt = input.now();
    return {
      status: "deleted",
      policy: input.cleanupPolicy,
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      duration_ms: durationMs(startedAt, endedAt),
    };
  } catch (err) {
    const endedAt = input.now();
    return {
      status: "failed",
      policy: input.cleanupPolicy,
      reason: safeErrorSummary(err),
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      duration_ms: durationMs(startedAt, endedAt),
    };
  }
}

function shouldRetain(policy: ProductDatabaseCleanupPolicy, runPassed: boolean): boolean {
  if (policy === "retain_always") return true;
  if (policy === "retain_on_failure") return !runPassed;
  if (policy === "delete_on_success") return !runPassed;
  return false;
}

function buildLifecycleMetadata(input: {
  readonly branchContext: ProductDatabaseBranchContext | undefined;
  readonly migration: ProductMigrationExecution;
  readonly seed: ProductSeedExecution;
  readonly cleanup: ProductCleanupResult;
}): ProductDatabaseLifecycleMetadata {
  return {
    adapter: "neon",
    ...(input.branchContext
      ? {
          branch: {
            branch_id: input.branchContext.branch_id,
            branch_name: input.branchContext.branch_name,
            parent_branch_id: input.branchContext.parent_branch_id,
            safe_database_ref: input.branchContext.safe_database_ref,
          },
        }
      : {}),
    migration: input.migration,
    seed: input.seed,
    cleanup: input.cleanup,
    redaction: {
      database_url_redacted: true,
      redaction_strategy: "url credentials and query removed before metadata serialization",
    },
  };
}

function buildLifecycleFailureResult(input: {
  readonly scenario: ProductScenario;
  readonly options: RunScenarioOptions;
  readonly runId: string;
  readonly error: ProductDatabaseLifecycleError | undefined;
  readonly lifecycleMetadata: ProductDatabaseLifecycleMetadata;
  readonly now: () => Date;
}): ScenarioRunResult {
  const startedAt = input.now();
  const endedAt = input.now();
  const step: ScenarioStepRecord = {
    step_id: `db-lifecycle-${input.error?.phase ?? "unknown"}`,
    order: 1,
    name: "Database lifecycle setup",
    status: "failed",
    started_at: startedAt.toISOString(),
    ended_at: endedAt.toISOString(),
    duration_ms: durationMs(startedAt, endedAt),
    error: input.error?.message ?? "Database lifecycle failed",
  };

  return {
    run_id: input.runId,
    scenario: {
      scenario_id: input.scenario.scenario_id,
      version: input.scenario.version,
      title: input.scenario.title,
      ...(input.scenario.description ? { description: input.scenario.description } : {}),
      mode: input.scenario.mode,
      ...(input.scenario.owner ? { owner: input.scenario.owner } : {}),
      ...(input.scenario.tags ? { tags: input.scenario.tags } : {}),
    },
    environment: input.options.environment,
    ...(input.options.git ? { git: input.options.git } : {}),
    started_at: startedAt.toISOString(),
    ended_at: endedAt.toISOString(),
    duration_ms: durationMs(startedAt, endedAt),
    status: "failed",
    steps: [step],
    assertions: [],
    artifacts: [],
    summary: `${input.scenario.scenario_id} failed during database lifecycle: ${step.error}`,
    metadata: {
      ...(input.options.metadata ?? {}),
      product_database_lifecycle: input.lifecycleMetadata,
    },
  };
}

function safeDatabaseRef(databaseUrl: string): string {
  try {
    const url = new URL(databaseUrl);
    return `${url.host}${url.pathname}`;
  } catch {
    return "[redacted-database-ref]";
  }
}

function redactRunResult(result: ScenarioRunResult): ScenarioRunResult {
  return JSON.parse(
    JSON.stringify(result, (_key, value: unknown) =>
      typeof value === "string" ? redactDatabaseUrls(value) : value,
    ),
  ) as ScenarioRunResult;
}

function durationMs(startedAt: Date, endedAt: Date): number {
  return Math.max(0, endedAt.getTime() - startedAt.getTime());
}

function safeErrorSummary(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  return redactDatabaseUrls(message.replace(/(secret|token|key)=\S+/gi, "$1=[redacted]")).slice(
    0,
    500,
  );
}
