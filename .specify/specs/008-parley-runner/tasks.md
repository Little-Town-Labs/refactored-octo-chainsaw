# Tasks: F08 Parley Runner

**Input**: Design documents from `.specify/specs/008-parley-runner/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included because F08 is Stage 4 P0 runtime/compliance infrastructure and each story must be independently verifiable.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Turn the F08 placeholder package into a typed harness package.

- [x] T001 Update `packages/parley/package.json` with dependencies, `dev-run:f08`, and contract validation dev dependencies
- [x] T002 Create `packages/parley/eslint.config.js`
- [x] T003 Create `packages/parley/src/types.ts`, `packages/parley/src/events.ts`, `packages/parley/src/repo.ts`, and update `packages/parley/src/index.ts`
- [x] T004 [P] Add F08 contract schema validation tests in `packages/parley/src/__tests__/contracts.test.ts`
- [x] T005 [P] Add staged run skeleton in `packages/parley/scripts/f08-staged-dev-run.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared config, run repository, context manager, scoring adapters, and tool semantic gates.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T006 Implement F08 function-definition metadata in `packages/parley/src/events.ts`
- [x] T007 Implement harness config and default round-cap behavior in `packages/parley/src/config.ts`
- [x] T008 Implement `ParleyRunRepository` and in-memory repository in `packages/parley/src/repo.ts`
- [x] T009 Implement per-run/per-side context manager in `packages/parley/src/context.ts`
- [x] T010 Implement deterministic scoring adapter from F07b rubric scores to F10 dossier breakdowns in `packages/parley/src/scoring.ts`
- [x] T011 Implement human-input semantics catalog scan in `packages/parley/src/tool-scan.ts`
- [x] T012 [P] Add context isolation tests in `packages/parley/src/__tests__/context.test.ts`
- [x] T013 [P] Add tool semantic scan tests in `packages/parley/src/__tests__/tool-scan.test.ts`
- [x] T014 [P] Add scoring adapter tests in `packages/parley/src/__tests__/scoring.test.ts`

**Checkpoint**: Foundation ready; user story implementation can begin.

---

## Phase 3: User Story 1 - Dispatch a Match into a Bounded Parley Run (Priority: P1) 🎯 MVP

**Goal**: Dispatch match-made events into exactly one preflighted active run.

**Independent Test**: Dispatch valid, duplicate, and refused match events and verify frozen refs, idempotency, and terminal refusal evidence.

### Tests for User Story 1

- [x] T015 [P] [US1] Add dispatch success/idempotency tests in `packages/parley/src/__tests__/dispatcher.test.ts`
- [x] T016 [P] [US1] Add dispatch refusal tests for missing rubric bias evidence and forbidden tool semantics in `packages/parley/src/__tests__/dispatcher.test.ts`

### Implementation for User Story 1

- [x] T017 [US1] Implement dispatch preflight and run claim flow in `packages/parley/src/dispatcher.ts`
- [x] T018 [US1] Wire F07a contract resolution and F07b rubric dependency gate into `packages/parley/src/dispatcher.ts`
- [x] T019 [US1] Record dispatch refused terminal events in `packages/parley/src/dispatcher.ts`
- [x] T020 [US1] Export dispatcher APIs from `packages/parley/src/index.ts`

**Checkpoint**: User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Coordinate Side Turns Through Run-to-Completion (Priority: P1)

**Goal**: Drive seeker/employer turns through the Parley run-state machine.

**Independent Test**: Use deterministic side-agent fixtures to verify strict alternation, round cap, done handling, scoring handoff, and inconclusive failure handoff.

### Tests for User Story 2

- [x] T021 [P] [US2] Add coordinator round-cap and alternation tests in `packages/parley/src/__tests__/coordinator.test.ts`
- [x] T022 [P] [US2] Add both-sides-done and incomplete-scoring tests in `packages/parley/src/__tests__/coordinator.test.ts`

### Implementation for User Story 2

- [x] T023 [US2] Implement injectable side-agent driver protocol in `packages/parley/src/side-runner.ts`
- [x] T024 [US2] Implement coordinator state transitions in `packages/parley/src/coordinator.ts`
- [x] T025 [US2] Implement structured turn/scoring output validation in `packages/parley/src/side-runner.ts`
- [x] T026 [US2] Ensure coordinator requests inconclusive dossier instead of pause states in `packages/parley/src/coordinator.ts`
- [x] T027 [US2] Export coordinator and side-runner APIs from `packages/parley/src/index.ts`

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Enforce Context and Tool Isolation (Priority: P1)

**Goal**: Enforce Parley §9 isolation and dispatcher/privacy boundaries.

**Independent Test**: Prove cross-run prompt injection cannot leak, raw counterparty data cannot be passed to prompt assembly, and terminal runs release contexts.

### Tests for User Story 3

- [x] T028 [P] [US3] Add cross-run prompt-injection fixture test in `packages/parley/src/__tests__/isolation.test.ts`
- [x] T029 [P] [US3] Add type-level raw counterparty prompt boundary test in `packages/parley/src/__tests__/prompt-boundary.test.ts`
- [x] T030 [P] [US3] Add terminal context release test in `packages/parley/src/__tests__/context.test.ts`

### Implementation for User Story 3

- [x] T031 [US3] Implement prompt input types that only accept projected views in `packages/parley/src/side-runner.ts`
- [x] T032 [US3] Implement privacy-filter worker wrapper in `packages/parley/src/filter-worker.ts`
- [x] T033 [US3] Ensure context updates require privacy projection refs in `packages/parley/src/context.ts`
- [x] T034 [US3] Export filter worker and context APIs from `packages/parley/src/index.ts`

**Checkpoint**: User Stories 1, 2, and 3 are independently functional.

---

## Phase 6: User Story 4 - Produce Signed Complete or Inconclusive Dossiers (Priority: P1)

**Goal**: Produce signed F10 dossiers and terminal events for conclusive and inconclusive runs.

**Independent Test**: Execute a synthetic match to signed valid dossier and execute incomplete scoring to inconclusive dossier.

### Tests for User Story 4

- [x] T035 [P] [US4] Add dossier producer conclusive/inconclusive tests in `packages/parley/src/__tests__/dossier-producer.test.ts`
- [x] T036 [P] [US4] Add end-to-end synthetic Parley run test in `packages/parley/src/__tests__/synthetic-run.test.ts`

### Implementation for User Story 4

- [x] T037 [US4] Implement F10 dossier build/sign handoff in `packages/parley/src/dossier-producer.ts`
- [x] T038 [US4] Implement terminal event emission in `packages/parley/src/dossier-producer.ts`
- [x] T039 [US4] Implement run invalidation handler in `packages/parley/src/invalidator.ts`
- [x] T040 [US4] Export dossier producer and invalidator APIs from `packages/parley/src/index.ts`

**Checkpoint**: All user stories are independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verification, documentation, and required closure reviews.

- [x] T041 Implement F08 staged quickstart run in `packages/parley/scripts/f08-staged-dev-run.ts`
- [x] T042 Run and record quickstart evidence in `.specify/specs/008-parley-runner/quickstart-run-2026-05-21.md`
- [x] T043 Run `/speckit-analyze` and record findings in `.specify/specs/008-parley-runner/analyze-report.md`
- [x] T044 Run `/code-review` and record findings in `.specify/specs/008-parley-runner/code-review-t044.md`
- [x] T045 Run `/security-review` and record findings in `.specify/specs/008-parley-runner/security-review-t045.md`
- [x] T046 Run final verification: `pnpm --filter @spyglass/parley test`, `pnpm --filter @spyglass/parley type-check`, `pnpm --filter @spyglass/parley lint`, `pnpm --filter @spyglass/parley build`, `pnpm --filter @spyglass/parley dev-run:f08`, `pnpm --filter @spyglass/tool-dispatcher boundary:check`, `pnpm --filter @spyglass/privacy-filter reachability:check`, `pnpm --filter @spyglass/privacy-filter boundary:check`, `pnpm --filter @spyglass/dossiers test`, and `pnpm schema:lint`
- [x] T047 Update `.specify/roadmap.md` Stage 4 notes after F08 implementation evidence is complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup completion and blocks user stories.
- **User Stories (Phase 3+)**: Depend on Foundational completion.
- **Polish (Phase 7)**: Depends on all user stories.

### User Story Dependencies

- **US1 (P1)**: Starts after Foundational; dispatch claim/refusal path.
- **US2 (P1)**: Depends on US1 run records and foundational side-runner interfaces.
- **US3 (P1)**: Depends on context manager and side-runner prompt input types.
- **US4 (P1)**: Depends on US2 scoring handoff and US3 filtered projection contracts.

### Parallel Opportunities

- T004/T005 can run in parallel.
- T012/T013/T014 can run in parallel after foundational files exist.
- Test tasks within each user story can run in parallel.
- Dossier producer tests can be drafted once scoring adapter output shape is stable.

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational phases.
2. Complete US1 dispatch and refusal behavior.
3. Complete US2 deterministic coordinator and side-runner fixtures.

### Incremental Delivery

1. US1: dispatch and frozen refs.
2. US2: bounded run state machine.
3. US3: context/tool/privacy isolation.
4. US4: signed/inconclusive dossier production and terminal events.

## Notes

- F08 does not introduce polling.
- F08 does not create filesystem workspaces.
- F08 does not call real model gateways in the first slice.
- F08 must mark every completed task as `[x]` during implementation.
