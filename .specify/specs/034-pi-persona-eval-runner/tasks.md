# Tasks: Pi Persona Eval Adapter

**Input**: Design documents from `.specify/specs/034-pi-persona-eval-runner/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/pi-persona-evals.md, quickstart.md

**Tests**: Jest unit tests are required for persona registry, encounter matrix execution, synthetic driver behavior, prompt-injection refusal, privacy-boundary safety, transcript safety checks, result-store persistence, and the sample runner.

## Phase 1: Setup

- [x] T001 Update active Spec Kit pointers in `.specify/feature.json` and `AGENTS.md`
- [x] T002 Add Pi persona eval sample script in `packages/product-test-harness/package.json`

## Phase 2: Tests

- [x] T003 [P] Add persona registry, encounter matrix, and synthetic driver tests in `packages/product-test-harness/src/__tests__/pi-persona-evals.test.ts`
- [x] T004 [P] Add prompt-injection refusal, transcript safety, result-store persistence, and sample tests in `packages/product-test-harness/src/__tests__/pi-persona-evals.test.ts`

## Phase 3: Core Implementation

- [x] T005 Add persona eval contracts to `packages/product-test-harness/src/contracts.ts`
- [x] T006 Implement default seeker/employer personas in `packages/product-test-harness/src/persona-evals/personas.ts`
- [x] T007 Implement deterministic encounter matrix in `packages/product-test-harness/src/persona-evals/matrix.ts`
- [x] T008 Implement Pi-compatible driver interface and synthetic driver in `packages/product-test-harness/src/persona-evals/driver.ts`
- [x] T009 Implement evaluator and transcript safety validation in `packages/product-test-harness/src/persona-evals/evaluator.ts`
- [x] T010 Implement persona eval runner and result-store persistence in `packages/product-test-harness/src/persona-evals/runner.ts`
- [x] T011 Export persona eval runner helpers from `packages/product-test-harness/src/index.ts`

## Phase 4: Sample and Documentation

- [x] T012 Implement local sample runner in `packages/product-test-harness/src/samples/pi-persona-evals.ts`
- [x] T013 Update `.specify/specs/034-pi-persona-eval-runner/quickstart.md` with command evidence
- [x] T014 Update `docs/testing/product-harness/roadmap.md` for PTH09 implementation status and PTH10 next queue

## Phase 5: Validation

- [x] T015 Run `pnpm --filter @spyglass/product-test-harness test -- pi-persona-evals`
- [x] T016 Run `pnpm --filter @spyglass/product-test-harness test`
- [x] T017 Run `pnpm --filter @spyglass/product-test-harness type-check`
- [x] T018 Run `pnpm --filter @spyglass/product-test-harness build`
- [x] T019 Run `pnpm --filter @spyglass/product-test-harness lint`
- [x] T020 Run `pnpm --filter @spyglass/product-test-harness run:pi-persona-evals`
- [x] T021 Run `pnpm format:check`
- [x] T022 Run `/speckit-analyze` equivalent and record findings in `.specify/specs/034-pi-persona-eval-runner/analyze-report.md`

## Dependencies & Execution Order

- Phase 1 precedes implementation.
- T003 and T004 should fail before T005-T012 implementation.
- T007 depends on T006.
- T008 depends on T005-T007.
- T009 depends on T005 and may reuse observability log-safety helpers.
- T010 depends on T006-T009.
- T012 depends on T010-T011.
- Validation follows all implementation tasks.

## Parallel Execution Examples

- T003 and T004 can be drafted in parallel because they target independent test concerns in the same test file but must be reconciled before implementation.
- T006, T007, and T009 can be implemented in parallel after T005 because they are separate modules.

## Implementation Strategy

1. Establish tests for the persona matrix, synthetic driver, safety refusals, persistence, and sample output.
2. Implement typed persona eval contracts and default synthetic fixtures.
3. Wire deterministic driver execution into result-store-compatible agent invocation records.
4. Add sample runner, exports, docs, and validation evidence.
