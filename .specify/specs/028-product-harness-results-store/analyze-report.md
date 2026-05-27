# Analyze Report: Product Harness Results Store

**Date**: 2026-05-27
**Feature**: `.specify/specs/028-product-harness-results-store`

## Scope Reviewed

- `spec.md`
- `plan.md`
- `tasks.md`
- `research.md`
- `data-model.md`
- `contracts/result-store.schema.json`
- Implemented package changes under `packages/product-test-harness`

## Findings

No blocking inconsistencies found.

## Cross-Artifact Checks

| Check | Result | Evidence |
|-------|--------|----------|
| Spec user stories map to tasks | PASS | US1 persistence/load is covered by T009-T013; US2 querying is covered by T014-T018; US3 safety/duplicates are covered by T019-T025. |
| Plan matches implementation scope | PASS | Implementation stays within `@spyglass/product-test-harness` and uses an offline local file store. |
| Data model matches contract | PASS | Snapshot, run summary, filter, seed, agent, browser, webhook, and observability entities are represented in TypeScript contracts and schema/design docs. |
| Tests match acceptance criteria | PASS | Jest tests cover save/load, artifacts, query filters, no-match queries, unsafe URL rejection, sensitive artifact notes, duplicate idempotency/conflicts, and no partial write on validation failure. |
| External dependencies avoided | PASS | Local result-store tests and sample run without Neon, Vercel, Browserbase, or model-provider credentials. |

## Validation Evidence

- `pnpm --filter @spyglass/product-test-harness test -- --runInBand` passed: 5 suites, 32 tests.
- `pnpm --filter @spyglass/product-test-harness type-check` passed.
- `pnpm --filter @spyglass/product-test-harness build` passed.
- `pnpm --filter @spyglass/product-test-harness lint` passed.
- `pnpm --filter @spyglass/product-test-harness run:result-store-sample` passed and persisted/loaded/listed the sample run.

## Residual Risks

- The live test-control database adapter remains future work. This is intentional for PTH03 and the local store contract is designed to support that adapter later.
