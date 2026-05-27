# Quickstart: Product Harness Skeleton

## Goal

Verify that PTH01 can run a deterministic sample product-readiness scenario and emit both machine-readable and human-readable reports without calling external services.

## Prerequisites

- Dependencies installed with `pnpm install`.
- Node and pnpm versions match the workspace root.

## Scenario

Run the sample no-op product scenario.

Expected behavior:

- The scenario completes in gate mode.
- The result includes one or more ordered steps.
- The result includes passing assertions.
- The result includes artifact references for JSON and Markdown report outputs.
- JSON and Markdown reports agree on scenario id, mode, status, step count, assertion count, and artifact count.

## Validation Commands

```bash
pnpm --filter @spyglass/product-test-harness build
pnpm --filter @spyglass/product-test-harness type-check
pnpm --filter @spyglass/product-test-harness test
pnpm --filter @spyglass/product-test-harness run:sample
```

## Acceptance Checklist

- [ ] Sample scenario produces a JSON result.
- [ ] Sample scenario produces a Markdown summary.
- [ ] A failed assertion fixture fails the overall scenario.
- [ ] Invalid artifacts are rejected.
- [ ] No sample output contains real secrets or production user data.
