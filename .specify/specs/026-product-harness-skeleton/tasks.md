# Tasks: Product Harness Skeleton

**Input**: Design documents from `.specify/specs/026-product-harness-skeleton/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Tests are required for this feature because the spec explicitly requires validation, status propagation, and report generation tests.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the product-level harness package and align it with workspace conventions.

- [x] T001 Create `packages/product-test-harness/package.json` with workspace package metadata, exports, scripts, and no runtime external-service dependency
- [x] T002 Create `packages/product-test-harness/tsconfig.json` matching existing composite package conventions
- [x] T003 Create `packages/product-test-harness/jest.config.js` matching package-level Jest conventions
- [x] T004 [P] Create `packages/product-test-harness/src/index.ts` export placeholder
- [x] T005 [P] Add `@spyglass/product-test-harness` to any workspace/package discovery assumptions only if required by existing tooling

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define shared contracts and validation primitives that every user story depends on.

**Critical**: No user story work can begin until this phase is complete.

- [x] T006 Create scenario/result type definitions in `packages/product-test-harness/src/contracts.ts`
- [x] T007 Create validation helpers for scenarios, steps, assertions, artifacts, and run results in `packages/product-test-harness/src/validation.ts`
- [x] T008 [P] Create contract tests for valid and invalid scenario definitions in `packages/product-test-harness/src/__tests__/contracts.test.ts`
- [x] T009 [P] Create validation tests for invalid steps, assertions, artifacts, and run results in `packages/product-test-harness/src/__tests__/contracts.test.ts`
- [x] T010 Export contract and validation APIs from `packages/product-test-harness/src/index.ts`

**Checkpoint**: Contract and validation layer is ready for runner/report stories.

---

## Phase 3: User Story 1 - Define a Product Scenario Contract (Priority: P1) MVP

**Goal**: A no-external-service scenario can be executed and produce a valid run result with ordered steps, assertions, artifacts, and final status.

**Independent Test**: Run the runner tests and verify that a no-op scenario produces a valid passed result while failed steps/assertions propagate to failed status.

### Tests for User Story 1

- [x] T011 [P] [US1] Add runner test for a passing no-op scenario in `packages/product-test-harness/src/__tests__/runner.test.ts`
- [x] T012 [P] [US1] Add runner test for thrown step errors in `packages/product-test-harness/src/__tests__/runner.test.ts`
- [x] T013 [P] [US1] Add runner test for failed assertion status propagation in `packages/product-test-harness/src/__tests__/runner.test.ts`

### Implementation for User Story 1

- [x] T014 [US1] Implement scenario runner and step execution in `packages/product-test-harness/src/runner.ts`
- [x] T015 [US1] Implement final run status derivation in `packages/product-test-harness/src/runner.ts`
- [x] T016 [US1] Implement safe error summary capture for failed steps in `packages/product-test-harness/src/runner.ts`
- [x] T017 [US1] Add passing no-op sample scenario in `packages/product-test-harness/src/samples/noop-scenario.ts`
- [x] T018 [US1] Export runner and sample scenario APIs from `packages/product-test-harness/src/index.ts`

**Checkpoint**: User Story 1 is fully functional and independently testable.

---

## Phase 4: User Story 2 - Produce Human and Machine Reports (Priority: P1)

**Goal**: The harness can produce JSON and Markdown reports from the same run result, with failed assertions highlighted in the Markdown summary.

**Independent Test**: Run report tests and verify JSON/Markdown outputs agree on status, scenario id, mode, step count, assertion count, and artifact count.

### Tests for User Story 2

- [x] T019 [P] [US2] Add JSON report tests in `packages/product-test-harness/src/__tests__/reports.test.ts`
- [x] T020 [P] [US2] Add Markdown report tests for passed and failed runs in `packages/product-test-harness/src/__tests__/reports.test.ts`
- [x] T021 [P] [US2] Add report consistency test comparing JSON and Markdown summary facts in `packages/product-test-harness/src/__tests__/reports.test.ts`

### Implementation for User Story 2

- [x] T022 [US2] Implement JSON report generation in `packages/product-test-harness/src/reports/json.ts`
- [x] T023 [US2] Implement Markdown report generation in `packages/product-test-harness/src/reports/markdown.ts`
- [x] T024 [US2] Add report exports from `packages/product-test-harness/src/index.ts`
- [x] T025 [US2] Add sample scenario report entrypoint in `packages/product-test-harness/src/samples/noop-scenario.ts`
- [x] T026 [US2] Add `run:sample` script to `packages/product-test-harness/package.json`

**Checkpoint**: User Story 2 is fully functional and independently testable.

---

## Phase 5: User Story 3 - Keep Scope Safe for Later Harness Work (Priority: P2)

**Goal**: Future Neon, browser, webhook, observability, and Pi adapters can attach metadata/artifact references without changing top-level run result fields.

**Independent Test**: Run contract/report tests with adapter-style metadata fixtures and verify metadata is preserved safely while invalid artifact refs are rejected.

### Tests for User Story 3

- [x] T027 [P] [US3] Add adapter metadata preservation tests in `packages/product-test-harness/src/__tests__/contracts.test.ts`
- [x] T028 [P] [US3] Add invalid artifact rejection tests in `packages/product-test-harness/src/__tests__/contracts.test.ts`
- [x] T029 [P] [US3] Add no-secret sample output regression test in `packages/product-test-harness/src/__tests__/reports.test.ts`

### Implementation for User Story 3

- [x] T030 [US3] Add adapter metadata shape helpers in `packages/product-test-harness/src/contracts.ts`
- [x] T031 [US3] Harden artifact validation in `packages/product-test-harness/src/validation.ts`
- [x] T032 [US3] Ensure report writers omit or summarize unsafe metadata in `packages/product-test-harness/src/reports/markdown.ts`
- [x] T033 [US3] Document adapter metadata conventions in `packages/product-test-harness/src/index.ts`

**Checkpoint**: All user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate the full PTH01 slice and update durable evidence.

- [x] T034 [P] Run `pnpm --filter @spyglass/product-test-harness test` and fix failures
- [x] T035 [P] Run `pnpm --filter @spyglass/product-test-harness type-check` and fix failures
- [x] T036 [P] Run `pnpm --filter @spyglass/product-test-harness build` and fix failures
- [x] T037 [P] Run `pnpm --filter @spyglass/product-test-harness lint` and fix failures
- [x] T038 Run quickstart validation from `.specify/specs/026-product-harness-skeleton/quickstart.md`
- [x] T039 Record quickstart evidence in `.specify/specs/026-product-harness-skeleton/quickstart-run-2026-05-27.md`
- [x] T040 Run `/speckit-analyze` and resolve any spec/plan/tasks inconsistencies
- [ ] T041 Final diff review, commit, push, and open PR for `026-product-harness-skeleton`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user stories.
- **US1 (Phase 3)**: Depends on Foundational completion.
- **US2 (Phase 4)**: Depends on US1 result generation.
- **US3 (Phase 5)**: Depends on Foundational completion and report surfaces from US2.
- **Polish (Phase 6)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: MVP; must complete first because reports need run results.
- **User Story 2 (P1)**: Depends on US1 run results.
- **User Story 3 (P2)**: Can start after US1 and US2 contracts/report surfaces exist.

### Parallel Opportunities

- T004 and T005 can run in parallel after package metadata is known.
- T008 and T009 can run in parallel after T006-T007.
- T011-T013 can run in parallel before T014.
- T019-T021 can run in parallel before T022-T023.
- T027-T029 can run in parallel before T030-T032.
- T034-T037 can run in parallel after implementation is complete.

---

## Parallel Example: User Story 1

```text
Task: "T011 [US1] Add runner test for a passing no-op scenario"
Task: "T012 [US1] Add runner test for thrown step errors"
Task: "T013 [US1] Add runner test for failed assertion status propagation"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 setup.
2. Complete Phase 2 contracts and validation.
3. Complete Phase 3 runner and sample scenario.
4. Validate US1 independently with runner tests.

### Incremental Delivery

1. Add contracts and validation.
2. Add runner and no-op sample scenario.
3. Add JSON/Markdown reports.
4. Add adapter-safe metadata and artifact validation.
5. Run quickstart and record evidence.

### Future Feature Handoff

PTH02 should consume `ScenarioRun`, `RunArtifact`, and report APIs from this package rather than redefining run-result semantics.
