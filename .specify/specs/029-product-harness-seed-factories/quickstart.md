# Quickstart: Product Harness Seed Factories

## Goal

Verify that PTH04 can generate deterministic synthetic seed bundles, validate relationship and compliance posture, integrate with the lifecycle seed callback, and persist seed records through the local result store without external services.

## Commands

```bash
pnpm --filter @spyglass/product-test-harness test -- seed-factories
pnpm --filter @spyglass/product-test-harness type-check
pnpm --filter @spyglass/product-test-harness build
pnpm --filter @spyglass/product-test-harness run:seed-factory-sample
```

## Expected Evidence

- The seed factory test suite proves byte-stable replay for identical fixture input.
- The Alpha happy-path fixture includes all required seed entity categories.
- Missing-consent and jurisdiction-kill-switch fixtures validate as explicit denial states.
- Invalid bundles with duplicate ids, dangling refs, missing bias evidence, or unsafe metadata are rejected before application.
- The sample prints a safe run summary and persists seed records through the local result store.

## No External Services

This quickstart must not require Neon credentials, Vercel URLs, Browserbase credentials, Pi credentials, or live webhook endpoints.

## Run Evidence

Validated on 2026-05-27:

- `pnpm --filter @spyglass/product-test-harness test -- seed-factories`: 1 suite, 9 tests passed.
- `pnpm --filter @spyglass/product-test-harness test`: 6 suites, 41 tests passed.
- `pnpm --filter @spyglass/product-test-harness type-check`: passed.
- `pnpm --filter @spyglass/product-test-harness build`: passed.
- `pnpm --filter @spyglass/product-test-harness lint`: passed.
- `pnpm --filter @spyglass/product-test-harness run:seed-factory-sample`: produced `alpha-happy-path`, 22 entities, 22 seed records, dry-run application status.
