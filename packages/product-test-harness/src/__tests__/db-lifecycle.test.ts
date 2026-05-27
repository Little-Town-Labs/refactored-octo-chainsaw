import {
  containsDatabaseUrl,
  ProductDatabaseLifecycleError,
  redactDatabaseUrl,
  renderJsonReport,
  renderMarkdownReport,
  runScenarioWithDatabaseLifecycle,
  type ProductDatabaseLifecycleMetadata,
  type ProductScenario,
} from "../index.js";
import type { ProductBranchManager } from "../db/lifecycle.js";

const rawDatabaseUrl = "postgresql://user:password@localhost:5432/spyglass_test?sslmode=require";

const clock = (): (() => Date) => {
  let tick = 0;
  return () => new Date(Date.UTC(2026, 4, 27, 13, 0, tick++));
};

describe("product database lifecycle", () => {
  it("redacts database URLs for report-safe metadata", () => {
    const redacted = redactDatabaseUrl(rawDatabaseUrl);

    expect(containsDatabaseUrl(rawDatabaseUrl)).toBe(true);
    expect(redacted).toContain("[redacted]");
    expect(redacted).not.toContain("user:password");
    expect(redacted).not.toContain("sslmode");
  });

  it("creates a branch before migration and passes database context to the scenario", async () => {
    const calls: string[] = [];
    const scenario = scenarioWithStep((context) => {
      calls.push(`scenario:${context.database?.branch_id}`);
      return {
        status: context.database?.database_url === rawDatabaseUrl ? "passed" : "failed",
        metadata: { safe_database_ref: context.database?.safe_database_ref },
      };
    });

    const result = await runScenarioWithDatabaseLifecycle({
      scenario,
      lifecycle: lifecycleConfig(),
      scenario_options: scenarioOptions(),
      branch_manager: fakeBranchManager(calls),
      migration_runner: () => {
        calls.push("migrate");
        return Promise.resolve();
      },
    });

    expect(result.status).toBe("passed");
    expect(calls).toEqual([
      "create:pth-test-pth-db-lifecycle-test",
      "migrate",
      "scenario:br-test",
      "delete:br-test",
    ]);
    expect(lifecycleMetadata(result).branch).toMatchObject({
      branch_id: "br-test",
      parent_branch_id: "br-parent",
    });
  });

  it("records safe branch metadata without exposing the raw database URL", async () => {
    const result = await successfulLifecycle();
    const metadata = lifecycleMetadata(result);
    const json = renderJsonReport(result);
    const markdown = renderMarkdownReport(result);

    expect(metadata.branch?.safe_database_ref).toBe("localhost:5432/spyglass_test");
    expect(json).not.toContain(rawDatabaseUrl);
    expect(markdown).not.toContain(rawDatabaseUrl);
    expect(json).not.toContain("user:password");
  });

  it("runs migration before the scenario callback", async () => {
    const calls: string[] = [];
    await successfulLifecycle({ calls });

    expect(calls.indexOf("migrate")).toBeLessThan(calls.indexOf("scenario"));
  });

  it("skips scenario execution when migration fails and still attempts cleanup", async () => {
    const calls: string[] = [];
    const result = await runScenarioWithDatabaseLifecycle({
      scenario: scenarioWithStep(() => {
        calls.push("scenario");
        return { status: "passed" };
      }),
      lifecycle: lifecycleConfig(),
      scenario_options: scenarioOptions(),
      branch_manager: fakeBranchManager(calls),
      migration_runner: () => {
        calls.push("migrate");
        throw new Error(`migration failed for ${rawDatabaseUrl}`);
      },
    });

    expect(result.status).toBe("failed");
    expect(calls).toEqual(["create:pth-test-pth-db-lifecycle-test", "migrate", "delete:br-test"]);
    expect(lifecycleMetadata(result).migration).toMatchObject({
      status: "failed",
      error: "migration failed for [redacted-database-url]",
    });
    expect(renderJsonReport(result)).not.toContain(rawDatabaseUrl);
  });

  it("cleans up after scenario failure", async () => {
    const calls: string[] = [];
    const result = await runScenarioWithDatabaseLifecycle({
      scenario: scenarioWithStep(() => {
        calls.push("scenario");
        return {
          status: "failed",
          assertions: [
            {
              assertion_id: "scenario-failed",
              name: "Scenario failed",
              severity: "blocker",
              status: "failed",
              expected: "pass",
              actual: `failed against ${rawDatabaseUrl}`,
            },
          ],
        };
      }),
      lifecycle: lifecycleConfig(),
      scenario_options: scenarioOptions(),
      branch_manager: fakeBranchManager(calls),
      migration_runner: () => {
        calls.push("migrate");
        return Promise.resolve();
      },
    });

    expect(result.status).toBe("failed");
    expect(calls).toContain("delete:br-test");
    expect(lifecycleMetadata(result).cleanup.status).toBe("deleted");
    expect(renderJsonReport(result)).not.toContain(rawDatabaseUrl);
  });

  it("requires a retain reason when cleanup policy can retain a branch", async () => {
    await expect(
      runScenarioWithDatabaseLifecycle({
        scenario: scenarioWithStep(() => ({ status: "passed" })),
        lifecycle: { ...lifecycleConfig(), cleanup_policy: "retain_always" },
        scenario_options: scenarioOptions(),
        branch_manager: fakeBranchManager([]),
        migration_runner: () => Promise.resolve(),
      }),
    ).rejects.toThrow(ProductDatabaseLifecycleError);
  });

  it("records retained branch policy with an explicit reason", async () => {
    const result = await runScenarioWithDatabaseLifecycle({
      scenario: scenarioWithStep(() => ({ status: "passed" })),
      lifecycle: {
        ...lifecycleConfig(),
        cleanup_policy: "retain_always",
        retain_reason: "debugging failed alpha gate fixture",
      },
      scenario_options: scenarioOptions(),
      branch_manager: fakeBranchManager([]),
      migration_runner: () => Promise.resolve(),
    });

    expect(lifecycleMetadata(result).cleanup).toMatchObject({
      status: "retained",
      reason: "debugging failed alpha gate fixture",
    });
  });

  it("records cleanup failure independently from scenario status", async () => {
    const result = await runScenarioWithDatabaseLifecycle({
      scenario: scenarioWithStep(() => ({ status: "passed" })),
      lifecycle: lifecycleConfig(),
      scenario_options: scenarioOptions(),
      branch_manager: fakeBranchManager([], { failDelete: true }),
      migration_runner: () => Promise.resolve(),
    });

    expect(result.status).toBe("passed");
    expect(lifecycleMetadata(result).cleanup).toMatchObject({
      status: "failed",
      reason: "delete failed",
    });
  });

  it("records seed metadata before scenario execution", async () => {
    const calls: string[] = [];
    const result = await runScenarioWithDatabaseLifecycle({
      scenario: scenarioWithStep(() => {
        calls.push("scenario");
        return { status: "passed" };
      }),
      lifecycle: lifecycleConfig(),
      scenario_options: scenarioOptions(),
      branch_manager: fakeBranchManager(calls),
      migration_runner: () => {
        calls.push("migrate");
        return Promise.resolve();
      },
      seed: () => {
        calls.push("seed");
        return { seed_version: "seed-v1", seed_refs: ["seed://synthetic/seeker"] };
      },
    });

    expect(calls.indexOf("seed")).toBeLessThan(calls.indexOf("scenario"));
    expect(lifecycleMetadata(result).seed).toMatchObject({
      status: "passed",
      seed_version: "seed-v1",
      seed_refs: ["seed://synthetic/seeker"],
    });
  });

  it("skips scenario execution when seed fails and still attempts cleanup", async () => {
    const calls: string[] = [];
    const result = await runScenarioWithDatabaseLifecycle({
      scenario: scenarioWithStep(() => {
        calls.push("scenario");
        return { status: "passed" };
      }),
      lifecycle: lifecycleConfig(),
      scenario_options: scenarioOptions(),
      branch_manager: fakeBranchManager(calls),
      migration_runner: () => {
        calls.push("migrate");
        return Promise.resolve();
      },
      seed: () => {
        calls.push("seed");
        throw new Error("seed failed");
      },
    });

    expect(result.status).toBe("failed");
    expect(calls).toEqual([
      "create:pth-test-pth-db-lifecycle-test",
      "migrate",
      "seed",
      "delete:br-test",
    ]);
    expect(lifecycleMetadata(result).seed).toMatchObject({
      status: "failed",
      error: "seed failed",
    });
  });
});

async function successfulLifecycle(input?: { calls?: string[] }) {
  const calls = input?.calls ?? [];
  return runScenarioWithDatabaseLifecycle({
    scenario: scenarioWithStep(() => {
      calls.push("scenario");
      return {
        status: "passed",
        metadata: { attempted_leak: rawDatabaseUrl },
      };
    }),
    lifecycle: lifecycleConfig(),
    scenario_options: scenarioOptions(),
    branch_manager: fakeBranchManager(calls),
    migration_runner: () => {
      calls.push("migrate");
      return Promise.resolve();
    },
  });
}

function scenarioWithStep(run: ProductScenario["steps"][number]["run"]): ProductScenario {
  return {
    scenario_id: "pth.db.lifecycle",
    version: "1.0.0",
    title: "Database lifecycle test",
    mode: "gate",
    steps: [{ step_id: "exercise-lifecycle", name: "Exercise lifecycle", run }],
  };
}

function lifecycleConfig() {
  return {
    parent_branch_id: "br-parent",
    branch_name_prefix: "pth-test",
    migrations_folder: "packages/db/migrations",
    cleanup_policy: "always_delete" as const,
  };
}

function scenarioOptions() {
  return {
    run_id: "pth-db-lifecycle-test",
    environment: { label: "unit-test" },
    now: clock(),
  };
}

function fakeBranchManager(
  calls: string[],
  options?: { failDelete?: boolean },
): ProductBranchManager {
  return {
    async createBranch(name) {
      calls.push(`create:${name}`);
      return {
        id: "br-test",
        name,
        connectionUrl: rawDatabaseUrl,
      };
    },
    async deleteBranch(branchId) {
      calls.push(`delete:${branchId}`);
      if (options?.failDelete) throw new Error("delete failed");
    },
  };
}

function lifecycleMetadata(result: {
  readonly metadata?: Record<string, unknown>;
}): ProductDatabaseLifecycleMetadata {
  return result.metadata?.product_database_lifecycle as ProductDatabaseLifecycleMetadata;
}
