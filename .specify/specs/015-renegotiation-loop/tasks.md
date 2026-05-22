# Tasks: F15 Re-negotiation Loop

**Input**: Design documents from `.specify/specs/015-renegotiation-loop/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [threat-model.md](threat-model.md), [quickstart.md](quickstart.md), [contracts/](contracts/)

**Tests**: Required. F15 includes contract tests, unit tests, isolation tests, idempotency tests, cost/cap tests, package verification, and a staged dev-run.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Phase 1: Setup

**Purpose**: Prepare the existing `@spyglass/parley` package for F15 re-negotiation orchestration.

- [ ] T001 Add `dev-run:f15` script to `packages/parley/package.json` while preserving existing F08 scripts
- [ ] T002 [P] Add F15 contract schema fixture paths in `packages/parley/src/__tests__/contracts.test.ts` covering `contracts/renegotiation-*.schema.yaml`
- [ ] T003 [P] Add F15 staged dev-run placeholder file in `packages/parley/scripts/f15-staged-dev-run.ts`
- [ ] T004 [P] Add F15 public export placeholders for re-negotiation types in `packages/parley/src/index.ts`

---

## Phase 2: Foundational

**Purpose**: Shared request, decision, attempt, isolation, cost, alarm, fixture, and audit semantics required before user stories.

**Critical**: No user story work can begin until this phase is complete.

- [ ] T005 Define re-negotiation request, decision, attempt, isolation, cost ceiling, alarm, side, status, and reason-code types in `packages/parley/src/types.ts` for FR-001 through FR-017
- [ ] T006 [P] Add deterministic F15 fixtures for asymmetric outcomes, contracts, attempts, cost ceilings, principals, prior runs, prior dossiers, legal holds, tombstones, and duplicate events in `packages/parley/src/__tests__/fixtures.ts`
- [ ] T007 [P] Add F15 contract schema validation tests in `packages/parley/src/__tests__/contracts.test.ts` for request, decision, attempt, and alarm schemas
- [ ] T008 [P] Add re-negotiation event constants and trigger exports in `packages/parley/src/events.ts` for FR-001
- [ ] T009 Add `packages/parley/src/renegotiation.ts` with typed policy interfaces, default platform cap of 3, and no-op dependency adapters for FR-008 and FR-009
- [ ] T010 Export F15 re-negotiation types and policy entry points from `packages/parley/src/index.ts`

**Checkpoint**: Foundation ready. User story implementation can start.

---

## Phase 3: User Story 1 - Start a Fresh Re-negotiation Run (Priority: P1) MVP

**Goal**: A cleared side can request re-negotiation after an asymmetric match outcome and receive a fresh, isolated run for the same match ticket.

**Independent Test**: Submit a valid `match_ticket.renegotiation_requested` request for an eligible asymmetric match ticket and verify distinct `run_id`, incremented attempt, zero inherited context counters, immutable prior references, and audit evidence.

### Tests for User Story 1

- [ ] T011 [P] [US1] Add accepted re-negotiation contract tests in `packages/parley/src/__tests__/renegotiation-contract.test.ts` for FR-001, FR-002, FR-003, and SC-001
- [ ] T012 [P] [US1] Add fresh run isolation tests in `packages/parley/src/__tests__/renegotiation-isolation.test.ts` for FR-004, FR-005, and SC-002
- [ ] T013 [P] [US1] Add same-ticket attempt sequencing tests in `packages/parley/src/__tests__/renegotiation-attempt.test.ts` for FR-003
- [ ] T014 [P] [US1] Add audit evidence tests for accepted request and fresh-run allocation in `packages/parley/src/__tests__/renegotiation-audit.test.ts` for FR-012

### Implementation for User Story 1

- [ ] T015 [US1] Implement request normalization and explicit event validation in `packages/parley/src/renegotiation.ts` for FR-001
- [ ] T016 [US1] Implement asymmetric prior-outcome eligibility and cleared-side requester validation in `packages/parley/src/renegotiation.ts` for FR-006
- [ ] T017 [US1] Implement fresh `run_id` allocation and same-ticket attempt creation in `packages/parley/src/renegotiation.ts` for FR-002 and FR-003
- [ ] T018 [US1] Implement immutable prior run and dossier reference handling in `packages/parley/src/renegotiation.ts` for FR-005
- [ ] T019 [US1] Implement run isolation boundary construction with zero inherited context counters in `packages/parley/src/renegotiation.ts` for FR-004 and SC-002
- [ ] T020 [US1] Implement accepted decision and audit evidence emission in `packages/parley/src/renegotiation.ts` for FR-012
- [ ] T021 [US1] Integrate accepted re-negotiation dispatch with existing Parley run repository semantics in `packages/parley/src/dispatcher.ts` for FR-002

**Checkpoint**: User Story 1 is independently functional and testable.

---

## Phase 4: User Story 2 - Refuse Unsafe or Ineligible Re-negotiation (Priority: P2)

**Goal**: Unsafe, unauthorized, stale, closed, duplicate, or ineligible requests fail closed without allocating a new run or notifying the non-cleared side by default.

**Independent Test**: Submit requests for closed, already-maxed, unauthorized, duplicate, non-cleared-side, tombstoned, legal-hold, and non-asymmetric match tickets and verify no new run is created and a refusal or idempotency decision is recorded.

### Tests for User Story 2

- [ ] T022 [P] [US2] Add unauthorized and non-cleared-side refusal tests in `packages/parley/src/__tests__/renegotiation-refusal.test.ts` for FR-007 and SC-006
- [ ] T023 [P] [US2] Add closed, withdrawn, legal-hold, tombstone, and missing-reference refusal tests in `packages/parley/src/__tests__/renegotiation-lifecycle.test.ts` for FR-007 and SC-006
- [ ] T024 [P] [US2] Add duplicate replay and active-run idempotency tests in `packages/parley/src/__tests__/renegotiation-idempotency.test.ts` for FR-011 and SC-003
- [ ] T025 [P] [US2] Add non-cleared-side silence posture tests in `packages/parley/src/__tests__/renegotiation-silence.test.ts` for FR-013
- [ ] T026 [P] [US2] Add privacy, tool-dispatch, advocate, and dossier failure termination tests in `packages/parley/src/__tests__/renegotiation-fail-safe.test.ts` for FR-014 and FR-015

### Implementation for User Story 2

- [ ] T027 [US2] Implement authorization, requester-side, closed-ticket, withdrawn-ticket, legal-hold, tombstone, and missing-reference refusal policy in `packages/parley/src/renegotiation.ts` for FR-007
- [ ] T028 [US2] Implement duplicate request replay and active-run idempotency handling in `packages/parley/src/renegotiation.ts` for FR-011
- [ ] T029 [US2] Implement refusal decision mapping with stable reason codes in `packages/parley/src/renegotiation.ts` for FR-007 and FR-012
- [ ] T030 [US2] Implement non-cleared-side default silence metadata in `packages/parley/src/renegotiation.ts` for FR-013
- [ ] T031 [US2] Implement privacy-filter, tool-dispatch, advocate invocation, and dossier-production fail-safe termination mapping in `packages/parley/src/renegotiation.ts` for FR-014 and FR-015
- [ ] T032 [US2] Add refusal and idempotency audit evidence emission in `packages/parley/src/renegotiation.ts` for FR-012

**Checkpoint**: User Stories 1 and 2 are independently functional and testable.

---

## Phase 5: User Story 3 - Enforce Cost and Round Controls (Priority: P3)

**Goal**: Re-negotiation cannot exceed effective round caps or per-match cost ceilings, and every breach emits operator-visible alarm evidence.

**Independent Test**: Simulate cap exhaustion, preflight cost breach, and runtime cost breach and verify refusal or safe termination, no further advocate turns after breach, and alarm/audit evidence.

### Tests for User Story 3

- [ ] T033 [P] [US3] Add effective round-cap calculation tests in `packages/parley/src/__tests__/renegotiation-cap.test.ts` for FR-008 and SC-004
- [ ] T034 [P] [US3] Add preflight cost ceiling refusal tests in `packages/parley/src/__tests__/renegotiation-cost.test.ts` for FR-009, FR-010, and SC-005
- [ ] T035 [P] [US3] Add runtime cost breach termination tests in `packages/parley/src/__tests__/renegotiation-runtime-cost.test.ts` for FR-009, FR-010, and SC-005
- [ ] T036 [P] [US3] Add alarm contract and audit evidence tests in `packages/parley/src/__tests__/renegotiation-alarm.test.ts` for FR-010 and FR-012
- [ ] T037 [P] [US3] Add later-surface outcome projection tests in `packages/parley/src/__tests__/renegotiation-outcome.test.ts` for FR-016 and FR-017

### Implementation for User Story 3

- [ ] T038 [US3] Implement effective cap calculation as min seeker cap, employer cap, and platform default cap in `packages/parley/src/renegotiation.ts` for FR-008
- [ ] T039 [US3] Implement round-cap refusal policy and cap audit evidence in `packages/parley/src/renegotiation.ts` for FR-008 and FR-012
- [ ] T040 [US3] Implement preflight cost ceiling policy and refusal audit evidence in `packages/parley/src/renegotiation.ts` for FR-009 and FR-012
- [ ] T041 [US3] Implement runtime cost observation and safe termination mapping in `packages/parley/src/renegotiation.ts` for FR-009 and FR-015
- [ ] T042 [US3] Implement operator-visible alarm record creation for preflight and runtime breaches in `packages/parley/src/renegotiation.ts` for FR-010
- [ ] T043 [US3] Implement outcome projection shape for later channel and employer surfaces without hidden run state in `packages/parley/src/renegotiation.ts` for FR-016 and FR-017

**Checkpoint**: All user stories are independently functional and testable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, documentation, and Spec Kit closure.

- [ ] T044 [P] Update `docs/runbooks/parley-renegotiation.md` with F15 eligibility, refusal, cost, alarm, and silence posture notes
- [ ] T045 [P] Update `docs/data-governance/data-classification.yaml` with F15 request, decision, attempt, isolation, cost, and alarm payload classifications
- [ ] T046 [P] Add implementation notes to `.specify/specs/015-renegotiation-loop/threat-model.md` after code lands
- [ ] T047 Add F15 staged dev-run scenarios and evidence writer in `packages/parley/scripts/f15-staged-dev-run.ts` for SC-007
- [ ] T048 Run `pnpm --filter @spyglass/parley test` and record result in `.specify/specs/015-renegotiation-loop/quickstart-run-2026-05-22.md`
- [ ] T049 Run `pnpm --filter @spyglass/parley type-check` and record result in `.specify/specs/015-renegotiation-loop/quickstart-run-2026-05-22.md`
- [ ] T050 Run `pnpm --filter @spyglass/parley lint` and record result in `.specify/specs/015-renegotiation-loop/quickstart-run-2026-05-22.md`
- [ ] T051 Run `pnpm --filter @spyglass/parley build` and record result in `.specify/specs/015-renegotiation-loop/quickstart-run-2026-05-22.md`
- [ ] T052 Run `pnpm --filter @spyglass/parley dev-run:f15` and record evidence for SC-001 through SC-007 in `.specify/specs/015-renegotiation-loop/quickstart-run-2026-05-22.md`
- [ ] T053 Run `/speckit-analyze` and save findings in `.specify/specs/015-renegotiation-loop/analyze-report.md`
- [ ] T054 Run `/code-review` and save findings in `.specify/specs/015-renegotiation-loop/code-review-t054.md`
- [ ] T055 Run `/security-review` and save findings in `.specify/specs/015-renegotiation-loop/security-review-t055.md`
- [ ] T056 Update `.specify/roadmap.md` with F15 implementation status and next-feature notes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: No dependencies.
- **Phase 2 Foundational**: Depends on Phase 1; blocks user story work.
- **Phase 3 US1**: Depends on Phase 2 and delivers the MVP fresh-run behavior.
- **Phase 4 US2**: Depends on Phase 2 and can be implemented after or alongside US1, but refusal paths must not allocate runs.
- **Phase 5 US3**: Depends on Phase 2 and integrates cap/cost controls with accepted/refused decisions.
- **Phase 6 Polish**: Depends on selected user stories being complete.

### User Story Dependencies

- **US1**: MVP. No dependency on other stories after foundation.
- **US2**: No dependency on US1 after foundation, but shares the same policy evaluator and must preserve US1 accepted behavior.
- **US3**: No dependency on US1/US2 after foundation, but final integration must exercise both accepted and refused paths.

### Parallel Opportunities

- T002-T004 can run in parallel.
- T006-T008 can run in parallel.
- US1 tests T011-T014 can run in parallel before US1 implementation.
- US2 tests T022-T026 can run in parallel before US2 implementation.
- US3 tests T033-T037 can run in parallel before US3 implementation.
- T044-T046 can run in parallel after implementation stabilizes.

## Parallel Example: User Story 1

```text
Task: "T011 [P] [US1] Add accepted re-negotiation contract tests in packages/parley/src/__tests__/renegotiation-contract.test.ts"
Task: "T012 [P] [US1] Add fresh run isolation tests in packages/parley/src/__tests__/renegotiation-isolation.test.ts"
Task: "T013 [P] [US1] Add same-ticket attempt sequencing tests in packages/parley/src/__tests__/renegotiation-attempt.test.ts"
Task: "T014 [P] [US1] Add audit evidence tests for accepted request and fresh-run allocation in packages/parley/src/__tests__/renegotiation-audit.test.ts"
```

## Implementation Strategy

### MVP First

1. Complete Phase 1 setup.
2. Complete Phase 2 foundation.
3. Complete Phase 3 US1 fresh-run behavior.
4. Stop and validate US1 independently with package tests before adding refusal and cost controls.

### Incremental Delivery

1. Add US1 accepted fresh-run orchestration.
2. Add US2 refusal, idempotency, fail-safe, and silence policies.
3. Add US3 cap, cost, alarm, and later-surface projection policies.
4. Run staged dev-run and closure reviews.
5. Update roadmap and publish PR.

### Review Discipline

- Write tests before implementation for each user story.
- Keep F15 in `@spyglass/parley`; do not alter F13 seeker or F14 employer advocate behavior.
- Preserve fresh-run, no-hot-continuation, immutable-reference-only, and no inherited context semantics.
- Treat cost, cap, duplicate, privacy/tool failure, legal-hold, and tombstone uncertainty as fail-closed.
- Preserve the non-cleared-side silence posture unless a later feature explicitly opts into feedback.
