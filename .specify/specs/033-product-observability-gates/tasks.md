# Tasks: Observability and Incident Gate Scenarios

**Input**: Design documents from `.specify/specs/033-product-observability-gates/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/observability-gates.md, quickstart.md

**Tests**: Jest unit tests are required for signal contracts, audit coverage, monitoring bounds, Sentry-style config validation, incident readiness, unsafe log rejection, failure evidence, result-store persistence, and the sample runner.

## Phase 1: Setup

- [x] T001 Update active Spec Kit pointers in `.specify/feature.json` and `AGENTS.md`
- [x] T002 Add observability gate sample script in `packages/product-test-harness/package.json`

## Phase 2: Tests

- [x] T003 [P] Add audit, monitoring, Sentry-style config, and incident readiness tests in `packages/product-test-harness/src/__tests__/observability-gates.test.ts`
- [x] T004 [P] Add unsafe log rejection, deterministic failure evidence, result-store persistence, and sample tests in `packages/product-test-harness/src/__tests__/observability-gates.test.ts`

## Phase 3: Core Implementation

- [x] T005 Add observability signal contracts to `packages/product-test-harness/src/contracts.ts`
- [x] T006 Implement safe signal builders and validators in `packages/product-test-harness/src/observability/signals.ts`
- [x] T007 Implement recursive no-secret log safety checks in `packages/product-test-harness/src/observability/log-safety.ts`
- [x] T008 Implement monitoring budget validation in `packages/product-test-harness/src/observability/monitoring.ts`
- [x] T009 Implement incident readiness validation in `packages/product-test-harness/src/observability/incidents.ts`
- [x] T010 Implement deterministic PTH08 gate registry in `packages/product-test-harness/src/observability/gates.ts`
- [x] T011 Implement observability gate runner and result-store persistence in `packages/product-test-harness/src/observability/runner.ts`
- [x] T012 Export observability runner helpers from `packages/product-test-harness/src/index.ts`

## Phase 4: Sample and Documentation

- [x] T013 Implement local sample runner in `packages/product-test-harness/src/samples/observability-gates.ts`
- [x] T014 Update `.specify/specs/033-product-observability-gates/quickstart.md` with command evidence
- [x] T015 Update `docs/testing/product-harness/roadmap.md` for PTH08 implementation status and PTH09 next queue

## Phase 5: Validation

- [x] T016 Run `pnpm --filter @spyglass/product-test-harness test -- observability-gates`
- [x] T017 Run `pnpm --filter @spyglass/product-test-harness test`
- [x] T018 Run `pnpm --filter @spyglass/product-test-harness type-check`
- [x] T019 Run `pnpm --filter @spyglass/product-test-harness build`
- [x] T020 Run `pnpm --filter @spyglass/product-test-harness lint`
- [x] T021 Run `pnpm --filter @spyglass/product-test-harness run:observability-gates`
- [x] T022 Run `pnpm format:check`
- [x] T023 Run `/speckit-analyze` equivalent and record findings in `.specify/specs/033-product-observability-gates/analyze-report.md`

## Dependencies & Execution Order

- Phase 1 precedes implementation.
- T003 and T004 should fail before T005-T013 implementation.
- T010 depends on T006-T009.
- T011 depends on T010.
- T013 depends on T011-T012.
- Validation follows all implementation tasks.

## Parallel Execution Examples

- T003 and T004 can be drafted in parallel because they target independent test concerns in the same test file but must be reconciled before implementation.
- T007, T008, and T009 can be implemented in parallel after T005-T006 because they are separate modules.

## Implementation Strategy

1. Establish tests for all PTH08 gates and failure modes.
2. Implement typed signal contracts and focused validators.
3. Wire deterministic gate scenarios into the existing product harness runner and result store.
4. Add sample runner, exports, docs, and validation evidence.
