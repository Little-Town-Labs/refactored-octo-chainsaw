import type { ProductScenario } from "../contracts.js";
import { runScenarioWithDatabaseLifecycle } from "../db/lifecycle.js";
import { renderJsonReport } from "../reports/json.js";
import { renderMarkdownReport } from "../reports/markdown.js";

const sampleDatabaseUrl = "postgresql://sample_user:sample_password@localhost:5432/spyglass_test";

export const neonLifecycleScenario: ProductScenario = {
  scenario_id: "pth.sample.neon-lifecycle",
  version: "1.0.0",
  title: "Product harness Neon lifecycle sample",
  description: "Synthetic no-external-service sample for PTH02 lifecycle ordering and redaction.",
  mode: "gate",
  owner: "product-readiness",
  tags: ["sample", "synthetic", "neon-lifecycle"],
  steps: [
    {
      step_id: "verify-database-context",
      name: "Verify database context",
      run: (context) => ({
        status: context.database?.database_url === sampleDatabaseUrl ? "passed" : "failed",
        assertions: [
          {
            assertion_id: "database-context-available",
            name: "Database URL is callback-only",
            severity: "blocker",
            status: context.database?.database_url === sampleDatabaseUrl ? "passed" : "failed",
            expected: "scenario callback receives branch-scoped database URL",
            actual: context.database?.database_url
              ? "database URL received"
              : "database URL missing",
          },
        ],
        metadata: {
          branch_id: context.database?.branch_id,
          safe_database_ref: context.database?.safe_database_ref,
        },
      }),
    },
  ],
};

export async function runNeonLifecycleScenario(): Promise<string> {
  const calls: string[] = [];
  const result = await runScenarioWithDatabaseLifecycle({
    scenario: neonLifecycleScenario,
    lifecycle: {
      parent_branch_id: "br-parent-sample",
      branch_name_prefix: "pth-sample",
      migrations_folder: "packages/db/migrations",
      cleanup_policy: "always_delete",
      seed_version: "sample-seed-v1",
    },
    scenario_options: {
      run_id: "pth-sample-neon-lifecycle",
      environment: { label: "local-sample" },
      git: { ref: "local" },
      now: fixedClock(),
    },
    branch_manager: {
      async createBranch(name) {
        calls.push(`create:${name}`);
        return {
          id: "br-sample-lifecycle",
          name,
          connectionUrl: sampleDatabaseUrl,
        };
      },
      async deleteBranch(branchId) {
        calls.push(`delete:${branchId}`);
      },
    },
    migration_runner: () => {
      calls.push("migrate");
      return Promise.resolve();
    },
    seed: () => {
      calls.push("seed");
      return { seed_version: "sample-seed-v1", seed_refs: ["seed://sample/persona"] };
    },
  });

  return `${renderJsonReport(result)}\n${renderMarkdownReport(result)}\nLifecycle calls: ${calls.join(
    " -> ",
  )}`;
}

function fixedClock(): () => Date {
  let tick = 0;
  return () => new Date(Date.UTC(2026, 4, 27, 12, 30, tick++));
}
