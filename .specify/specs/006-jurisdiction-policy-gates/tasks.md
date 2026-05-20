# Tasks: F06 Jurisdiction Policy Gates

**Input**: Design documents from `.specify/specs/006-jurisdiction-policy-gates/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: F06 is compliance/security-critical. Follow test-first execution for evaluator, authorization, mutation, contract, and integration behavior.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently after the shared foundation lands.

## Phase 1: Setup

**Purpose**: Establish the package, contracts, and governance surfaces that all F06 stories use.

- [X] T001 Add `@spyglass/policy-gates` package skeleton with `package.json`, `tsconfig.json`, `jest.config.js`, `eslint.config.js`, and `src/index.ts`
- [X] T002 [P] Add contract schema validation tests for `.specify/specs/006-jurisdiction-policy-gates/contracts/*.schema.yaml` in `packages/policy-gates/src/__tests__/contracts.test.ts`
- [X] T003 [P] Register F06 data classes in `docs/data-governance/data-classification.yaml`
- [X] T004 [P] Add F06 retention policy entries in `docs/data-governance/retention-policy.md`
- [X] T005 [P] Add F06 invariant catalog entries in `docs/data-governance/integrity-invariants.md`

---

## Phase 2: Foundational Schema And Shared Types

**Purpose**: Create the DB schema, migrations, shared enums, and repository contracts that block every user story.

**CRITICAL**: No user-story implementation starts until this phase is complete.

- [X] T006 Add `jurisdiction_policies`, `jurisdiction_gate_decisions`, and `jurisdiction_kill_switch_events` schema in `packages/db/src/schema/jurisdiction-policy.ts`
- [X] T007 Export F06 schema from `packages/db/src/schema/index.ts`
- [X] T008 Add migration `packages/db/migrations/0007_f06_jurisdiction_policy_gates.sql` and journal entry in `packages/db/migrations/meta/_journal.json`
- [X] T009 Add F06 shared enums and type exports in `packages/policy-gates/src/types.ts`
- [X] T010 Add repository interfaces and Drizzle adapter skeleton in `packages/policy-gates/src/repo.ts`
- [X] T011 Verify foundational schema with `pnpm schema:lint`

---

## Phase 3: User Story 1 - Gate A Ticket Or Match By Jurisdiction (Priority: P1)

**Goal**: Return explicit allow/deny decisions for supported, unsupported, disabled, missing, and unknown jurisdictions before workflows proceed.

**Independent Test**: Submit supported, unsupported, disabled, missing, and unknown jurisdiction cases; verify each returns a structured decision and audit evidence.

### Tests for User Story 1

- [X] T012 [P] [US1] Add RED evaluator tests for allow, missing, unknown, unsupported, disabled, and multi-jurisdiction deny cases in `packages/policy-gates/src/__tests__/evaluator.test.ts`
- [X] T013 [P] [US1] Add RED audit-linkage tests for gate decisions in `packages/policy-gates/src/__tests__/decision-audit.test.ts`
- [X] T014 [P] [US1] Add RED `gate-decision.schema.yaml` fixture validation tests in `packages/policy-gates/src/__tests__/contracts.test.ts`

### Implementation for User Story 1

- [X] T015 [US1] Implement deterministic fail-safe evaluator in `packages/policy-gates/src/evaluator.ts`
- [X] T016 [US1] Implement gate decision persistence and canonical audit append in `packages/policy-gates/src/repo.ts`
- [X] T017 [US1] Add F04 ticket/match jurisdiction input adapters in `packages/policy-gates/src/ticket-inputs.ts`
- [X] T018 [US1] Export evaluator, decision types, and adapters from `packages/policy-gates/src/index.ts`
- [X] T019 [US1] Run `pnpm --filter @spyglass/policy-gates test -- evaluator.test.ts decision-audit.test.ts contracts.test.ts`

---

## Phase 4: User Story 2 - Flip Geographic Kill Switches Without Deploy (Priority: P1)

**Goal**: Allow scoped operators to disable or re-enable jurisdictions without deployment while preserving audit evidence.

**Independent Test**: Change a jurisdiction status through the mutation path and verify new decisions immediately reflect the new posture.

### Tests for User Story 2

- [X] T020 [P] [US2] Add RED kill-switch authorization and mutation tests in `packages/policy-gates/src/__tests__/kill-switch.test.ts`
- [X] T021 [P] [US2] Add RED `kill-switch-event.schema.yaml` fixture validation tests in `packages/policy-gates/src/__tests__/contracts.test.ts`

### Implementation for User Story 2

- [X] T022 [US2] Declare F06 scopes `policy.read`, `policy.decide`, and `policy.kill_switch.manage` in `packages/policy-gates/src/scopes.ts`
- [X] T023 [US2] Implement scoped kill-switch mutation path in `packages/policy-gates/src/kill-switch.ts`
- [X] T024 [US2] Persist immutable kill-switch event rows and canonical audit events in `packages/policy-gates/src/repo.ts`
- [X] T025 [US2] Add immediate-posture read behavior for new decisions after switch changes in `packages/policy-gates/src/evaluator.ts`
- [X] T026 [US2] Run `pnpm --filter @spyglass/policy-gates test -- kill-switch.test.ts evaluator.test.ts`

---

## Phase 5: User Story 3 - Produce Structured Failure Evidence (Priority: P2)

**Goal**: Convert denied gate decisions into stable, non-PII failure artifacts for downstream dossier and evidence flows.

**Independent Test**: Trigger every supported denial reason and verify failure artifacts have stable fields and audit links.

### Tests for User Story 3

- [X] T027 [P] [US3] Add RED failure artifact tests for missing, unknown, unsupported, disabled, review-required, expired, conflicting, and unauthorized reasons in `packages/policy-gates/src/__tests__/failure-artifact.test.ts`
- [X] T028 [P] [US3] Add RED `failure-artifact.schema.yaml` fixture validation tests in `packages/policy-gates/src/__tests__/contracts.test.ts`

### Implementation for User Story 3

- [X] T029 [US3] Implement failure artifact projection in `packages/policy-gates/src/failure-artifact.ts`
- [X] T030 [US3] Ensure failure artifacts exclude raw personal data and expose only subject references in `packages/policy-gates/src/failure-artifact.ts`
- [X] T031 [US3] Export failure artifact helpers from `packages/policy-gates/src/index.ts`
- [X] T032 [US3] Run `pnpm --filter @spyglass/policy-gates test -- failure-artifact.test.ts contracts.test.ts`

---

## Phase 6: User Story 4 - Review Policy Posture And Decision History (Priority: P2)

**Goal**: Provide scoped posture and bounded decision-history reads for compliance and counsel review.

**Independent Test**: Query active posture and bounded decision history as scoped and unscoped principals; verify deny-by-default and allowed evidence fields.

### Tests for User Story 4

- [X] T033 [P] [US4] Add RED scoped review-read tests in `packages/policy-gates/src/__tests__/review.test.ts`
- [X] T034 [P] [US4] Add RED bounded pagination/date-filter tests for decision history in `packages/policy-gates/src/__tests__/review.test.ts`

### Implementation for User Story 4

- [X] T035 [US4] Implement active posture read API in `packages/policy-gates/src/review.ts`
- [X] T036 [US4] Implement bounded decision-history read API in `packages/policy-gates/src/review.ts`
- [X] T037 [US4] Wire Drizzle read queries and scope checks in `packages/policy-gates/src/repo.ts`
- [X] T038 [US4] Run `pnpm --filter @spyglass/policy-gates test -- review.test.ts`

---

## Phase 7: Integration, Quickstart, Reviews, And Closure

**Purpose**: Prove F06 works end to end and leave durable operator/developer guidance.

- [X] T039 Add staged quickstart runner `packages/policy-gates/scripts/f06-staged-dev-run.ts`
- [X] T040 Add `dev-run:f06` package script in `packages/policy-gates/package.json`
- [X] T041 Add operator runbook `docs/runbooks/jurisdiction-policy-gates.md`
- [X] T042 Execute F06 quickstart scenarios and save `.specify/specs/006-jurisdiction-policy-gates/quickstart-run-2026-05-19.md`
- [X] T043 Run `/speckit-analyze` and resolve all CRITICAL/HIGH findings
- [X] T044 Run `/code-review` and mandatory `/security-review`; resolve all CRITICAL/HIGH findings
- [X] T045 Run final verification: `pnpm --filter @spyglass/policy-gates test`, `type-check`, `lint`, `pnpm schema:lint`, and `pnpm --filter @spyglass/policy-gates dev-run:f06`
- [X] T046 Update `.specify/roadmap.md` and add F06 downstream handoff notes in `.specify/notes/f06-handoffs.md`

---

## Dependencies & Execution Order

```text
Phase 1 -> Phase 2
Phase 2 -> US1
Phase 2 + US1 -> US2
US1 -> US3
US1 + US2 -> US4
US1 + US2 + US3 + US4 -> Phase 7
```

## Parallel Opportunities

- T002, T003, T004, T005 can run in parallel.
- T012, T013, T014 can run in parallel after foundational schema lands.
- T020 and T021 can run in parallel.
- T027 and T028 can run in parallel.
- T033 and T034 can run in parallel.
- Documentation tasks T041 and T046 can proceed while final verification is being prepared, after behavior is stable.

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete US1: deterministic gate decisions and audit evidence.
3. Validate US1 independently with evaluator and audit-linkage tests.

### Incremental Delivery

1. Add US2 kill switches so posture can change without deploy.
2. Add US3 failure artifacts for downstream dossier/failure flows.
3. Add US4 scoped review reads.
4. Finish with staged quickstart, reviews, and roadmap/handoff updates.

## Summary

- **Total tasks:** 46
- **US1 tasks:** 8
- **US2 tasks:** 7
- **US3 tasks:** 6
- **US4 tasks:** 6
- **Final integration/review tasks:** 8
- **Suggested MVP scope:** Phase 1 + Phase 2 + US1
