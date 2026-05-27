# Tasks: Deterministic Alpha Gate Core Scenarios

**Input**: Design documents from `.specify/specs/030-alpha-gate-core-scenarios/`

**Prerequisites**: plan.md, spec.md, quickstart.md

**Tests**: Jest unit tests are required for deterministic scenario outcomes, reason codes, result-store persistence, and replay stability.

## Phase 1: Setup

- [x] T001 Update active Spec Kit pointers in `.specify/feature.json` and `AGENTS.md`
- [x] T002 Add Alpha gate sample script in `packages/product-test-harness/package.json`

## Phase 2: Scenario Contracts and Tests

- [x] T003 [P] Add A1-A5 outcome tests in `packages/product-test-harness/src/__tests__/alpha-gates.test.ts`
- [x] T004 [P] Add deterministic replay and result-store persistence tests in `packages/product-test-harness/src/__tests__/alpha-gates.test.ts`

## Phase 3: Core Implementation

- [x] T005 Add consent-withdrawn and human-review-required seed fixtures in `packages/product-test-harness/src/contracts.ts` and `packages/product-test-harness/src/seeds/fixtures.ts`
- [x] T006 Implement Alpha gate scenario definitions, deterministic evaluation, and suite runner in `packages/product-test-harness/src/scenarios/alpha-gates.ts`
- [x] T007 Export Alpha gate helpers from `packages/product-test-harness/src/index.ts`

## Phase 4: Sample and Documentation

- [x] T008 Implement local sample runner in `packages/product-test-harness/src/samples/alpha-gate-scenarios.ts`
- [x] T009 Update `.specify/specs/030-alpha-gate-core-scenarios/quickstart.md` with command evidence

## Phase 5: Validation

- [x] T010 Run `pnpm --filter @spyglass/product-test-harness test -- alpha-gates`
- [x] T011 Run `pnpm --filter @spyglass/product-test-harness type-check`
- [x] T012 Run `pnpm --filter @spyglass/product-test-harness build`
- [x] T013 Run `pnpm --filter @spyglass/product-test-harness lint`
- [x] T014 Run `pnpm --filter @spyglass/product-test-harness run:alpha-gate-sample`

## Dependencies & Execution Order

- Phase 1 precedes implementation.
- T003 and T004 should fail before T005-T008 implementation.
- T006 depends on T005.
- T008 depends on T006 and T007.
- Validation follows all implementation tasks.
