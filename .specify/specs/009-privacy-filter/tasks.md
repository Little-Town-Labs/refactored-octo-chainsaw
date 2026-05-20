# Tasks: F09 Privacy Filter

**Input**: Design documents from `.specify/specs/009-privacy-filter/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Test tasks are included because F09 is a compliance/security boundary with no-model reachability, sentinel-injection resistance, counterparty-access enforcement, and scoped evidence review.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the F09 package, schema entry points, and documentation skeleton.

- [ ] T001 Create `packages/privacy-filter/package.json`, `packages/privacy-filter/tsconfig.json`, `packages/privacy-filter/jest.config.js`, and `packages/privacy-filter/eslint.config.js`
- [ ] T002 Create `packages/privacy-filter/src/index.ts`, `packages/privacy-filter/src/types.ts`, `packages/privacy-filter/src/validation.ts`, `packages/privacy-filter/src/repo.ts`, and `packages/privacy-filter/src/scopes.ts`
- [ ] T003 Add F09 schema export placeholder in `packages/db/src/schema/privacy-filter.ts` and wire it from `packages/db/src/schema/index.ts`
- [ ] T004 [P] Add F09 runbook skeleton in `docs/runbooks/privacy-filter.md`
- [ ] T005 [P] Add F09 staged-run script skeleton in `packages/privacy-filter/scripts/f09-staged-dev-run.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish governance, storage, shared validation, and audit contracts that all stories depend on.

**CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T006 Add `privacy_ruleset_policy`, `privacy_filter_evidence`, and `privacy_boundary_evidence` classes and F09 table entries to `docs/data-governance/data-classification.yaml`
- [ ] T007 Add F09 retention entries to `docs/data-governance/retention-policy.md`
- [ ] T008 Add F09 integrity invariants for `privacy_ruleset_versions`, `privacy_filter_decisions`, `sentinel_failures`, and `counterparty_access_findings` to `docs/data-governance/integrity-invariants.md`
- [ ] T009 Implement Drizzle schema for F09 tables in `packages/db/src/schema/privacy-filter.ts`
- [ ] T010 Add migration `packages/db/migrations/0011_f09_privacy_filter.sql` and update `packages/db/migrations/meta/_journal.json`
- [ ] T011 [P] Add JSON Schema contract validation tests for F09 contract files in `packages/privacy-filter/src/__tests__/contracts.test.ts`
- [ ] T012 [P] Implement shared F09 type definitions and reason-code unions in `packages/privacy-filter/src/types.ts`
- [ ] T013 Implement shared validation helpers for canonical hashes, ruleset refs, disclosure stages, payload limits, and review-safe summaries in `packages/privacy-filter/src/validation.ts`
- [ ] T014 Implement in-memory test fixtures and repo harness in `packages/privacy-filter/src/__tests__/fixtures.ts`

**Checkpoint**: Foundation ready; user story implementation can begin.

---

## Phase 3: User Story 1 - Filter Counterparty Views Without Model Calls (Priority: P1) MVP

**Goal**: Deterministic rulesets produce counterparty-safe projections without any model gateway dependency.

**Independent Test**: Submit seeded seeker, employer, tool-returned, ATS-imported, and A2A content and verify allowed fields pass, prohibited fields redact/refuse, and no model gateway import is reachable.

### Tests for User Story 1

- [ ] T015 [P] [US1] Add immutable privacy ruleset publish/deprecate tests in `packages/privacy-filter/src/__tests__/publish.test.ts`
- [ ] T016 [P] [US1] Add deterministic redaction/refusal matrix tests in `packages/privacy-filter/src/__tests__/filter.test.ts`
- [ ] T017 [P] [US1] Add no-gateway-reachability guard and fixture tests in `packages/privacy-filter/src/__tests__/reachability.test.ts`

### Implementation for User Story 1

- [ ] T018 [US1] Implement privacy ruleset publication/deprecation logic with scoped principals in `packages/privacy-filter/src/publish.ts`
- [ ] T019 [US1] Implement privacy filter repository write/read operations in `packages/privacy-filter/src/repo.ts`
- [ ] T020 [US1] Implement deterministic redaction/refusal logic and fail-closed outcomes in `packages/privacy-filter/src/filter.ts`
- [ ] T021 [US1] Implement no-gateway-reachability guard helper in `packages/privacy-filter/src/reachability.ts`
- [ ] T022 [US1] Wire F09 reachability guard into package workflow in `packages/privacy-filter/package.json` and `packages/privacy-filter/scripts/check-reachability.ts`
- [ ] T023 [US1] Emit canonical audit evidence for ruleset publication, deprecation, and filter decisions in `packages/privacy-filter/src/publish.ts` and `packages/privacy-filter/src/filter.ts`
- [ ] T024 [US1] Export publication, filtering, reachability, and reason-code APIs from `packages/privacy-filter/src/index.ts`

**Checkpoint**: User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Wrap and Validate Untrusted Input Sentinels (Priority: P1)

**Goal**: Every untrusted free-text class is wrapped with nonce-bound sentinels and forged/mismatched boundaries fail closed.

**Independent Test**: Wrap all enumerated input classes, inject forged closing sentinels, and verify missing, duplicated, mismatched, and forged boundaries are refused.

### Tests for User Story 2

- [ ] T025 [P] [US2] Add sentinel wrapping and validation tests for all input classes in `packages/privacy-filter/src/__tests__/sentinel.test.ts`
- [ ] T026 [P] [US2] Add sentinel-injection attack tests in `packages/privacy-filter/src/__tests__/sentinel-injection.test.ts`

### Implementation for User Story 2

- [ ] T027 [US2] Implement nonce-bound sentinel wrapping and validation in `packages/privacy-filter/src/sentinel.ts`
- [ ] T028 [US2] Persist review-safe sentinel failure evidence in `packages/privacy-filter/src/repo.ts`
- [ ] T029 [US2] Emit canonical audit evidence for sentinel failures in `packages/privacy-filter/src/sentinel.ts`
- [ ] T030 [US2] Export sentinel envelope APIs from `packages/privacy-filter/src/index.ts`

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Enforce Counterparty Access Boundaries (Priority: P1)

**Goal**: Side runners can reach counterparty content only through filtered projections or F08.5 `counterparty_filtered` tool outputs.

**Independent Test**: Direct counterparty access fixtures fail the guard while sanctioned privacy-filter and F08.5 port paths pass.

### Tests for User Story 3

- [ ] T031 [P] [US3] Add F08.5 `counterparty_filtered` privacy-filter port tests in `packages/privacy-filter/src/__tests__/tool-port.test.ts`
- [ ] T032 [P] [US3] Add counterparty-access bypass fixture and expected failure tests in `packages/privacy-filter/src/__tests__/access-boundary.test.ts`

### Implementation for User Story 3

- [ ] T033 [US3] Implement F08.5-compatible privacy-filter port in `packages/privacy-filter/src/tool-port.ts`
- [ ] T034 [US3] Implement counterparty-access boundary guard helper in `packages/privacy-filter/src/access-boundary.ts`
- [ ] T035 [US3] Wire F09 access-boundary guard into package workflow in `packages/privacy-filter/package.json` and `packages/privacy-filter/scripts/check-access-boundary.ts`
- [ ] T036 [US3] Persist and audit counterparty-access bypass findings in `packages/privacy-filter/src/repo.ts` and `packages/privacy-filter/src/access-boundary.ts`
- [ ] T037 [US3] Export privacy-filter port and access-boundary APIs from `packages/privacy-filter/src/index.ts`

**Checkpoint**: User Stories 1, 2, and 3 are independently functional.

---

## Phase 6: User Story 4 - Review Ruleset, Projection, and Refusal Evidence (Priority: P2)

**Goal**: Scoped reviewers can reconstruct rulesets, filtered projections, sentinel failures, and boundary findings without raw sensitive payload exposure by default.

**Independent Test**: Scoped reads return bounded metadata and unscoped reads are denied by default.

### Tests for User Story 4

- [ ] T038 [P] [US4] Add scoped ruleset, decision, sentinel failure, and boundary finding review tests in `packages/privacy-filter/src/__tests__/review.test.ts`
- [ ] T039 [P] [US4] Add unscoped access denial and raw payload exclusion tests in `packages/privacy-filter/src/__tests__/review-auth.test.ts`

### Implementation for User Story 4

- [ ] T040 [US4] Implement scoped review reads for rulesets, decisions, sentinel failures, and boundary findings in `packages/privacy-filter/src/review.ts`
- [ ] T041 [US4] Add review scopes and descriptions in `packages/privacy-filter/src/scopes.ts`
- [ ] T042 [US4] Export review APIs from `packages/privacy-filter/src/index.ts`

**Checkpoint**: All user stories are independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verification, documentation, and required closure reviews.

- [ ] T043 [P] Update `docs/runbooks/privacy-filter.md` with ruleset publication, sentinel handling, filtering, F08.5 port handling, bypass guard, review, and rollback procedures
- [ ] T044 Implement staged quickstart run in `packages/privacy-filter/scripts/f09-staged-dev-run.ts`
- [ ] T045 Run and record quickstart evidence in `.specify/specs/009-privacy-filter/quickstart-run-2026-05-20.md`
- [ ] T046 Run `/speckit-analyze` and record findings in `.specify/specs/009-privacy-filter/analyze-report.md`
- [ ] T047 Run `/code-review` and record findings in `.specify/specs/009-privacy-filter/code-review-t047.md`
- [ ] T048 Run `/security-review` and record findings in `.specify/specs/009-privacy-filter/security-review-t048.md`
- [ ] T049 Run final verification: `pnpm --filter @spyglass/privacy-filter test`, `pnpm --filter @spyglass/privacy-filter type-check`, `pnpm --filter @spyglass/privacy-filter lint`, `pnpm --filter @spyglass/privacy-filter build`, `pnpm --filter @spyglass/privacy-filter dev-run:f09`, `pnpm --filter @spyglass/privacy-filter reachability:check`, `pnpm --filter @spyglass/privacy-filter boundary:check`, `pnpm --filter @spyglass/db build`, and `pnpm schema:lint`
- [ ] T050 Update `.specify/roadmap.md` Stage 4 notes after F09 implementation evidence is complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user stories.
- **US1 (Phase 3)**: Depends on Foundational; MVP for deterministic filtering and no-model reachability.
- **US2 (Phase 4)**: Depends on Foundational and can be verified independently after shared validation is present.
- **US3 (Phase 5)**: Depends on US1 filtering and F08.5 port availability.
- **US4 (Phase 6)**: Requires records from US1, US2, and US3.
- **Polish (Phase 7)**: Depends on all selected user stories.

### User Story Dependencies

- **User Story 1 (P1)**: Start after Foundational; no dependency on other stories.
- **User Story 2 (P1)**: Start after Foundational; complements US1 but has independent tests.
- **User Story 3 (P1)**: Requires US1 filter outputs and F08.5 disclosure routing port.
- **User Story 4 (P2)**: Requires event records from US1, US2, and US3.

### Parallel Opportunities

- T004 and T005 can run alongside package skeleton work.
- T011, T012, and T014 can run after contract schemas are stable.
- US1 tests T015, T016, and T017 can be written in parallel.
- US2 tests T025 and T026 can be written in parallel.
- US3 tests T031 and T032 can be written in parallel.
- US4 tests T038 and T039 can be written in parallel.

---

## Parallel Example: User Story 1

```text
Task: "Add immutable privacy ruleset publish/deprecate tests in packages/privacy-filter/src/__tests__/publish.test.ts"
Task: "Add deterministic redaction/refusal matrix tests in packages/privacy-filter/src/__tests__/filter.test.ts"
Task: "Add no-gateway-reachability guard and fixture tests in packages/privacy-filter/src/__tests__/reachability.test.ts"
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete User Story 1 to establish immutable rulesets, deterministic filtering, and no-model reachability.
3. Validate US1 independently with `publish.test.ts`, `filter.test.ts`, and `reachability.test.ts`.
4. Complete User Story 2 before prompt construction or runner integration.

### Compliance Gate Completion

1. Complete counterparty access enforcement in User Story 3 before exposing side-runner paths to F08.
2. Complete scoped review reads in User Story 4.
3. Run quickstart, analyze, code review, security review, and final gates.
