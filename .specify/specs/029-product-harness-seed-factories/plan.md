# Implementation Plan: Product Harness Seed Factories

**Branch**: `029-product-harness-seed-factories` | **Date**: 2026-05-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `.specify/specs/029-product-harness-seed-factories/spec.md`

## Summary

Extend `@spyglass/product-test-harness` with deterministic synthetic seed factories for Alpha gate fixtures. The feature adds typed seed bundle contracts, fixture builders, relationship and safety validation, an offline application adapter, lifecycle/result-store integration, and sample commands so PTH05-PTH08 can run against complete traceable product state without production data.

## Technical Context

**Language/Version**: TypeScript 5.9 on Node 24, matching the existing pnpm workspace.

**Primary Dependencies**: Existing workspace tooling (`typescript`, `jest`, `eslint`, `prettier`) and existing `@spyglass/product-test-harness` contracts, lifecycle, and result-store modules. No new runtime dependency is required for deterministic ids.

**Storage**: In-memory/offline seed application for PTH04, with contracts that can later back database insert adapters. Result evidence persists through the PTH03 local result store.

**Testing**: Jest unit tests and offline sample execution. No Neon credentials or live services required.

**Target Platform**: Spyglass pnpm/Turborepo monorepo, consumed by local product gate development, future GitHub Actions product gates, and Vercel preview/canary workflows.

**Project Type**: Workspace library package with offline sample entrypoint.

**Performance Goals**: Generate and validate the complete Alpha happy-path fixture plus two denial fixtures in under 5 seconds on a warm checkout.

**Constraints**: Synthetic data only; deterministic output independent of wall-clock time and random sources; no raw credential-bearing URLs, private key material, live webhook secrets, or production identifiers in generated output; offline package tests by default.

**Scale/Scope**: Extend `packages/product-test-harness` with seed contracts, fixture definitions, validation, offline application, lifecycle integration, tests, public exports, and documentation. Full live database insertion breadth can expand in PTH05 scenario implementation.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Status | Rationale |
|---------|--------|-----------|
| I.1 Confidentiality | PASS | Fixtures are synthetic and validation rejects unsafe metadata or secret-like values before application or persistence. |
| I.2 Integrity | PASS | Seed versions, deterministic ids, relationship validation, and result-store seed records make generated state traceable and replayable. |
| I.3 Availability | PASS | Offline seed generation supports repeatable gates without live services; lifecycle failures remain explicit. |
| I.4 Privacy | PASS | No production user data is used; consent and jurisdiction posture are first-class fixture data. |
| I.5 AAA | PASS | Principal categories are generated as synthetic authenticated actors without adding live credential issuance. |
| I.6 Defense in Depth | PASS | Validation fails closed on missing posture, dangling references, duplicate ids, and unsafe metadata. |
| II Agent Identity | PASS | Agent principals and contracts are generated as versioned synthetic records for later deterministic agent paths. |
| III Typed Agent Semantics | PASS | Seed factories expose typed bundle, entity, relationship, validation, and application contracts. |
| IV Separation of Concerns | PASS | Generation, validation, application, lifecycle integration, and persistence evidence remain separated. |
| V Governance | PASS | Feature follows Spec Kit artifacts and roadmap boundaries. |

## Project Structure

### Documentation (this feature)

```text
.specify/specs/029-product-harness-seed-factories/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── seed-factory.schema.json
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
│   ├── seeds/
│   │   ├── deterministic.ts
│   │   ├── factories.ts
│   │   ├── fixtures.ts
│   │   ├── apply.ts
│   │   └── validation.ts
│   ├── samples/
│   │   └── seed-factory-scenario.ts
│   └── __tests__/
│       └── seed-factories.test.ts
```

**Structure Decision**: Keep deterministic seed factories inside `@spyglass/product-test-harness` because they directly extend the product scenario, lifecycle, and result-store contracts created in PTH01-PTH03. Seed modules live under `src/seeds/` to isolate generation and application from scenario execution.

## Complexity Tracking

No constitution violations require justification.
