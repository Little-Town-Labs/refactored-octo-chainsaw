# Tasks: F11 Candidate Notification Artifact System

**Input**: Design documents from `.specify/specs/011-candidate-notifications/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included because this is compliance infrastructure and each story must be independently verifiable.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the F11 package, schema entry points, and documentation skeleton.

- [x] T001 Create `packages/notifications/package.json`, `packages/notifications/tsconfig.json`, `packages/notifications/jest.config.js`, and `packages/notifications/eslint.config.js`
- [x] T002 Create `packages/notifications/src/index.ts`, `packages/notifications/src/types.ts`, `packages/notifications/src/repo.ts`, and `packages/notifications/src/scopes.ts`
- [x] T003 Add F11 schema export placeholder in `packages/db/src/schema/candidate-notifications.ts` and wire it from `packages/db/src/schema/index.ts`
- [x] T004 [P] Add F11 runbook skeleton in `docs/runbooks/candidate-notifications.md`
- [x] T005 [P] Add F11 staged-run script skeleton in `packages/notifications/scripts/f11-staged-dev-run.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Governance, schema, contract validation, and shared helpers required by all stories.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T006 Add `candidate_notice_template`, `candidate_notification_artifact`, and `candidate_notification_delivery_evidence` classes and F11 table entries to `docs/data-governance/data-classification.yaml`
- [x] T007 Add F11 retention entries to `docs/data-governance/retention-policy.md`
- [x] T008 Add F11 integrity invariants for `candidate_notice_template_versions`, `candidate_notification_artifacts`, `candidate_notification_gate_events`, and `candidate_notification_delivery_commands` to `docs/data-governance/integrity-invariants.md`
- [x] T009 Implement Drizzle schema for F11 tables in `packages/db/src/schema/candidate-notifications.ts`
- [x] T010 Add migration `packages/db/migrations/0013_f11_candidate_notifications.sql` and update `packages/db/migrations/meta/_journal.json`
- [x] T011 [P] Add JSON Schema contract validation tests for F11 contract files in `packages/notifications/src/__tests__/contracts.test.ts`
- [x] T012 [P] Implement shared F11 type definitions and reason-code unions in `packages/notifications/src/types.ts`
- [x] T013 Implement canonicalization and hash helpers in `packages/notifications/src/canonicalize.ts`
- [x] T014 Implement in-memory test fixtures and repo harness in `packages/notifications/src/__tests__/fixtures.ts`

**Checkpoint**: Foundation ready; user story implementation can begin.

---

## Phase 3: User Story 1 - Create Candidate Notice Artifacts (Priority: P1) 🎯 MVP

**Goal**: Create deterministic notification artifacts from produced dossier evidence.

**Independent Test**: Build a candidate notice artifact from seeded dossier-produced evidence and verify refs, template version, timing, content hash, status, and audit refs.

### Tests for User Story 1

- [x] T015 [P] [US1] Add deterministic artifact creation tests in `packages/notifications/src/__tests__/artifacts.test.ts`
- [x] T016 [P] [US1] Add notice template publication tests in `packages/notifications/src/__tests__/templates.test.ts`

### Implementation for User Story 1

- [x] T017 [US1] Implement notification repository write/read operations in `packages/notifications/src/repo.ts`
- [x] T018 [US1] Implement immutable template publication in `packages/notifications/src/templates.ts`
- [x] T019 [US1] Implement deterministic notification artifact creation and content hashing in `packages/notifications/src/artifacts.ts`
- [x] T020 [US1] Validate required refs, content refs, inconclusive notice reasons, and safe artifact boundaries in `packages/notifications/src/artifacts.ts`
- [x] T021 [US1] Export template, artifact, repository, and reason-code APIs from `packages/notifications/src/index.ts`

**Checkpoint**: User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Enforce Notice Timing and Delivery Gates (Priority: P1)

**Goal**: Refuse delivery unless required notification artifacts exist, are current, and satisfy timing evidence.

**Independent Test**: Evaluate seeded artifacts before and after eligible delivery timestamps and verify stable allowed/refused reason codes.

### Tests for User Story 2

- [x] T022 [P] [US2] Add timing evidence tests in `packages/notifications/src/__tests__/timing.test.ts`
- [x] T023 [P] [US2] Add delivery gate refusal and allowed decision tests in `packages/notifications/src/__tests__/gate.test.ts`

### Implementation for User Story 2

- [x] T024 [US2] Implement notice timing helpers in `packages/notifications/src/timing.ts`
- [x] T025 [US2] Implement fail-closed delivery gate evaluation in `packages/notifications/src/gate.ts`
- [x] T026 [US2] Persist delivery gate events through `packages/notifications/src/repo.ts`
- [x] T027 [US2] Export timing and gate APIs from `packages/notifications/src/index.ts`

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Preserve Notice Versions and Audit Evidence (Priority: P2)

**Goal**: Preserve immutable template/artifact evidence and provide scoped review reads.

**Independent Test**: Supersede a template, verify previous artifacts remain unchanged, and verify scoped review reads reconstruct evidence while unscoped reads fail.

### Tests for User Story 3

- [x] T028 [P] [US3] Add template supersession immutability tests in `packages/notifications/src/__tests__/template-supersession.test.ts`
- [x] T029 [P] [US3] Add scoped and unscoped review read tests in `packages/notifications/src/__tests__/review.test.ts`

### Implementation for User Story 3

- [x] T030 [US3] Implement template supersession helpers in `packages/notifications/src/templates.ts`
- [x] T031 [US3] Implement scoped review reads for templates, artifacts, gate events, and delivery commands in `packages/notifications/src/review.ts`
- [x] T032 [US3] Add review scopes and descriptions in `packages/notifications/src/scopes.ts`
- [x] T033 [US3] Export review APIs from `packages/notifications/src/index.ts`

**Checkpoint**: User Stories 1, 2, and 3 are independently functional.

---

## Phase 6: User Story 4 - Emit Delivery Commands Without Sending Messages (Priority: P3)

**Goal**: Generate deterministic channel-agnostic delivery commands only after the gate allows delivery.

**Independent Test**: Generate repeated commands for the same ready artifact and channel intent and verify stable idempotency keys without invoking channel adapters.

### Tests for User Story 4

- [x] T034 [P] [US4] Add delivery command idempotency and gate dependency tests in `packages/notifications/src/__tests__/delivery.test.ts`

### Implementation for User Story 4

- [x] T035 [US4] Implement delivery command creation in `packages/notifications/src/delivery.ts`
- [x] T036 [US4] Persist delivery commands through `packages/notifications/src/repo.ts`
- [x] T037 [US4] Export delivery command APIs from `packages/notifications/src/index.ts`

**Checkpoint**: All user stories are independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verification, documentation, and required closure reviews.

- [x] T038 [P] Update `docs/runbooks/candidate-notifications.md` with template, artifact, gate, delivery-command, review, and rollback procedures
- [x] T039 Implement staged quickstart run in `packages/notifications/scripts/f11-staged-dev-run.ts`
- [x] T040 Run and record quickstart evidence in `.specify/specs/011-candidate-notifications/quickstart-run-2026-05-20.md`
- [x] T041 Run `/speckit-analyze` and record findings in `.specify/specs/011-candidate-notifications/analyze-report.md`
- [x] T042 Run `/code-review` and record findings in `.specify/specs/011-candidate-notifications/code-review-t042.md`
- [x] T043 Run `/security-review` and record findings in `.specify/specs/011-candidate-notifications/security-review-t043.md`
- [x] T044 Run final verification: `pnpm --filter @spyglass/notifications test`, `pnpm --filter @spyglass/notifications type-check`, `pnpm --filter @spyglass/notifications lint`, `pnpm --filter @spyglass/notifications build`, `pnpm --filter @spyglass/notifications dev-run:f11`, `pnpm --filter @spyglass/db build`, and `pnpm schema:lint`
- [x] T045 Update `.specify/roadmap.md` Stage 4 notes after F11 implementation evidence is complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup completion and blocks user stories.
- **User Stories (Phase 3+)**: Depend on Foundational completion.
- **Polish (Phase 7)**: Depends on all user stories.

### User Story Dependencies

- **US1 (P1)**: Starts after Foundational; creates artifacts and templates.
- **US2 (P1)**: Depends on US1 artifact/template primitives.
- **US3 (P2)**: Depends on US1 evidence and repository primitives.
- **US4 (P3)**: Depends on US2 gate decisions.

### Parallel Opportunities

- T004/T005 can run in parallel.
- T011/T012 can run in parallel after schema/contracts are present.
- Test tasks within each user story can run in parallel.
- US3 review tests can proceed after US1 repository primitives exist.

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational phases.
2. Complete US1 artifact creation and template publication.
3. Validate deterministic artifact creation before proceeding to gates.

### Incremental Delivery

1. US1: deterministic candidate notification artifacts.
2. US2: timing evidence and fail-closed delivery gate.
3. US3: immutable review evidence and scoped reads.
4. US4: delivery command handoff for future channel adapters.

## Notes

- F11 does not send messages.
- F11 does not duplicate raw dossier or transcript content.
- F11 must mark every completed task as `[x]` during implementation.
