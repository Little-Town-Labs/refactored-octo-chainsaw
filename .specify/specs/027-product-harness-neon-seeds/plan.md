# Implementation Plan: Product Harness Neon Seeds

**Branch**: `027-product-harness-neon-seeds` | **Date**: 2026-05-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `.specify/specs/027-product-harness-neon-seeds/spec.md`

## Summary

Extend `@spyglass/product-test-harness` with a product database lifecycle runner. The runner creates an isolated database branch, applies migrations, optionally executes a seed callback, invokes a product scenario with branch-scoped database context, and records cleanup/lifecycle metadata in the existing PTH01 result shape without leaking raw database URLs. The implementation reuses `@spyglass/test-harness` as the lower-level Neon/migration utility layer and keeps core lifecycle tests offline through injected fakes.

## Technical Context

**Language/Version**: TypeScript 5.9 on Node 24, matching the existing pnpm workspace.

**Primary Dependencies**: Existing workspace tooling (`typescript`, `jest`, `eslint`, `prettier`), existing `@spyglass/product-test-harness` contracts, and existing `@spyglass/test-harness` Neon/migration primitives.

**Storage**: No persistent result-store tables in PTH02. Lifecycle metadata is emitted through the existing run-result metadata/report path. Real runs target isolated Neon Postgres branches.

**Testing**: Jest unit tests with fake branch manager, fake migration runner, fake seed callback, and fake scenario callbacks. Optional live Neon integration remains credential-gated and is not required for the core package test suite.

**Target Platform**: Spyglass pnpm/Turborepo monorepo, consumed by local developer runs, future GitHub Actions product gates, and Vercel preview/canary workflows.

**Project Type**: Workspace library package with a no-external-service sample entrypoint.

**Performance Goals**: Offline lifecycle sample completes in under 30 seconds on a warm checkout. Cleanup must be attempted immediately after terminal lifecycle state unless explicitly retained.

**Constraints**: Synthetic data only; no raw credential-bearing database URLs in reports; cleanup status recorded independently from scenario status; no production databases; full seed factories deferred to PTH04; DB-backed result persistence deferred to PTH03.

**Scale/Scope**: Extend one existing package (`packages/product-test-harness`) with lifecycle contracts, runner, redaction helpers, sample lifecycle scenario, and tests. Update package dependency metadata and lockfile if `@spyglass/test-harness` is imported directly.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Status | Rationale |
|---------|--------|-----------|
| I.1 Confidentiality | PASS | PTH02 redacts raw database URLs from result metadata and reports; no production data is seeded. |
| I.2 Integrity | PASS | Lifecycle metadata records branch, migration, seed, and cleanup state for later auditability. |
| I.3 Availability | PASS | Cleanup is attempted on failure paths and retained branches require explicit reason. |
| I.4 Privacy | PASS | Isolated branches and synthetic seed metadata prevent production user data use. |
| I.5 AAA | PASS | PTH02 does not add product mutating surfaces; Neon credentials remain explicit environment inputs for future live runs. |
| I.6 Defense in Depth | PASS | Failure paths fail closed, skip unsafe downstream callbacks, and still attempt cleanup. |
| II Agent Identity | PASS | Agent execution is out of scope; scenario callback receives explicit context only. |
| III Typed Agent Semantics | PASS | Lifecycle contracts and metadata are typed and versioned. |
| IV Separation of Concerns | PASS | Product lifecycle orchestration builds on lower-level `@spyglass/test-harness` primitives instead of duplicating Neon REST logic. |
| V Governance | PASS | Feature is introduced through Spec Kit artifacts and preserves roadmap boundaries. |

## Project Structure

### Documentation (this feature)

```text
.specify/specs/027-product-harness-neon-seeds/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── product-db-lifecycle.schema.json
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/product-test-harness/
├── package.json
├── src/
│   ├── contracts.ts
│   ├── index.ts
│   ├── db/
│   │   ├── lifecycle.ts
│   │   └── redaction.ts
│   ├── samples/
│   │   └── neon-lifecycle-scenario.ts
│   └── __tests__/
│       └── db-lifecycle.test.ts
```

**Structure Decision**: Keep PTH02 inside `@spyglass/product-test-harness` because it extends the product-level runner/result contract created in PTH01. Reuse `@spyglass/test-harness` only for low-level Neon branch and migration adapters; keep lifecycle orchestration, metadata, redaction, and sample scenarios in the product package.

## Complexity Tracking

No constitution violations require justification.
