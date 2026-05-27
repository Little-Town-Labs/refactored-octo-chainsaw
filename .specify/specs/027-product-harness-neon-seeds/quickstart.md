# Quickstart: Product Harness Neon Seeds

## Purpose

Validate that PTH02 can orchestrate a product database lifecycle without requiring live Neon credentials for the core package tests.

## Offline Validation

Run the package tests:

```bash
pnpm --filter @spyglass/product-test-harness test
```

Expected outcome:

- fake branch creation runs before migration
- migration runs before seed
- seed runs before scenario callback
- cleanup runs after success and failure paths
- JSON/Markdown output does not include raw credential-bearing database URLs

Run type-check:

```bash
pnpm --filter @spyglass/product-test-harness type-check
```

Run build:

```bash
pnpm --filter @spyglass/product-test-harness build
```

Run the no-external-service lifecycle sample after build:

```bash
pnpm --filter @spyglass/product-test-harness run:lifecycle-sample
```

Expected sample output:

- scenario status is `passed`
- lifecycle metadata includes branch id, branch name, parent branch id, migration status, seed status, cleanup status, and redaction evidence
- output does not include a raw `postgres://` or `postgresql://` URL

Observed on 2026-05-27:

- `pnpm --filter @spyglass/product-test-harness test -- --runInBand`: 4 suites passed, 24 tests passed
- `pnpm --filter @spyglass/product-test-harness type-check`: passed
- `pnpm --filter @spyglass/product-test-harness build`: passed
- `pnpm --filter @spyglass/product-test-harness lint`: passed
- `pnpm --filter @spyglass/product-test-harness run:lifecycle-sample`: passed; output recorded deleted cleanup status and no raw database URL

## Future Live Neon Validation

Live Neon validation is intentionally optional for PTH02 and may be introduced as a later CI workflow.

Expected environment inputs:

```bash
NEON_API_KEY=...
NEON_PROJECT_ID=...
NEON_PARENT_BRANCH_ID=...
```

The live path should:

1. Create an ephemeral branch under the configured parent.
2. Apply migrations from `packages/db/migrations`.
3. Run an optional seed callback.
4. Run the product scenario callback with the branch-scoped `DATABASE_URL`.
5. Delete the branch unless an explicit retain policy and reason are provided.
6. Report branch and cleanup metadata without leaking the raw database URL.
