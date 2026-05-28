# Quickstart: PTH12 Durable Artifact Storage

## Local Validation

```bash
pnpm --filter @spyglass/product-test-harness test -- artifact-storage
pnpm --filter @spyglass/product-test-harness type-check
pnpm --filter @spyglass/product-test-harness lint
pnpm --filter @spyglass/product-test-harness build
pnpm format:check
```

## Local Usage

```ts
import {
  LocalFileProductArtifactStore,
  toRunArtifact,
} from "@spyglass/product-test-harness";

const store = new LocalFileProductArtifactStore({
  directory: ".harness-artifacts",
});

const { artifact } = await store.saveArtifact({
  artifact_id: "run-1-report",
  run_id: "run-1",
  scenario_id: "alpha.gate",
  label: "Run report",
  type: "json",
  content: JSON.stringify({ ok: true }),
  content_type: "application/json",
  redaction_status: "not_required",
  retention_class: "ci_artifact",
});

snapshot.run.artifacts.push(toRunArtifact(artifact));
```

Future Vercel Blob wiring should implement the same `ProductArtifactStore` contract and use the same `RunArtifact` metadata boundary.
