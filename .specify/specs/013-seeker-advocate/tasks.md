# Tasks: F13 Seeker Advocate Agent

**Input**: Design documents from `.specify/specs/013-seeker-advocate/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [quickstart.md](quickstart.md), [contracts/](contracts/)

**Tests**: Required. F13 includes contract tests, unit tests, eval baseline tests, import-boundary tests, and a staged dev-run.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Phase 1: Setup

**Purpose**: Prepare the existing `@spyglass/agents` package for F13 seeker-side implementation.

- [ ] T001 Update `packages/agents/package.json` with F13 dependencies, `dev-run:f13`, and test/build scripts
- [ ] T002 [P] Add `packages/agents/jest.config.js` for ESM package tests
- [ ] T003 [P] Add `packages/agents/eslint.config.js` for package-local lint rules
- [ ] T004 [P] Update `packages/agents/README.md` with F13 seeker advocate scope and F14 boundary
- [ ] T005 [P] Add contract schema validation harness in `packages/agents/src/__tests__/contracts.test.ts`

---

## Phase 2: Foundational

**Purpose**: Shared types, reason codes, fixtures, and safety boundaries required before user stories.

**Critical**: No user story work can begin until this phase is complete.

- [ ] T006 Define seeker advocate refs, frozen runtime refs, result unions, and reason-code types in `packages/agents/src/types.ts`
- [ ] T007 [P] Add deterministic F13 fixtures for contracts, rubrics, manifests, contexts, turns, scores, refusals, and eval cases in `packages/agents/src/fixtures.ts`
- [ ] T008 [P] Add direct-provider import boundary scanner in `packages/agents/src/import-boundary.ts`
- [ ] T009 [P] Add direct-provider import boundary tests in `packages/agents/src/__tests__/import-boundary.test.ts`
- [ ] T010 Add public exports for F13 types and utilities in `packages/agents/src/index.ts`
- [ ] T011 Add JSON Schema contract tests for F13 schemas in `packages/agents/src/__tests__/contracts.test.ts`

**Checkpoint**: Foundation ready. User story implementation can start.

---

## Phase 3: User Story 1 - Seeker-Side Negotiation Turn (Priority: P1)

**Goal**: Produce a structured seeker-side negotiation turn from frozen refs, seeker principal view, filtered employer projection, and run context.

**Independent Test**: Provide a valid seeker-side run input and confirm the driver returns a structured turn result or bounded refusal without mutating frozen refs.

### Tests for User Story 1

- [ ] T012 [P] [US1] Add turn contract acceptance tests in `packages/agents/src/__tests__/seeker-turn-contract.test.ts`
- [ ] T013 [P] [US1] Add frozen-ref no-hot-reload tests in `packages/agents/src/__tests__/seeker-turn-refs.test.ts`
- [ ] T014 [P] [US1] Add invalid-ref refusal tests in `packages/agents/src/__tests__/seeker-turn-refusal.test.ts`
- [ ] T015 [P] [US1] Add fake-gateway accepted-turn integration test in `packages/agents/src/__tests__/seeker-turn-invocation.test.ts`

### Implementation for User Story 1

- [ ] T016 [US1] Implement seeker turn input validation in `packages/agents/src/seeker-advocate.ts`
- [ ] T017 [US1] Implement frozen prompt/model/manifest/contract/rubric/privacy/tool ref validation in `packages/agents/src/seeker-advocate.ts`
- [ ] T018 [US1] Implement F12 invocation request assembly for seeker turns in `packages/agents/src/seeker-advocate.ts`
- [ ] T019 [US1] Implement accepted seeker turn result mapping with invocation and audit refs in `packages/agents/src/seeker-advocate.ts`
- [ ] T020 [US1] Implement bounded turn refusal mapping and stable reason codes in `packages/agents/src/seeker-advocate.ts`
- [ ] T021 [US1] Export seeker turn driver from `packages/agents/src/index.ts`

**Checkpoint**: User Story 1 is independently functional and testable.

---

## Phase 4: User Story 2 - Seeker-Side Rubric Scoring (Priority: P1)

**Goal**: Produce validated per-dimension seeker-side scores and rationales that the harness can aggregate deterministically.

**Independent Test**: Request final seeker-side scoring with a resolved seeker rubric and confirm every dimension is represented exactly once or an auditable validation/inconclusive path is returned.

### Tests for User Story 2

- [ ] T022 [P] [US2] Add scoring contract acceptance tests in `packages/agents/src/__tests__/seeker-scoring-contract.test.ts`
- [ ] T023 [P] [US2] Add rubric dimension coverage tests in `packages/agents/src/__tests__/seeker-scoring-validation.test.ts`
- [ ] T024 [P] [US2] Add holistic-score ignored tests in `packages/agents/src/__tests__/seeker-scoring-holistic.test.ts`
- [ ] T025 [P] [US2] Add insufficient-evidence inconclusive flag tests in `packages/agents/src/__tests__/seeker-scoring-inconclusive.test.ts`

### Implementation for User Story 2

- [ ] T026 [US2] Implement scoring input validation in `packages/agents/src/seeker-scoring.ts`
- [ ] T027 [US2] Implement seeker rubric dimension coverage and range validation in `packages/agents/src/seeker-scoring.ts`
- [ ] T028 [US2] Implement holistic-score ignore and regression evidence mapping in `packages/agents/src/seeker-scoring.ts`
- [ ] T029 [US2] Implement inconclusive flag proposal normalization in `packages/agents/src/seeker-scoring.ts`
- [ ] T030 [US2] Implement scoring result and refusal mapping in `packages/agents/src/seeker-scoring.ts`
- [ ] T031 [US2] Export seeker scoring driver from `packages/agents/src/index.ts`

**Checkpoint**: User Stories 1 and 2 are independently functional and testable.

---

## Phase 5: User Story 3 - Seeker Privacy and Isolation Enforcement (Priority: P2)

**Goal**: Ensure the seeker advocate consumes only seeker-owned data, filtered counterparty projections, fresh run context, and contract-allowed tools.

**Independent Test**: Present disallowed employer fields, prior-run context, and unsupported tool results, then confirm they are refused, ignored, or flagged before turn/scoring output.

### Tests for User Story 3

- [ ] T032 [P] [US3] Add unfiltered counterparty data rejection tests in `packages/agents/src/__tests__/seeker-privacy-boundary.test.ts`
- [ ] T033 [P] [US3] Add prior-run context refusal tests in `packages/agents/src/__tests__/seeker-isolation.test.ts`
- [ ] T034 [P] [US3] Add unsupported-tool refusal tests in `packages/agents/src/__tests__/seeker-tools.test.ts`
- [ ] T035 [P] [US3] Add human-input pause refusal tests in `packages/agents/src/__tests__/seeker-run-to-completion.test.ts`

### Implementation for User Story 3

- [ ] T036 [US3] Implement counterparty projection trust validation in `packages/agents/src/seeker-advocate.ts`
- [ ] T037 [US3] Implement fresh-run context guard in `packages/agents/src/seeker-advocate.ts`
- [ ] T038 [US3] Implement contract-allowed tool validation in `packages/agents/src/seeker-advocate.ts`
- [ ] T039 [US3] Implement human-input pause semantic guard in `packages/agents/src/seeker-advocate.ts`
- [ ] T040 [US3] Add privacy/isolation reason-code exports in `packages/agents/src/types.ts`

**Checkpoint**: User Stories 1, 2, and 3 are independently functional and testable.

---

## Phase 6: User Story 4 - Eval-Gated Seeker Advocate Credibility (Priority: P2)

**Goal**: Provide repeatable Phase 0 credibility evidence for seeker-side advocate behavior.

**Independent Test**: Run the F13 eval suite and confirm every required case records expected outcome, actual outcome, pass/fail status, frozen refs, and reviewer-readable evidence.

### Tests for User Story 4

- [ ] T041 [P] [US4] Add eval-case schema tests in `packages/agents/src/__tests__/seeker-eval-contract.test.ts`
- [ ] T042 [P] [US4] Add strong-match and weak-match eval tests in `packages/agents/src/__tests__/seeker-eval-quality.test.ts`
- [ ] T043 [P] [US4] Add privacy-attack and prompt-injection eval tests in `packages/agents/src/__tests__/seeker-eval-safety.test.ts`
- [ ] T044 [P] [US4] Add unsupported-tool and budget-refusal eval tests in `packages/agents/src/__tests__/seeker-eval-refusals.test.ts`

### Implementation for User Story 4

- [ ] T045 [US4] Implement eval case definitions and expected outcome matching in `packages/agents/src/eval.ts`
- [ ] T046 [US4] Implement deterministic eval runner and evidence collector in `packages/agents/src/eval.ts`
- [ ] T047 [US4] Add F13 staged dev-run script in `packages/agents/scripts/f13-staged-dev-run.ts`
- [ ] T048 [US4] Add quickstart evidence writer for F13 eval results in `packages/agents/scripts/f13-staged-dev-run.ts`
- [ ] T049 [US4] Export eval runner from `packages/agents/src/index.ts`

**Checkpoint**: All user stories are independently functional and testable.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, documentation, and Spec Kit closure.

- [ ] T050 [P] Update `docs/data-governance/data-classification.yaml` with F13 transient/evidence payload classifications
- [ ] T051 [P] Add F13 runbook notes in `docs/runbooks/seeker-advocate.md`
- [ ] T052 Run `pnpm --filter @spyglass/agents test` and record result in `.specify/specs/013-seeker-advocate/quickstart-run-2026-05-21.md`
- [ ] T053 Run `pnpm --filter @spyglass/agents type-check` and record result in `.specify/specs/013-seeker-advocate/quickstart-run-2026-05-21.md`
- [ ] T054 Run `pnpm --filter @spyglass/agents lint` and record result in `.specify/specs/013-seeker-advocate/quickstart-run-2026-05-21.md`
- [ ] T055 Run `pnpm --filter @spyglass/agents build` and record result in `.specify/specs/013-seeker-advocate/quickstart-run-2026-05-21.md`
- [ ] T056 Run `pnpm --filter @spyglass/agents dev-run:f13` and record eval evidence in `.specify/specs/013-seeker-advocate/quickstart-run-2026-05-21.md`
- [ ] T057 Run `/speckit-analyze` and save findings in `.specify/specs/013-seeker-advocate/analyze-report.md`
- [ ] T058 Run `/code-review` and save findings in `.specify/specs/013-seeker-advocate/code-review-t058.md`
- [ ] T059 Run `/security-review` and save findings in `.specify/specs/013-seeker-advocate/security-review-t059.md`
- [ ] T060 Update `.specify/roadmap.md` with F13 implementation status and F14 next-step notes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: No dependencies.
- **Phase 2 Foundational**: Depends on Phase 1; blocks user story work.
- **Phase 3 US1**: Depends on Phase 2 and delivers MVP seeker turns.
- **Phase 4 US2**: Depends on Phase 2; can run after or alongside US1, but final Parley usefulness needs both US1 and US2.
- **Phase 5 US3**: Depends on Phase 2; integrates safety guards into the same driver files touched by US1/US2, so sequence carefully.
- **Phase 6 US4**: Depends on US1, US2, and US3 behavior.
- **Phase 7 Polish**: Depends on selected user stories being complete.

### User Story Dependencies

- **US1**: MVP. No dependency on other stories after foundation.
- **US2**: No dependency on US1 after foundation, but implementation should reuse shared types and fixtures.
- **US3**: Safety layer can be implemented after foundation, but touches US1 files and should be integrated before final verification.
- **US4**: Depends on US1/US2/US3 outputs and refusals.

### Parallel Opportunities

- T002-T005 can run in parallel.
- T007-T009 can run in parallel.
- US1 tests T012-T015 can run in parallel before US1 implementation.
- US2 tests T022-T025 can run in parallel before US2 implementation.
- US3 tests T032-T035 can run in parallel before US3 implementation.
- US4 tests T041-T044 can run in parallel before US4 implementation.
- T050 and T051 can run in parallel with final verification after implementation stabilizes.

## Parallel Example: User Story 1

```text
Task: "T012 [P] [US1] Add turn contract acceptance tests in packages/agents/src/__tests__/seeker-turn-contract.test.ts"
Task: "T013 [P] [US1] Add frozen-ref no-hot-reload tests in packages/agents/src/__tests__/seeker-turn-refs.test.ts"
Task: "T014 [P] [US1] Add invalid-ref refusal tests in packages/agents/src/__tests__/seeker-turn-refusal.test.ts"
Task: "T015 [P] [US1] Add fake-gateway accepted-turn integration test in packages/agents/src/__tests__/seeker-turn-invocation.test.ts"
```

## Implementation Strategy

### MVP First

1. Complete Phase 1 setup.
2. Complete Phase 2 foundation.
3. Complete Phase 3 US1 seeker turn driver.
4. Validate US1 independently with package tests before scoring or eval expansion.

### Incremental Delivery

1. Add US1 seeker turn driver.
2. Add US2 seeker scoring driver.
3. Add US3 privacy/isolation guards.
4. Add US4 eval baseline and staged evidence.
5. Run closure reviews and update roadmap.

### Review Discipline

- Write tests before implementation for each user story.
- Keep F13 seeker-only; do not implement F14 employer behavior on this branch.
- Keep all model operations behind `@spyglass/ai`.
- Preserve no-hot-reload and frozen-ref semantics in every accepted output.
