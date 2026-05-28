# Tasks: PTH16 Alpha Harness Operations Runbook

**Input**: Design documents from `.specify/specs/041-product-harness-operations-runbook/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Documentation feature; validation is formatting, exact-string coverage, and review against the contract.

**Organization**: Tasks are grouped by user story to enable independent implementation and review.

## Phase 1: Setup

**Purpose**: Create Spec Kit artifacts and align active feature pointers.

- [x] T001 Create `.specify/specs/041-product-harness-operations-runbook/` artifact set
- [x] T002 Update `.specify/feature.json` to point at `.specify/specs/041-product-harness-operations-runbook`
- [x] T003 Update `AGENTS.md` to reference `.specify/specs/041-product-harness-operations-runbook/plan.md`

---

## Phase 2: Foundational

**Purpose**: Establish runbook placement and roadmap state before story work.

- [x] T004 Update `docs/testing/product-harness/roadmap.md` to mark PTH16 active
- [x] T005 Add `docs/runbooks/product-harness-alpha-operations.md`
- [x] T006 Update `docs/runbooks/README.md` to index the new runbook

---

## Phase 3: User Story 1 - Configure Alpha Harness Operations (Priority: P1)

**Goal**: Operators can configure Neon, Browserbase, canary URLs, and artifact storage from one document.

**Independent Test**: Verify the runbook contains every required PTH14 env name and describes dry-run versus preview/prod mode.

- [x] T007 [US1] Document configuration matrix in `docs/runbooks/product-harness-alpha-operations.md`
- [x] T008 [US1] Document Neon `test_harness` setup in `docs/runbooks/product-harness-alpha-operations.md`
- [x] T009 [US1] Document Browserbase setup in `docs/runbooks/product-harness-alpha-operations.md`
- [x] T010 [US1] Document canary target and artifact storage setup in `docs/runbooks/product-harness-alpha-operations.md`

---

## Phase 4: User Story 2 - Operate Canaries and Interpret Reports (Priority: P2)

**Goal**: Reviewers can run the right command/workflow and interpret product harness reports.

**Independent Test**: Verify the runbook lists command/workflow names and describes suite status, artifacts, observability, and eval trends.

- [x] T011 [US2] Document product harness commands and workflows in `docs/runbooks/product-harness-alpha-operations.md`
- [x] T012 [US2] Document report interpretation in `docs/runbooks/product-harness-alpha-operations.md`
- [x] T013 [US2] Document eval trend and cost monitoring guidance in `docs/runbooks/product-harness-alpha-operations.md`

---

## Phase 5: User Story 3 - Respond to Operational Failures (Priority: P3)

**Goal**: Operators can classify and respond to common harness failures.

**Independent Test**: Verify every major failure class has a first check, evidence, and escalation path.

- [x] T014 [US3] Add operational response matrix in `docs/runbooks/product-harness-alpha-operations.md`
- [x] T015 [US3] Add escalation and closure checklist in `docs/runbooks/product-harness-alpha-operations.md`

---

## Phase 6: Polish and Validation

**Purpose**: Validate docs, contracts, and roadmap consistency.

- [x] T016 Run required-string coverage check for `docs/runbooks/product-harness-alpha-operations.md`
- [x] T017 Run `pnpm format:check`
- [x] T018 Run Spec Kit analyze and record findings in `.specify/specs/041-product-harness-operations-runbook/analyze-report.md`
- [x] T019 Final review for no raw secrets or production URLs in docs

## Dependencies & Execution Order

- Phase 1 before all other phases.
- Phase 2 before user-story implementation.
- US1 before US2 and US3 because setup terms are reused by operations and response guidance.
- US2 and US3 may proceed in parallel after US1.
- Polish after all user stories.

## Implementation Strategy

Deliver the runbook as the MVP, then verify exact env coverage, report interpretation, response guidance, roadmap status, and formatting.
