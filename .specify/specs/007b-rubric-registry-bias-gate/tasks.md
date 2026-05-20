# Tasks: F07b Rubric Registry + Bias-Test Dispatch Gate

**Input**: Design documents from `.specify/specs/007b-rubric-registry-bias-gate/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Test tasks are included because F07b is a compliance gate with immutable storage, fail-closed dispatch, deterministic scoring, and CI-gated refusal behavior.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the F07b package, schema entry points, and documentation skeleton.

- [ ] T001 Create `packages/rubrics/package.json`, `packages/rubrics/tsconfig.json`, `packages/rubrics/jest.config.js`, and `packages/rubrics/eslint.config.js`
- [ ] T002 Create `packages/rubrics/src/index.ts`, `packages/rubrics/src/types.ts`, `packages/rubrics/src/validation.ts`, `packages/rubrics/src/repo.ts`, and `packages/rubrics/src/scopes.ts`
- [ ] T003 Add F07b schema export placeholder in `packages/db/src/schema/rubrics.ts` and wire it from `packages/db/src/schema/index.ts`
- [ ] T004 [P] Add F07b runbook skeleton in `docs/runbooks/rubric-registry-bias-gate.md`
- [ ] T005 [P] Add F07b staged-run script skeleton in `packages/rubrics/scripts/f07b-staged-dev-run.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish governance, storage, shared validation, and audit contracts that all stories depend on.

**CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T006 Add `rubric_policy`, `rubric_evidence`, and `rubric_dispatch_evidence` classes and F07b table entries to `docs/data-governance/data-classification.yaml`
- [ ] T007 Add F07b retention entries to `docs/data-governance/retention-policy.md`
- [ ] T008 Add F07b integrity invariants for `rubric_versions`, `rubric_events`, `bias_test_artifacts`, and `rubric_dispatch_gate_events` to `docs/data-governance/integrity-invariants.md`
- [ ] T009 Implement Drizzle schema for `rubric_versions`, `rubric_events`, `bias_test_artifacts`, and `rubric_dispatch_gate_events` in `packages/db/src/schema/rubrics.ts`
- [ ] T010 Add migration `packages/db/migrations/0009_f07b_rubric_registry_bias_gate.sql` and update `packages/db/migrations/meta/_journal.json`
- [ ] T011 [P] Add JSON Schema contract validation tests for F07b contract files in `packages/rubrics/src/__tests__/contracts.test.ts`
- [ ] T012 [P] Implement shared F07b type definitions and reason-code unions in `packages/rubrics/src/types.ts`
- [ ] T013 Implement shared validation helpers for rubric dimensions, weights, statuses, and content hashes in `packages/rubrics/src/validation.ts`
- [ ] T014 Implement in-memory test fixtures and repo harness in `packages/rubrics/src/__tests__/fixtures.ts`

**Checkpoint**: Foundation ready; user story implementation can begin.

---

## Phase 3: User Story 1 - Resolve Immutable Rubrics for Dispatch (Priority: P1) MVP

**Goal**: Published rubric refs resolve deterministically and existing `(rubric_id, version)` rows cannot be overwritten.

**Independent Test**: Resolve a published rubric, verify returned definition/provenance, and verify mutation attempts fail.

### Tests for User Story 1

- [ ] T015 [P] [US1] Add immutable publish and duplicate-version tests in `packages/rubrics/src/__tests__/publish.test.ts`
- [ ] T016 [P] [US1] Add resolver success, missing, unpublished, and deprecated tests in `packages/rubrics/src/__tests__/resolver.test.ts`

### Implementation for User Story 1

- [ ] T017 [US1] Implement rubric publication and deprecation logic with scoped principals in `packages/rubrics/src/publish.ts`
- [ ] T018 [US1] Implement rubric repository write/read operations in `packages/rubrics/src/repo.ts`
- [ ] T019 [US1] Implement dispatch-facing rubric resolution in `packages/rubrics/src/dispatch-gate.ts`
- [ ] T020 [US1] Emit canonical audit evidence for rubric publication and deprecation in `packages/rubrics/src/publish.ts`
- [ ] T021 [US1] Export publication, deprecation, resolution, and reason-code APIs from `packages/rubrics/src/index.ts`

**Checkpoint**: User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Gate Dispatch on Bias-Test Evidence (Priority: P1)

**Goal**: Production dispatch refuses rubrics without valid completed bias-test evidence.

**Independent Test**: Attempt dispatch with missing, incomplete, rejected, expired, hash-mismatched, and insufficient-coverage artifacts and verify stable denial codes.

### Tests for User Story 2

- [ ] T022 [P] [US2] Add bias-test artifact registration tests in `packages/rubrics/src/__tests__/bias-test.test.ts`
- [ ] T023 [P] [US2] Add bias-test dispatch refusal matrix tests in `packages/rubrics/src/__tests__/dispatch-gate.test.ts`

### Implementation for User Story 2

- [ ] T024 [US2] Implement bias-test artifact registration and status validation in `packages/rubrics/src/bias-test.ts`
- [ ] T025 [US2] Implement rubric hash binding and artifact lookup in `packages/rubrics/src/repo.ts`
- [ ] T026 [US2] Implement production dispatch gate checks for bias-test states and jurisdiction coverage in `packages/rubrics/src/dispatch-gate.ts`
- [ ] T027 [US2] Emit canonical audit evidence for bias-test registration and dispatch refusal in `packages/rubrics/src/bias-test.ts` and `packages/rubrics/src/dispatch-gate.ts`
- [ ] T028 [US2] Add F07a contract-rubric ref validation adapter in `packages/rubrics/src/dispatch-gate.ts`

**Checkpoint**: User Stories 1 and 2 both work independently, and missing bias evidence refuses dispatch.

---

## Phase 5: User Story 3 - Compute Weighted Scores Deterministically (Priority: P1)

**Goal**: Harness scoring uses deterministic per-dimension weighted totals and ignores model-produced holistic scores.

**Independent Test**: Repeated aggregation from the same inputs returns the same total, out-of-range inputs fail closed, and model holistic scores produce audit/regression signals without changing totals.

### Tests for User Story 3

- [ ] T029 [P] [US3] Add deterministic weighted scoring tests in `packages/rubrics/src/__tests__/scoring.test.ts`
- [ ] T030 [P] [US3] Add holistic-score ignored regression tests in `packages/rubrics/src/__tests__/scoring-regression.test.ts`

### Implementation for User Story 3

- [ ] T031 [US3] Implement weight normalization and rounding policy in `packages/rubrics/src/scoring.ts`
- [ ] T032 [US3] Implement per-dimension score validation and fail-closed aggregation errors in `packages/rubrics/src/scoring.ts`
- [ ] T033 [US3] Implement model holistic score detection and regression signal emission in `packages/rubrics/src/scoring.ts`
- [ ] T034 [US3] Export weighted score result types and helpers from `packages/rubrics/src/index.ts`

**Checkpoint**: User Stories 1, 2, and 3 are independently functional.

---

## Phase 6: User Story 4 - Review Rubric and Bias-Test History (Priority: P2)

**Goal**: Scoped reviewers can reconstruct rubric, bias-test, and dispatch-denial history without raw database access.

**Independent Test**: Scoped reads return bounded metadata and unscoped reads are denied by default.

### Tests for User Story 4

- [ ] T035 [P] [US4] Add scoped rubric and bias-test review read tests in `packages/rubrics/src/__tests__/review.test.ts`
- [ ] T036 [P] [US4] Add unscoped access denial tests in `packages/rubrics/src/__tests__/review-auth.test.ts`

### Implementation for User Story 4

- [ ] T037 [US4] Implement scoped review reads for rubric versions and events in `packages/rubrics/src/review.ts`
- [ ] T038 [US4] Implement scoped review reads for bias-test artifacts and dispatch gate events in `packages/rubrics/src/review.ts`
- [ ] T039 [US4] Add review scopes and descriptions in `packages/rubrics/src/scopes.ts`
- [ ] T040 [US4] Export review APIs from `packages/rubrics/src/index.ts`

**Checkpoint**: All user stories are independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verification, documentation, and required closure reviews.

- [ ] T041 [P] Update `docs/runbooks/rubric-registry-bias-gate.md` with publish, artifact registration, dispatch refusal, scoring, review, and rollback procedures
- [ ] T042 Implement staged quickstart run in `packages/rubrics/scripts/f07b-staged-dev-run.ts`
- [ ] T043 Run and record quickstart evidence in `.specify/specs/007b-rubric-registry-bias-gate/quickstart-run-2026-05-20.md`
- [ ] T044 Run `/speckit-analyze` and record findings in `.specify/specs/007b-rubric-registry-bias-gate/analyze-report.md`
- [ ] T045 Run `/code-review` and record findings in `.specify/specs/007b-rubric-registry-bias-gate/code-review-t045.md`
- [ ] T046 Run `/security-review` and record findings in `.specify/specs/007b-rubric-registry-bias-gate/security-review-t046.md`
- [ ] T047 Run final verification: `pnpm --filter @spyglass/rubrics test`, `pnpm --filter @spyglass/rubrics type-check`, `pnpm --filter @spyglass/rubrics lint`, and `pnpm schema:lint`
- [ ] T048 Update `.specify/roadmap.md` Stage 3 notes after F07b implementation evidence is complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user stories.
- **US1 (Phase 3)**: Depends on Foundational; MVP for rubric storage and resolution.
- **US2 (Phase 4)**: Depends on US1 because bias artifacts attach to immutable rubric versions.
- **US3 (Phase 5)**: Depends on Foundational and rubric validation from US1; can run after US1.
- **US4 (Phase 6)**: Depends on US1 and US2 event shapes.
- **Polish (Phase 7)**: Depends on all selected user stories.

### User Story Dependencies

- **User Story 1 (P1)**: Start after Foundational; no dependency on other stories.
- **User Story 2 (P1)**: Requires US1 rubric refs and content hashes.
- **User Story 3 (P1)**: Requires US1 dimension and aggregation validation.
- **User Story 4 (P2)**: Requires event records from US1 and US2.

### Parallel Opportunities

- T004 and T005 can run alongside package skeleton work.
- T011, T012, and parts of T014 can run after schema contracts are stable.
- US1 tests T015 and T016 can be written in parallel.
- US2 tests T022 and T023 can be written in parallel.
- US3 tests T029 and T030 can be written in parallel.
- US4 tests T035 and T036 can be written in parallel.

---

## Parallel Example: User Story 2

```text
Task: "Add bias-test artifact registration tests in packages/rubrics/src/__tests__/bias-test.test.ts"
Task: "Add bias-test dispatch refusal matrix tests in packages/rubrics/src/__tests__/dispatch-gate.test.ts"
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete User Story 1 to establish immutable rubric versions.
3. Validate US1 independently with `publish.test.ts` and `resolver.test.ts`.
4. Complete User Story 2 before any Parley runtime integration.

### Compliance Gate Completion

1. Complete deterministic scoring in User Story 3.
2. Complete scoped review reads in User Story 4.
3. Run quickstart, analyze, code review, security review, and final gates.
