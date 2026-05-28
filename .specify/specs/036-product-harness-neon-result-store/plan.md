# Implementation Plan: PTH11 Neon Test Harness Schema Persistence

**Branch**: `036-product-harness-neon-result-store` | **Date**: 2026-05-28 | **Spec**: `spec.md`
**Input**: PTH11 feature spec from the product harness roadmap.

## Summary

Add a Neon/Postgres-backed `ProductResultStore` implementation for `@spyglass/product-test-harness` that persists result snapshots into an isolated `test_harness.product_result_runs` table. Keep the package dependency-light by accepting a caller-provided SQL client, validating schema identifiers, and testing through a fake SQL client.

## Technical Context

**Language/Version**: TypeScript on Node 24
**Primary Dependencies**: Existing pnpm workspace, Jest, local product-test-harness contracts
**Storage**: Neon/Postgres-compatible SQL via caller-provided query client; default schema `test_harness`
**Testing**: Jest package tests plus package type-check/lint/build and workspace hygiene checks
**Target Project**: `packages/product-test-harness`
**Constraints**: No live network access in tests, no production schema writes, no binary artifact storage in DB, stable duplicate detection

## Constitution Check

- Synthetic data only: tests use deterministic snapshots and fake SQL clients.
- Evidence retention: complete result snapshots persist with artifact references, not artifact blobs.
- CI hygiene: local tests do not need Neon credentials.
- Type safety: SQL client, options, and store exports are explicit.

## Project Structure

```text
packages/product-test-harness/src/
  results/
    neon-store.ts
    local-file-store.ts
    store.ts
  __tests__/
    result-store.test.ts
.specify/specs/036-product-harness-neon-result-store/
  contracts/neon-result-store.md
  data-model.md
  quickstart.md
  research.md
  tasks.md
```

## Validation Strategy

1. Focused result-store tests.
2. Product-test-harness package type-check, lint, build, and tests.
3. Workspace format check and diff hygiene.
4. Spec Kit analyze pass across spec, plan, and tasks.
