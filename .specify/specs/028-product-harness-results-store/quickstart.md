# Quickstart: Product Harness Results Store

## Validate the Package

```bash
pnpm --filter @spyglass/product-test-harness test -- --runInBand
pnpm --filter @spyglass/product-test-harness type-check
pnpm --filter @spyglass/product-test-harness build
pnpm --filter @spyglass/product-test-harness lint
```

## Run the Local Result Store Sample

```bash
pnpm --filter @spyglass/product-test-harness run:result-store-sample
```

Expected behavior:

- The sample runs without external services.
- A product harness result snapshot is saved to a temporary local store.
- The stored run is loaded by run id.
- A filtered list returns the saved gate run.
- No raw database URLs or secret-bearing values are printed.

Validated output on 2026-05-27:

```text
"save": {
  "run_id": "pth-sample-result-store",
  "created": true,
  "idempotent": false
}
"loaded_run_id": "pth-sample-result-store"
"listed_runs": ["pth-sample-result-store"]
"artifact_count": 1
```

## Use the Store in Code

```ts
import {
  createProductResultStoreSnapshot,
  LocalFileProductResultStore,
  runNoopScenario,
} from "@spyglass/product-test-harness";

const result = await runNoopScenario();
const store = new LocalFileProductResultStore({ directory: ".tmp/product-results" });
const snapshot = createProductResultStoreSnapshot(result);

await store.saveRun(snapshot);

const loaded = await store.getRun(result.run_id);
const failedGateRuns = await store.listRuns({
  mode: "gate",
  status: "failed",
});
```

## Scope Notes

- PTH03 uses local files for deterministic development and CI.
- A later adapter can map the same snapshot contract to a Neon test-control database or isolated schema.
- Specialized evidence categories may be empty until later roadmap slices populate seeds, browser artifacts, webhook captures, observability assertions, and persona invocations.
