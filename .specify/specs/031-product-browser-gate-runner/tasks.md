# Tasks: Playwright Product Browser Runner

**Input**: Design documents from `.specify/specs/031-product-browser-gate-runner/`

**Prerequisites**: plan.md, spec.md, quickstart.md

**Tests**: Jest unit tests are required for deterministic registry coverage, validation, artifact capture, and result-store persistence.

## Phase 1: Setup

- [x] T001 Update active Spec Kit pointers in `.specify/feature.json` and `AGENTS.md`
- [x] T002 Add browser gate sample script in `packages/product-test-harness/package.json`

## Phase 2: Tests

- [x] T003 [P] Add default browser journey registry and validation tests in `packages/product-test-harness/src/__tests__/browser-gates.test.ts`
- [x] T004 [P] Add synthetic browser execution, artifact capture, and result-store persistence tests in `packages/product-test-harness/src/__tests__/browser-gates.test.ts`

## Phase 3: Core Implementation

- [x] T005 Add browser journey contracts to `packages/product-test-harness/src/contracts.ts`
- [x] T006 Implement browser artifact helpers in `packages/product-test-harness/src/browser/artifacts.ts`
- [x] T007 Implement default PTH06 journey registry in `packages/product-test-harness/src/browser/journeys.ts`
- [x] T008 Implement browser journey validation in `packages/product-test-harness/src/browser/validation.ts`
- [x] T009 Implement Playwright-compatible runner in `packages/product-test-harness/src/browser/runner.ts`
- [x] T010 Implement deterministic synthetic browser driver in `packages/product-test-harness/src/browser/synthetic-driver.ts`
- [x] T011 Export browser runner helpers from `packages/product-test-harness/src/index.ts`

## Phase 4: Sample and Documentation

- [x] T012 Implement local sample runner in `packages/product-test-harness/src/samples/browser-gate-scenario.ts`
- [x] T013 Update `.specify/specs/031-product-browser-gate-runner/quickstart.md` with command evidence
- [x] T014 Update `docs/testing/product-harness/roadmap.md` for PTH06 implementation status and PTH07 next queue

## Phase 5: Validation

- [x] T015 Run `pnpm --filter @spyglass/product-test-harness test -- browser-gates`
- [x] T016 Run `pnpm --filter @spyglass/product-test-harness test`
- [x] T017 Run `pnpm --filter @spyglass/product-test-harness type-check`
- [x] T018 Run `pnpm --filter @spyglass/product-test-harness build`
- [x] T019 Run `pnpm --filter @spyglass/product-test-harness lint`
- [x] T020 Run `pnpm --filter @spyglass/product-test-harness run:browser-gate-sample`
- [x] T021 Run `pnpm format:check`
- [x] T022 Run `/speckit-analyze` equivalent and record findings in `.specify/specs/031-product-browser-gate-runner/analyze-report.md`

## Dependencies & Execution Order

- Phase 1 precedes implementation.
- T003 and T004 should fail before T005-T012 implementation.
- T009 depends on T005-T008.
- T010 depends on T006 and T009.
- T012 depends on T009-T011.
- Validation follows all implementation tasks.
