# Integration Test Harness

Scenario-level integration tests live alongside their owning package
under `tests/integration/`. They exercise real F-number flows
end-to-end (no mocks of internal logic) and form the executable record
of each feature's quickstart gate.

The harness lives in `@spyglass/test-harness` and provides:

| Export | Purpose |
|---|---|
| `NeonBranchManager` | Create / delete copy-on-write Neon branches per test run |
| `applyMigrations` | Run drizzle-kit migrations against a connection URL |
| `InMemoryAuditSink` | Assertable double for `AuditEventSink` |
| `FakeClock` | Deterministic `now()` for expiry / rotation tests |

## Local run

```bash
# Unit tests only (fast, offline, default)
pnpm test

# Integration suites (currently skips Neon-specific bits if secrets absent)
pnpm test:integration
```

To run integration tests against a real Neon branch locally, set in
`.env.local`:

```
NEON_API_KEY=<personal API key from console.neon.tech>
NEON_PROJECT_ID=<project ID>
```

The harness is opt-in. Tests that don't need Neon (the current
Scenario 5, which uses in-memory repos) run unconditionally.

## CI

`.github/workflows/integration.yml` is **opt-in**: it does not run on
every PR. Triggers:

- **Manual** — Actions tab → Run workflow
- **Per-PR** — add the `integration` label

Secrets live under the **`ci` GitHub environment**:

- `NEON_API_KEY` — Bearer token for Neon REST
- `NEON_PROJECT_ID` — target project
- `NEON_PARENT_BRANCH_ID` *(optional)* — fork from a specific baseline

Orphaned branches (named `test-*`, older than 1h) are swept by
`scripts/neon-cleanup-branches.sh` in the workflow's `always()` step.

## Adding a new scenario

1. Pick the owning package (e.g. `packages/auth`).
2. Create `tests/integration/scenario-N.integration.test.ts`.
3. Import doubles from `@spyglass/test-harness`:
   ```ts
   import { InMemoryAuditSink, FakeClock, NeonBranchManager } from "@spyglass/test-harness";
   ```
4. If your scenario needs a real database (i.e. Drizzle-backed repos),
   create a Neon branch in `beforeAll` and delete it in `afterAll`.
   The current Scenario 5 does *not* — it predates the Drizzle-backed
   `ServiceCredentialRepo`. When that repo lands, swap the in-memory
   double for a Neon-backed one.
5. Reference the scenario by **quickstart number** in the test
   description so the gate trace is obvious in CI logs.

## Per-file branch lifecycle (when needed)

```ts
import { NeonBranchManager, applyMigrations } from "@spyglass/test-harness";

let branch: { id: string; connectionUrl: string };

beforeAll(async () => {
  if (!process.env.NEON_API_KEY || !process.env.NEON_PROJECT_ID) {
    return; // skip — harness is opt-in for unit-test parity
  }
  const mgr = new NeonBranchManager({
    apiKey: process.env.NEON_API_KEY,
    projectId: process.env.NEON_PROJECT_ID,
    parentBranchId: process.env.NEON_PARENT_BRANCH_ID,
  });
  branch = await mgr.createBranch(`test-${Date.now()}`);
  await applyMigrations({
    connectionUrl: branch.connectionUrl,
    migrationsFolder: "../../packages/db/migrations",
  });
});

afterAll(async () => {
  if (!branch) return;
  const mgr = new NeonBranchManager({
    apiKey: process.env.NEON_API_KEY!,
    projectId: process.env.NEON_PROJECT_ID!,
  });
  await mgr.deleteBranch(branch.id);
});
```

## Why integration tests matter (and what's next)

The harness is the seam where the future eval / observability layer
will plug in: the `InMemoryAuditSink` doubles as a trace recorder,
`FakeClock` gives deterministic replay, and Neon branches give a
fresh real database per run. As more scenarios land, the same harness
can capture golden outputs and latency budgets from the NFR set.
