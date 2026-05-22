# Tasks: F14 Employer Advocate Agent

**Input**: Design documents from `.specify/specs/014-employer-advocate/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [threat-model.md](threat-model.md), [quickstart.md](quickstart.md), [contracts/](contracts/)

**Tests**: Required. F14 includes contract tests, unit tests, eval baseline tests, import-boundary tests, and a staged dev-run.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Phase 1: Setup

**Purpose**: Prepare the existing `@spyglass/agents` package for F14 employer-side implementation.

- [x] T001 Update `packages/agents/package.json` with `dev-run:f14` script while preserving existing F13 scripts
- [x] T002 [P] Update `packages/agents/README.md` with F14 employer advocate scope, F13 symmetry, and F15/F22/F23 boundaries
- [x] T003 [P] Add F14 contract schema validation coverage in `packages/agents/src/__tests__/contracts.test.ts`
- [x] T004 [P] Add F14 contract schema fixture paths in `packages/agents/src/__tests__/contracts.test.ts`
- [x] T005 [P] Verify existing package lint/test/build configuration covers new F14 files in `packages/agents/eslint.config.js`

---

## Phase 2: Foundational

**Purpose**: Shared employer types, reason codes, fixtures, and safety boundaries required before user stories.

**Critical**: No user story work can begin until this phase is complete.

- [x] T006 Define employer advocate refs, runtime refs, principal view, result unions, and reason-code types in `packages/agents/src/types.ts`
- [x] T007 [P] Add deterministic F14 fixtures for employer contracts, rubrics, manifests, contexts, turns, scores, refusals, and eval cases in `packages/agents/src/fixtures.ts`
- [x] T008 [P] Add employer prompt/model/manifest fixture variants for F14 no-hot-reload tests in `packages/agents/src/fixtures.ts`
- [x] T009 [P] Extend direct-provider import boundary tests for F14 files in `packages/agents/src/__tests__/import-boundary.test.ts`
- [x] T010 Add public exports for F14 types and utilities in `packages/agents/src/index.ts`
- [x] T011 Add JSON Schema contract tests for F14 schemas in `packages/agents/src/__tests__/contracts.test.ts`
- [x] T012 Add employer-specific fake gateway runtime fixture in `packages/agents/src/fixtures.ts`

**Checkpoint**: Foundation ready. User story implementation can start.

---

## Phase 3: User Story 1 - Employer-Side Negotiation Turn (Priority: P1) MVP

**Goal**: Produce a structured employer-side negotiation turn from frozen refs, employer principal view, filtered seeker projection, and run context.

**Independent Test**: Provide a valid employer-side run input and confirm the driver returns a structured turn result or bounded refusal without mutating frozen refs.

### Tests for User Story 1

- [x] T013 [P] [US1] Add employer turn contract acceptance tests in `packages/agents/src/__tests__/employer-turn-contract.test.ts`
- [x] T014 [P] [US1] Add employer frozen-ref no-hot-reload tests in `packages/agents/src/__tests__/employer-turn-refs.test.ts`
- [x] T015 [P] [US1] Add employer invalid-ref refusal tests in `packages/agents/src/__tests__/employer-turn-refusal.test.ts`
- [x] T016 [P] [US1] Add fake-gateway accepted-turn integration test in `packages/agents/src/__tests__/employer-turn-invocation.test.ts`

### Implementation for User Story 1

- [x] T017 [US1] Implement employer turn input validation in `packages/agents/src/employer-advocate.ts`
- [x] T018 [US1] Implement frozen prompt/model/manifest/contract/rubric/privacy/tool ref validation in `packages/agents/src/employer-advocate.ts`
- [x] T019 [US1] Implement F12 invocation request assembly for employer turns in `packages/agents/src/employer-advocate.ts`
- [x] T020 [US1] Implement accepted employer turn result mapping with invocation and audit refs in `packages/agents/src/employer-advocate.ts`
- [x] T021 [US1] Implement bounded turn refusal mapping and stable reason codes in `packages/agents/src/employer-advocate.ts`
- [x] T022 [US1] Export employer turn driver from `packages/agents/src/index.ts`

**Checkpoint**: User Story 1 is independently functional and testable.

---

## Phase 4: User Story 2 - Employer-Side Rubric Scoring (Priority: P1)

**Goal**: Produce validated per-dimension employer-side scores and rationales that the harness can aggregate deterministically.

**Independent Test**: Request final employer-side scoring with a resolved employer rubric and confirm every dimension is represented exactly once or an auditable validation/inconclusive path is returned.

### Tests for User Story 2

- [x] T023 [P] [US2] Add employer scoring contract acceptance tests in `packages/agents/src/__tests__/employer-scoring-contract.test.ts`
- [x] T024 [P] [US2] Add employer rubric dimension coverage tests in `packages/agents/src/__tests__/employer-scoring-validation.test.ts`
- [x] T025 [P] [US2] Add holistic-score and decision-content rejection tests in `packages/agents/src/__tests__/employer-scoring-decision-content.test.ts`
- [x] T026 [P] [US2] Add insufficient-evidence inconclusive flag tests in `packages/agents/src/__tests__/employer-scoring-inconclusive.test.ts`
- [x] T027 [P] [US2] Add rubric bias-gate refusal tests in `packages/agents/src/__tests__/employer-scoring-bias-gate.test.ts`

### Implementation for User Story 2

- [x] T028 [US2] Implement employer scoring input validation in `packages/agents/src/employer-scoring.ts`
- [x] T029 [US2] Implement employer rubric dimension coverage, range, and regulated-surface validation in `packages/agents/src/employer-scoring.ts`
- [x] T030 [US2] Implement holistic-score ignore and decision-content rejection mapping in `packages/agents/src/employer-scoring.ts`
- [x] T031 [US2] Implement rubric bias-gate evidence checks in `packages/agents/src/employer-scoring.ts`
- [x] T032 [US2] Implement inconclusive flag proposal normalization in `packages/agents/src/employer-scoring.ts`
- [x] T033 [US2] Implement employer scoring result and refusal mapping in `packages/agents/src/employer-scoring.ts`
- [x] T034 [US2] Export employer scoring driver from `packages/agents/src/index.ts`

**Checkpoint**: User Stories 1 and 2 are independently functional and testable.

---

## Phase 5: User Story 3 - Employer Confidentiality and Seeker Privacy Enforcement (Priority: P2)

**Goal**: Ensure the employer advocate consumes only employer-owned data, filtered seeker projections, fresh run context, and contract-allowed tools.

**Independent Test**: Present raw seeker data, prior-run context, employer data outside the principal view, and unsupported tool results, then confirm they are refused, ignored, or flagged before turn/scoring output.

### Tests for User Story 3

- [x] T035 [P] [US3] Add unfiltered seeker data rejection tests in `packages/agents/src/__tests__/employer-privacy-boundary.test.ts`
- [x] T036 [P] [US3] Add protected-class boundary refusal tests in `packages/agents/src/__tests__/employer-protected-class-boundary.test.ts`
- [x] T037 [P] [US3] Add prior-run context refusal tests in `packages/agents/src/__tests__/employer-isolation.test.ts`
- [x] T038 [P] [US3] Add unsupported-tool refusal tests in `packages/agents/src/__tests__/employer-tools.test.ts`
- [x] T039 [P] [US3] Add human-input pause refusal tests in `packages/agents/src/__tests__/employer-run-to-completion.test.ts`

### Implementation for User Story 3

- [x] T040 [US3] Implement filtered seeker projection trust validation in `packages/agents/src/employer-advocate.ts`
- [x] T041 [US3] Implement protected-class and raw seeker field guards in `packages/agents/src/employer-advocate.ts`
- [x] T042 [US3] Implement fresh-run context guard in `packages/agents/src/employer-advocate.ts`
- [x] T043 [US3] Implement contract-allowed tool validation in `packages/agents/src/employer-advocate.ts`
- [x] T044 [US3] Implement human-input pause semantic guard in `packages/agents/src/employer-advocate.ts`
- [x] T045 [US3] Add privacy/isolation/protected-class reason-code exports in `packages/agents/src/types.ts`

**Checkpoint**: User Stories 1, 2, and 3 are independently functional and testable.

---

## Phase 6: User Story 4 - Eval-Gated Employer Advocate Credibility (Priority: P2)

**Goal**: Provide repeatable Phase 0 credibility evidence for employer-side advocate behavior.

**Independent Test**: Run the F14 eval suite and confirm every required case records expected outcome, actual outcome, pass/fail status, regulated-surface expectation, frozen refs, and reviewer-readable evidence.

### Tests for User Story 4

- [x] T046 [P] [US4] Add employer eval-case schema tests in `packages/agents/src/__tests__/employer-eval-contract.test.ts`
- [x] T047 [P] [US4] Add strong-match and weak-match eval tests in `packages/agents/src/__tests__/employer-eval-quality.test.ts`
- [x] T048 [P] [US4] Add privacy-attack, prompt-injection, and protected-class eval tests in `packages/agents/src/__tests__/employer-eval-safety.test.ts`
- [x] T049 [P] [US4] Add unsupported-tool, rubric-bias-gate, and budget-refusal eval tests in `packages/agents/src/__tests__/employer-eval-refusals.test.ts`

### Implementation for User Story 4

- [x] T050 [US4] Implement employer eval scenario types and expected outcome matching in `packages/agents/src/eval.ts`
- [x] T051 [US4] Implement employer eval baseline assertion for all required F14 categories in `packages/agents/src/eval.ts`
- [x] T052 [US4] Implement deterministic employer eval runner and evidence collector in `packages/agents/src/eval.ts`
- [x] T053 [US4] Add F14 staged dev-run script in `packages/agents/scripts/f14-staged-dev-run.ts`
- [x] T054 [US4] Add quickstart evidence writer for F14 eval results in `packages/agents/scripts/f14-staged-dev-run.ts`
- [x] T055 [US4] Export employer eval runner from `packages/agents/src/index.ts`

**Checkpoint**: All user stories are independently functional and testable.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, documentation, and Spec Kit closure.

- [x] T056 [P] Update `docs/data-governance/data-classification.yaml` with F14 transient/evidence payload classifications
- [x] T057 [P] Add F14 runbook notes in `docs/runbooks/employer-advocate.md`
- [x] T058 [P] Add F14 threat-model implementation notes to `.specify/specs/014-employer-advocate/threat-model.md`
- [x] T059 Run `pnpm --filter @spyglass/agents test` and record result in `.specify/specs/014-employer-advocate/quickstart-run-2026-05-22.md`
- [x] T060 Run `pnpm --filter @spyglass/agents type-check` and record result in `.specify/specs/014-employer-advocate/quickstart-run-2026-05-22.md`
- [x] T061 Run `pnpm --filter @spyglass/agents lint` and record result in `.specify/specs/014-employer-advocate/quickstart-run-2026-05-22.md`
- [x] T062 Run `pnpm --filter @spyglass/agents build` and record result in `.specify/specs/014-employer-advocate/quickstart-run-2026-05-22.md`
- [x] T063 Run `pnpm --filter @spyglass/agents dev-run:f14` and record eval evidence in `.specify/specs/014-employer-advocate/quickstart-run-2026-05-22.md`
- [x] T064 Run `/speckit-analyze` and save findings in `.specify/specs/014-employer-advocate/analyze-report.md`
- [x] T065 Run `/code-review` and save findings in `.specify/specs/014-employer-advocate/code-review-t065.md`
- [x] T066 Run `/security-review` and save findings in `.specify/specs/014-employer-advocate/security-review-t066.md`
- [x] T067 Update `.specify/roadmap.md` with F14 implementation status and F15 next-step notes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: No dependencies.
- **Phase 2 Foundational**: Depends on Phase 1; blocks user story work.
- **Phase 3 US1**: Depends on Phase 2 and delivers MVP employer turns.
- **Phase 4 US2**: Depends on Phase 2; can run after or alongside US1, but final Parley usefulness needs both US1 and US2.
- **Phase 5 US3**: Depends on Phase 2; integrates safety guards into the same driver files touched by US1/US2, so sequence carefully.
- **Phase 6 US4**: Depends on US1, US2, and US3 behavior.
- **Phase 7 Polish**: Depends on selected user stories being complete.

### User Story Dependencies

- **US1**: MVP. No dependency on other stories after foundation.
- **US2**: No dependency on US1 after foundation, but implementation should reuse shared types and fixtures.
- **US3**: Safety layer can be implemented after foundation, but touches US1/US2 files and should be integrated before final verification.
- **US4**: Depends on US1/US2/US3 outputs and refusals.

### Parallel Opportunities

- T002-T005 can run in parallel.
- T007-T009 can run in parallel.
- US1 tests T013-T016 can run in parallel before US1 implementation.
- US2 tests T023-T027 can run in parallel before US2 implementation.
- US3 tests T035-T039 can run in parallel before US3 implementation.
- US4 tests T046-T049 can run in parallel before US4 implementation.
- T056-T058 can run in parallel with final verification after implementation stabilizes.

## Parallel Example: User Story 1

```text
Task: "T013 [P] [US1] Add employer turn contract acceptance tests in packages/agents/src/__tests__/employer-turn-contract.test.ts"
Task: "T014 [P] [US1] Add employer frozen-ref no-hot-reload tests in packages/agents/src/__tests__/employer-turn-refs.test.ts"
Task: "T015 [P] [US1] Add employer invalid-ref refusal tests in packages/agents/src/__tests__/employer-turn-refusal.test.ts"
Task: "T016 [P] [US1] Add fake-gateway accepted-turn integration test in packages/agents/src/__tests__/employer-turn-invocation.test.ts"
```

## Implementation Strategy

### MVP First

1. Complete Phase 1 setup.
2. Complete Phase 2 foundation.
3. Complete Phase 3 US1 employer turn driver.
4. Validate US1 independently with package tests before scoring or eval expansion.

### Incremental Delivery

1. Add US1 employer turn driver.
2. Add US2 employer scoring driver.
3. Add US3 confidentiality/privacy/isolation guards.
4. Add US4 eval baseline and staged evidence.
5. Run closure reviews and update roadmap.

### Review Discipline

- Write tests before implementation for each user story.
- Keep F14 employer-only; do not alter F13 seeker behavior except shared type/export additions needed for symmetry.
- Keep all model operations behind `@spyglass/ai`.
- Preserve no-hot-reload and frozen-ref semantics in every accepted output.
- Treat employer-side rubric output as regulated scoring evidence, not a hiring decision.
