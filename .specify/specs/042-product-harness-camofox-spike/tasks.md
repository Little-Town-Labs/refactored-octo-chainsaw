# Tasks: PTH17 Camofox Browser Evaluation Spike

**Input**: Design documents from `.specify/specs/042-product-harness-camofox-spike/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Documentation/evaluation feature; validation is formatting, exact coverage, no dependency changes, and Spec Kit analyze.

**Organization**: Tasks are grouped by user story to enable independent review.

## Phase 1: Setup

**Purpose**: Create Spec Kit artifacts and align active feature pointers.

- [x] T001 Create `.specify/specs/042-product-harness-camofox-spike/` artifact set
- [x] T002 Update `.specify/feature.json` to point at `.specify/specs/042-product-harness-camofox-spike`
- [x] T003 Update `AGENTS.md` to reference `.specify/specs/042-product-harness-camofox-spike/plan.md`

---

## Phase 2: Foundational

**Purpose**: Establish spike placement and roadmap state.

- [x] T004 Update `docs/testing/product-harness/roadmap.md` to mark PTH17 active
- [x] T005 Add `docs/testing/product-harness/camofox-evaluation.md`

---

## Phase 3: User Story 1 - Decide Whether Camofox Fits Spyglass Harness Needs (Priority: P1)

**Goal**: Produce a clear build/defer/reject recommendation.

**Independent Test**: A reviewer can identify the recommendation and trigger conditions without installing Camofox.

- [x] T006 [US1] Document recommendation and non-goals in `docs/testing/product-harness/camofox-evaluation.md`
- [x] T007 [US1] Document current harness baseline and `BrowserJourneyDriver` fit in `docs/testing/product-harness/camofox-evaluation.md`
- [x] T008 [US1] Document future adapter trigger conditions in `docs/testing/product-harness/camofox-evaluation.md`

---

## Phase 4: User Story 2 - Compare Camofox With Browserbase and Stock Playwright (Priority: P2)

**Goal**: Compare browser options across the required decision criteria.

**Independent Test**: The comparison matrix includes all required options and criteria.

- [x] T009 [US2] Document upstream Camofox/Camoufox notes and sources in `docs/testing/product-harness/camofox-evaluation.md`
- [x] T010 [US2] Add comparison matrix in `docs/testing/product-harness/camofox-evaluation.md`
- [x] T011 [US2] Document maintenance, security, and CI determinism risks in `docs/testing/product-harness/camofox-evaluation.md`

---

## Phase 5: User Story 3 - Define A Future Adapter Plan Without Implementing It (Priority: P3)

**Goal**: Define future adapter boundaries and validation criteria.

**Independent Test**: A future implementer can identify files/contracts, tests, config, artifacts, and constraints.

- [x] T012 [US3] Document future adapter boundary in `docs/testing/product-harness/camofox-evaluation.md`
- [x] T013 [US3] Document future adapter validation plan in `docs/testing/product-harness/camofox-evaluation.md`

---

## Phase 6: Polish and Validation

**Purpose**: Validate docs, scope, and consistency.

- [x] T014 Run `pnpm format:check`
- [x] T015 Verify no dependency changes in `package.json`, `pnpm-lock.yaml`, or `packages/product-test-harness/package.json`
- [x] T016 Run Spec Kit analyze and record findings in `.specify/specs/042-product-harness-camofox-spike/analyze-report.md`
- [x] T017 Final review for optional/non-blocking wording and first-party-only scope

## Dependencies & Execution Order

- Phase 1 before all other phases.
- Phase 2 before user-story implementation.
- US1 before US2 and US3 because it sets the recommendation frame.
- US2 and US3 may proceed in parallel after US1.
- Polish after all user stories.

## Implementation Strategy

Deliver the evaluation document as the MVP, then validate that it contains a clear recommendation, complete comparison, future adapter boundary, and no dependency changes.
