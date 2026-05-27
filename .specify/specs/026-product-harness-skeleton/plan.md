# Implementation Plan: Product Harness Skeleton

**Branch**: `026-product-harness-skeleton` | **Date**: 2026-05-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `.specify/specs/026-product-harness-skeleton/spec.md`

## Summary

Create the first product-level testing harness package for Spyglass. This slice establishes stable scenario, step, assertion, artifact, run-result, and report contracts; a lightweight runner for no-external-service sample scenarios; validation helpers; and JSON/Markdown report generation. It intentionally does not implement Neon branch orchestration, Playwright, Browserbase, observability queries, webhook receivers, persistent result storage, or Pi persona agents. Those later features will build on the contracts created here.

## Technical Context

**Language/Version**: TypeScript 5.9 on Node 24, matching the existing pnpm workspace.

**Primary Dependencies**: Existing workspace tooling (`typescript`, `jest`, `eslint`, `prettier`). Use Zod only if contract validation benefits from the existing `@spyglass/shared` pattern; otherwise keep PTH01 dependency-free.

**Storage**: File/report output only for PTH01. Persistent DB-backed result storage is deferred to PTH03.

**Testing**: Jest unit tests for contract validation, runner status propagation, JSON report shape, and Markdown report rendering.

**Target Platform**: Spyglass pnpm/Turborepo monorepo, consumed by later CI, local developer runs, and future Vercel preview/canary workflows.

**Project Type**: Workspace library package with a small runnable sample entrypoint.

**Performance Goals**: Sample scenario and report generation complete in under 30 seconds on a warm checkout.

**Constraints**: Synthetic data only; no production secrets; stable top-level result fields; deterministic sample behavior; no external network/service calls in PTH01.

**Scale/Scope**: One new package (`packages/product-test-harness`) with contracts, runner, report writers, validation, sample scenario, and tests.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Status | Rationale |
|---------|--------|-----------|
| I.1 Confidentiality | PASS | PTH01 uses synthetic sample data and stores only safe metadata/artifact refs. |
| I.2 Integrity | PASS | Result contracts preserve scenario version, status, steps, assertions, artifacts, and evidence refs for later auditability. |
| I.3 Availability | PASS | No production runtime dependency is added; sample runner is local and deterministic. |
| I.4 Privacy | PASS | Production user data is explicitly out of scope; sample outputs must not contain real PII. |
| I.5 AAA | PASS | PTH01 does not add mutating product surfaces or authentication bypasses. Future credentialed flows are deferred. |
| I.6 Defense in Depth | PASS | Failed assertions and invalid records fail closed instead of producing passing evidence. |
| II Agent Identity | PASS | Agent-driver metadata is an extension point only; no unauthenticated agent action is introduced. |
| III Typed Agent Semantics | PASS | Scenario/result contracts are strongly typed and versioned. |
| IV Separation of Concerns | PASS | Product-level harness is separate from lower-level `packages/test-harness` utilities. |
| V Governance | PASS | Feature is introduced through Spec Kit artifacts and does not change constitutional policy. |

## Project Structure

### Documentation (this feature)

```text
.specify/specs/026-product-harness-skeleton/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── product-harness-result.schema.json
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/product-test-harness/
├── package.json
├── tsconfig.json
├── jest.config.js
├── src/
│   ├── index.ts
│   ├── contracts.ts
│   ├── runner.ts
│   ├── validation.ts
│   ├── reports/
│   │   ├── json.ts
│   │   └── markdown.ts
│   ├── samples/
│   │   └── noop-scenario.ts
│   └── __tests__/
│       ├── contracts.test.ts
│       ├── runner.test.ts
│       └── reports.test.ts
```

**Structure Decision**: Add a new product-level workspace package instead of extending `packages/test-harness`. The existing `@spyglass/test-harness` remains the low-level integration utility layer for Neon, migrations, fake clocks, and audit sinks. `@spyglass/product-test-harness` becomes the product-readiness scenario/reporting layer used by later PTH features.

## Complexity Tracking

No constitution violations require justification.
