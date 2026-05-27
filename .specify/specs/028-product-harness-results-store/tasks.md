# Tasks: Product Harness Results Store

**Input**: Design documents from `.specify/specs/028-product-harness-results-store/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/result-store.schema.json, quickstart.md

**Tests**: This feature requires Jest unit tests because persistence, validation, duplicate handling, and query semantics are core acceptance criteria.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare package structure and sample command wiring for result-store work.

- [x] T001 Create result-store source directory `packages/product-test-harness/src/results/`
- [x] T002 [P] Create local result-store sample placeholder `packages/product-test-harness/src/samples/result-store-scenario.ts`
- [x] T003 Add `run:result-store-sample` script in `packages/product-test-harness/package.json`
- [x] T004 Update public exports for forthcoming result-store modules in `packages/product-test-harness/src/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define shared result-store types, errors, validation, and snapshot helpers required by every user story.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T005 Define result-store snapshot, evidence record, query filter, summary, save result, and store interface types in `packages/product-test-harness/src/contracts.ts`
- [x] T006 [P] Implement result-store validation helpers in `packages/product-test-harness/src/results/validation.ts`
- [x] T007 [P] Implement typed result-store errors and snapshot creation helpers in `packages/product-test-harness/src/results/store.ts`
- [x] T008 [P] Add validation unit tests in `packages/product-test-harness/src/__tests__/result-store.test.ts`

**Checkpoint**: Result-store data structures and safe persistence validation are ready.

---

## Phase 3: User Story 1 - Persist Harness Run Evidence (Priority: P1)

**Goal**: Persist and load a complete run snapshot with artifacts and future evidence categories intact.

**Independent Test**: Save a valid snapshot to a local store and load it by run id with the same run, steps, assertions, artifacts, and empty specialized evidence arrays.

### Tests for User Story 1

- [x] T009 [P] [US1] Add save/load valid snapshot test in `packages/product-test-harness/src/__tests__/result-store.test.ts`
- [x] T010 [P] [US1] Add artifact contract persistence test in `packages/product-test-harness/src/__tests__/result-store.test.ts`

### Implementation for User Story 1

- [x] T011 [US1] Implement `LocalFileProductResultStore.saveRun` in `packages/product-test-harness/src/results/local-file-store.ts`
- [x] T012 [US1] Implement `LocalFileProductResultStore.getRun` in `packages/product-test-harness/src/results/local-file-store.ts`
- [x] T013 [US1] Persist snapshots atomically enough to avoid partial writes on validation failure in `packages/product-test-harness/src/results/local-file-store.ts`

**Checkpoint**: User Story 1 is independently functional and testable.

---

## Phase 4: User Story 2 - Query Stored Runs for Gate Decisions (Priority: P1)

**Goal**: List recent stored run summaries by gate/eval mode, status, scenario id, environment label, git ref, and time window.

**Independent Test**: Save multiple snapshots and query for failed gate runs and scenario-specific runs in newest-first order.

### Tests for User Story 2

- [x] T014 [P] [US2] Add mode/status/scenario filter tests in `packages/product-test-harness/src/__tests__/result-store.test.ts`
- [x] T015 [P] [US2] Add environment/git/time-window filter tests in `packages/product-test-harness/src/__tests__/result-store.test.ts`
- [x] T016 [P] [US2] Add no-match empty-list test in `packages/product-test-harness/src/__tests__/result-store.test.ts`

### Implementation for User Story 2

- [x] T017 [US2] Implement `LocalFileProductResultStore.listRuns` with serializable filters in `packages/product-test-harness/src/results/local-file-store.ts`
- [x] T018 [US2] Implement run summary projection and newest-first ordering in `packages/product-test-harness/src/results/store.ts`

**Checkpoint**: User Story 2 is independently functional and testable.

---

## Phase 5: User Story 3 - Reject Unsafe or Incomplete Evidence (Priority: P2)

**Goal**: Reject invalid snapshots, unsafe metadata, and duplicate run id conflicts before persistence.

**Independent Test**: Invalid artifact evidence, raw database URLs, and conflicting duplicate writes fail without creating or mutating a stored run.

### Tests for User Story 3

- [x] T019 [P] [US3] Add raw database URL rejection test in `packages/product-test-harness/src/__tests__/result-store.test.ts`
- [x] T020 [P] [US3] Add sensitive synthetic artifact redaction note test in `packages/product-test-harness/src/__tests__/result-store.test.ts`
- [x] T021 [P] [US3] Add duplicate identical write and conflicting duplicate write tests in `packages/product-test-harness/src/__tests__/result-store.test.ts`
- [x] T022 [P] [US3] Add validation failure no-partial-write test in `packages/product-test-harness/src/__tests__/result-store.test.ts`

### Implementation for User Story 3

- [x] T023 [US3] Enforce unsafe metadata and artifact validation in `packages/product-test-harness/src/results/validation.ts`
- [x] T024 [US3] Enforce duplicate idempotency/conflict handling in `packages/product-test-harness/src/results/local-file-store.ts`
- [x] T025 [US3] Implement local store sample in `packages/product-test-harness/src/samples/result-store-scenario.ts`

**Checkpoint**: All user stories are independently functional and testable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, roadmap evidence, and final validation.

- [x] T026 Update `.specify/specs/028-product-harness-results-store/quickstart.md` with actual command output notes
- [x] T027 Run `pnpm --filter @spyglass/product-test-harness test`
- [x] T028 Run `pnpm --filter @spyglass/product-test-harness type-check`
- [x] T029 Run `pnpm --filter @spyglass/product-test-harness build`
- [x] T030 Run `pnpm --filter @spyglass/product-test-harness lint`
- [x] T031 Run `pnpm --filter @spyglass/product-test-harness run:result-store-sample`
- [x] T032 Run `/speckit-analyze` equivalent and record findings in `.specify/specs/028-product-harness-results-store/analyze-report.md`
- [ ] T033 Final diff review, commit, push, and open PR

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 Setup has no dependencies.
- Phase 2 Foundational depends on Phase 1 and blocks all user stories.
- US1 and US2 are both P1, but US2 depends on persisted snapshots from US1.
- US3 depends on the store write path from US1.
- Polish depends on all desired user stories.

### User Story Dependencies

- **US1**: Starts after Foundational.
- **US2**: Depends on US1 save/load behavior.
- **US3**: Depends on US1 write behavior and Foundational validation helpers.

### Parallel Opportunities

- T002 can run in parallel with T003.
- T006, T007, and T008 can run in parallel after T005 direction is clear.
- US1 tests can be written while the local store skeleton is implemented.
- US2 and US3 tests can be expanded after US1 persistence is in place.

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete US1 persistence and load behavior.
3. Validate US1 independently with a temporary local store.
4. Add query filters, duplicate handling, and unsafe evidence rejection.

### Incremental Delivery

1. Snapshot contract and validation.
2. Local file save/load.
3. Query filters and summaries.
4. Safety validation and duplicate handling.
5. Sample, quickstart evidence, and PR publication.
