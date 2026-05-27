# Implementation Plan: Product Harness Results Store

**Branch**: `028-product-harness-results-store` | **Date**: 2026-05-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `.specify/specs/028-product-harness-results-store/spec.md`

## Summary

Extend `@spyglass/product-test-harness` with a durable result-store contract and an offline local file implementation. The store persists validated scenario run snapshots, artifact references, and placeholder evidence categories for later seeds, agents, browser runs, webhooks, and observability gates. It supports idempotent writes, duplicate conflict detection, safe metadata validation, and query filters for gate/eval reporting.

## Technical Context

**Language/Version**: TypeScript 5.9 on Node 24, matching the existing pnpm workspace.

**Primary Dependencies**: Existing workspace tooling (`typescript`, `jest`, `eslint`, `prettier`) and existing `@spyglass/product-test-harness` contracts/report validation.

**Storage**: Local JSONL-style file storage for PTH03, with interfaces designed for a later test-control database adapter. No production app schema writes.

**Testing**: Jest unit tests with temporary directories and no external services.

**Target Platform**: Spyglass pnpm/Turborepo monorepo, consumed by local developer runs, future GitHub Actions product gates, and Vercel preview/canary workflows.

**Project Type**: Workspace library package with offline sample entrypoint.

**Performance Goals**: Persist and query 25 local run snapshots in under 5 seconds on a warm checkout. Validation must fail before any write for invalid evidence.

**Constraints**: Synthetic data only; no raw credential-bearing database URLs in persisted snapshots; duplicate run ids must be idempotent only for identical payloads; no live database dependency in the default package test suite.

**Scale/Scope**: Extend `packages/product-test-harness` with result-store contracts, validation, local file store, query helpers, sample command, tests, and public exports. Live Neon control-store tables remain future work behind the same interface.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Status | Rationale |
|---------|--------|-----------|
| I.1 Confidentiality | PASS | Store validation rejects raw database URLs and unsafe artifact metadata before persistence. |
| I.2 Integrity | PASS | Result snapshots preserve run, scenario, step, assertion, artifact, and future evidence categories with duplicate conflict detection. |
| I.3 Availability | PASS | Local file store works without external services and supports deterministic CI validation. |
| I.4 Privacy | PASS | Scope is synthetic harness evidence only; production data is explicitly out of scope. |
| I.5 AAA | PASS | PTH03 does not add product mutating APIs or credential issuance. |
| I.6 Defense in Depth | PASS | Validation fails closed and store writes are transactional at the snapshot level. |
| II Agent Identity | PASS | Agent invocation evidence is represented for later PTH09, but no agent execution is introduced here. |
| III Typed Agent Semantics | PASS | Result store entities and query filters are typed and exported. |
| IV Separation of Concerns | PASS | Storage is behind an interface and does not couple runner execution to a specific backend. |
| V Governance | PASS | Feature follows Spec Kit artifacts and roadmap boundaries. |

## Project Structure

### Documentation (this feature)

```text
.specify/specs/028-product-harness-results-store/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── result-store.schema.json
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
│   ├── results/
│   │   ├── store.ts
│   │   ├── local-file-store.ts
│   │   └── validation.ts
│   ├── samples/
│   │   └── result-store-scenario.ts
│   └── __tests__/
│       └── result-store.test.ts
```

**Structure Decision**: Keep PTH03 inside `@spyglass/product-test-harness` because it extends the product-level scenario/result contracts created in PTH01 and the lifecycle evidence introduced in PTH02. Store backends live under `src/results/` to separate persistence from scenario execution and database lifecycle orchestration.

## Complexity Tracking

No constitution violations require justification.
