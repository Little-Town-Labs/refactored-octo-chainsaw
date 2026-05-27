# Tasks: Product Harness Neon Seeds

**Input**: Design documents from `.specify/specs/027-product-harness-neon-seeds/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/product-db-lifecycle.schema.json, quickstart.md

**Tests**: This feature requires Jest unit tests because lifecycle order, cleanup guarantees, and URL redaction are core acceptance criteria.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare package structure and dependency wiring for lifecycle work.

- [x] T001 Add `@spyglass/test-harness` workspace dependency and `run:lifecycle-sample` script in `packages/product-test-harness/package.json`
- [x] T002 [P] Create database lifecycle source directory `packages/product-test-harness/src/db/`
- [x] T003 [P] Create lifecycle sample placeholder `packages/product-test-harness/src/samples/neon-lifecycle-scenario.ts`
- [x] T004 Update public exports for forthcoming DB lifecycle modules in `packages/product-test-harness/src/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define shared lifecycle types, errors, and redaction helpers required by every user story.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T005 Define lifecycle config, cleanup policy, branch context, phase metadata, and lifecycle metadata types in `packages/product-test-harness/src/contracts.ts`
- [x] T006 [P] Implement database URL redaction helpers in `packages/product-test-harness/src/db/redaction.ts`
- [x] T007 [P] Implement typed lifecycle errors in `packages/product-test-harness/src/db/lifecycle.ts`
- [x] T008 Add lifecycle metadata validation helpers in `packages/product-test-harness/src/validation.ts`
- [x] T009 [P] Add redaction unit tests in `packages/product-test-harness/src/__tests__/db-lifecycle.test.ts`

**Checkpoint**: Lifecycle data structures and safe metadata validation are ready.

---

## Phase 3: User Story 1 - Run in an Isolated Database Branch (Priority: P1)

**Goal**: Create an isolated branch, expose the branch-scoped database URL only to callbacks, and record safe branch metadata in the run result.

**Independent Test**: Fake branch manager creates a branch, fake scenario callback receives `database_url`, and the completed result includes safe branch metadata without exposing the raw URL.

### Tests for User Story 1

- [x] T010 [P] [US1] Add branch creation and scenario callback ordering test in `packages/product-test-harness/src/__tests__/db-lifecycle.test.ts`
- [x] T011 [P] [US1] Add safe branch metadata assertion test in `packages/product-test-harness/src/__tests__/db-lifecycle.test.ts`

### Implementation for User Story 1

- [x] T012 [US1] Implement lifecycle dependency interfaces for branch creation/deletion in `packages/product-test-harness/src/db/lifecycle.ts`
- [x] T013 [US1] Implement branch name generation and branch creation phase in `packages/product-test-harness/src/db/lifecycle.ts`
- [x] T014 [US1] Pass branch-scoped context into the scenario callback in `packages/product-test-harness/src/db/lifecycle.ts`
- [x] T015 [US1] Attach safe branch lifecycle metadata to `ScenarioRunResult.metadata` in `packages/product-test-harness/src/db/lifecycle.ts`

**Checkpoint**: User Story 1 is independently functional and testable.

---

## Phase 4: User Story 2 - Apply Migrations Before Product Actions (Priority: P1)

**Goal**: Ensure migrations run after branch creation and before seed/scenario callbacks, and failures skip unsafe downstream work.

**Independent Test**: Fake migration runner records order; migration failure prevents seed and scenario callbacks while preserving cleanup behavior for later stories.

### Tests for User Story 2

- [x] T016 [P] [US2] Add migration-before-scenario order test in `packages/product-test-harness/src/__tests__/db-lifecycle.test.ts`
- [x] T017 [P] [US2] Add migration failure skips scenario test in `packages/product-test-harness/src/__tests__/db-lifecycle.test.ts`

### Implementation for User Story 2

- [x] T018 [US2] Implement migration runner dependency interface in `packages/product-test-harness/src/db/lifecycle.ts`
- [x] T019 [US2] Invoke migration runner after branch creation and before seed/scenario callbacks in `packages/product-test-harness/src/db/lifecycle.ts`
- [x] T020 [US2] Record migration status, timing, source, and safe error summaries in lifecycle metadata in `packages/product-test-harness/src/db/lifecycle.ts`
- [x] T021 [US2] Add default adapter factory using `@spyglass/test-harness` Neon and migration primitives in `packages/product-test-harness/src/db/lifecycle.ts`

**Checkpoint**: User Story 2 is independently functional and testable.

---

## Phase 5: User Story 3 - Clean Up Reliably and Report Cleanup Status (Priority: P1)

**Goal**: Cleanup branch lifecycle is attempted according to policy and reported independently from scenario status.

**Independent Test**: Fake deletion succeeds, is retained, and fails across separate tests; every result includes cleanup metadata and redacts raw database URLs.

### Tests for User Story 3

- [x] T022 [P] [US3] Add cleanup-on-success and cleanup-on-scenario-failure tests in `packages/product-test-harness/src/__tests__/db-lifecycle.test.ts`
- [x] T023 [P] [US3] Add retained-branch policy test requiring retain reason in `packages/product-test-harness/src/__tests__/db-lifecycle.test.ts`
- [x] T024 [P] [US3] Add cleanup failure metadata and raw URL redaction test in `packages/product-test-harness/src/__tests__/db-lifecycle.test.ts`

### Implementation for User Story 3

- [x] T025 [US3] Implement cleanup policy evaluation in `packages/product-test-harness/src/db/lifecycle.ts`
- [x] T026 [US3] Invoke branch deletion in success and failure paths in `packages/product-test-harness/src/db/lifecycle.ts`
- [x] T027 [US3] Record cleanup status, reason, timing, and failure evidence in lifecycle metadata in `packages/product-test-harness/src/db/lifecycle.ts`
- [x] T028 [US3] Ensure JSON and Markdown report output uses redacted lifecycle metadata in `packages/product-test-harness/src/reports/json.ts` and `packages/product-test-harness/src/reports/markdown.ts`

**Checkpoint**: User Story 3 is independently functional and testable.

---

## Phase 6: User Story 4 - Seed Lifecycle Metadata for Later Factories (Priority: P2)

**Goal**: Run an optional seed callback after migrations and before scenario execution, preserving seed version and seed references without implementing full seed factories.

**Independent Test**: Fake seed callback returns seed metadata; result includes seed version and seed refs. Seed failure skips scenario and still attempts cleanup.

### Tests for User Story 4

- [x] T029 [P] [US4] Add seed-before-scenario metadata test in `packages/product-test-harness/src/__tests__/db-lifecycle.test.ts`
- [x] T030 [P] [US4] Add seed failure skips scenario and attempts cleanup test in `packages/product-test-harness/src/__tests__/db-lifecycle.test.ts`

### Implementation for User Story 4

- [x] T031 [US4] Implement seed callback interface and invocation in `packages/product-test-harness/src/db/lifecycle.ts`
- [x] T032 [US4] Record seed status, version, refs, timing, and safe error summaries in lifecycle metadata in `packages/product-test-harness/src/db/lifecycle.ts`
- [x] T033 [US4] Implement no-external-service lifecycle sample in `packages/product-test-harness/src/samples/neon-lifecycle-scenario.ts`

**Checkpoint**: User Story 4 is independently functional and testable.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, roadmap evidence, and final validation.

- [x] T034 Update `packages/product-test-harness/src/__tests__/reports.test.ts` if lifecycle report redaction requires additional coverage
- [x] T035 Update `.specify/specs/027-product-harness-neon-seeds/quickstart.md` with actual command output notes
- [x] T036 Run `pnpm --filter @spyglass/product-test-harness test`
- [x] T037 Run `pnpm --filter @spyglass/product-test-harness type-check`
- [x] T038 Run `pnpm --filter @spyglass/product-test-harness build`
- [x] T039 Run `pnpm --filter @spyglass/product-test-harness lint`
- [x] T040 Run `pnpm --filter @spyglass/product-test-harness run:lifecycle-sample`
- [x] T041 Run `/speckit-analyze` equivalent and record findings in `.specify/specs/027-product-harness-neon-seeds/analyze-report.md`
- [ ] T042 Final diff review, commit, push, and open PR

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 Setup has no dependencies.
- Phase 2 Foundational depends on Phase 1 and blocks all user stories.
- US1, US2, and US3 are all P1, but should be implemented in order because migration and cleanup wrap branch creation.
- US4 depends on US1-US3 lifecycle structure.
- Polish depends on all desired user stories.

### User Story Dependencies

- **US1**: Starts after Foundational.
- **US2**: Depends on US1 branch context.
- **US3**: Depends on US1 branch context and integrates with US2 failure paths.
- **US4**: Depends on US2 migration ordering and US3 cleanup behavior.

### Parallel Opportunities

- T002 and T003 can run in parallel.
- T006, T007, and T009 can run in parallel after T005 direction is clear.
- Tests within each user story can be written in parallel with implementation in different files only when preserving TDD order is not required by the assignee.
- Documentation update T035 can run after sample behavior stabilizes.

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete US1 branch lifecycle and safe metadata.
3. Validate US1 independently with fake dependencies.
4. Add migration ordering, cleanup guarantees, then seed lifecycle.

### Incremental Delivery

1. Branch context and safe metadata.
2. Migration ordering and failure behavior.
3. Cleanup policy and cleanup evidence.
4. Seed callback and lifecycle sample.
5. Quickstart evidence and PR publication.
