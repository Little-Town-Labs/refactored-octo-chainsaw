# Tasks: Product Harness Seed Factories

**Input**: Design documents from `.specify/specs/029-product-harness-seed-factories/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/seed-factory.schema.json, quickstart.md

**Tests**: This feature requires Jest unit tests because deterministic replay, relationship validation, lifecycle integration, and result-store compatibility are core acceptance criteria.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare product harness seed module structure and sample command wiring.

- [x] T001 Create seed source directory `packages/product-test-harness/src/seeds/`
- [x] T002 [P] Create seed factory sample placeholder `packages/product-test-harness/src/samples/seed-factory-scenario.ts`
- [x] T003 Add `run:seed-factory-sample` script in `packages/product-test-harness/package.json`
- [x] T004 Update public exports for forthcoming seed modules in `packages/product-test-harness/src/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define shared seed contracts, deterministic helpers, fixture registry, errors, and validation primitives required by every user story.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T005 Define seed bundle, seed input, seed entity, seed relationship, fixture, application result, and seed factory types in `packages/product-test-harness/src/contracts.ts`
- [x] T006 [P] Implement deterministic id, ref, and timestamp helpers in `packages/product-test-harness/src/seeds/deterministic.ts`
- [x] T007 [P] Implement seed factory errors and fixture registry helpers in `packages/product-test-harness/src/seeds/factories.ts`
- [x] T008 [P] Implement seed bundle validation helpers in `packages/product-test-harness/src/seeds/validation.ts`
- [x] T009 [P] Add foundational validation and deterministic helper tests in `packages/product-test-harness/src/__tests__/seed-factories.test.ts`

**Checkpoint**: Seed contracts and fail-closed validation primitives are ready.

---

## Phase 3: User Story 1 - Build a Deterministic Alpha Seed Bundle (Priority: P1)

**Goal**: Generate complete, replayable synthetic seed bundles with traceable seed records.

**Independent Test**: Generate the same fixture twice and verify deterministic ids, relationships, attributes, and seed records match exactly.

### Tests for User Story 1

- [x] T010 [P] [US1] Add deterministic replay test for identical fixture inputs in `packages/product-test-harness/src/__tests__/seed-factories.test.ts`
- [x] T011 [P] [US1] Add complete Alpha happy-path fixture category coverage test in `packages/product-test-harness/src/__tests__/seed-factories.test.ts`
- [x] T012 [P] [US1] Add result-store `ProductSeedRecord` compatibility test in `packages/product-test-harness/src/__tests__/seed-factories.test.ts`

### Implementation for User Story 1

- [x] T013 [US1] Implement common seed entity builders in `packages/product-test-harness/src/seeds/factories.ts`
- [x] T014 [US1] Implement `alpha-happy-path` fixture in `packages/product-test-harness/src/seeds/fixtures.ts`
- [x] T015 [US1] Implement seed record projection for generated entities in `packages/product-test-harness/src/seeds/factories.ts`
- [x] T016 [US1] Export Alpha happy-path fixture builders from `packages/product-test-harness/src/index.ts`

**Checkpoint**: User Story 1 is independently functional and testable.

---

## Phase 4: User Story 2 - Validate Relationships and Compliance Defaults (Priority: P1)

**Goal**: Ensure generated seed graphs are internally consistent and Alpha-safe.

**Independent Test**: Valid bundles pass; bundles with duplicate ids, dangling refs, missing consent posture, missing jurisdiction posture, missing Alpha posture metadata, missing bias evidence, or unsafe metadata fail before application.

### Tests for User Story 2

- [x] T017 [P] [US2] Add duplicate id and dangling relationship rejection tests in `packages/product-test-harness/src/__tests__/seed-factories.test.ts`
- [x] T018 [P] [US2] Add missing consent and jurisdiction posture rejection tests in `packages/product-test-harness/src/__tests__/seed-factories.test.ts`
- [x] T019 [P] [US2] Add missing rubric bias evidence and unsafe metadata rejection tests in `packages/product-test-harness/src/__tests__/seed-factories.test.ts`
- [x] T020 [P] [US2] Add denial fixture validation tests for missing consent and jurisdiction kill switch in `packages/product-test-harness/src/__tests__/seed-factories.test.ts`

### Implementation for User Story 2

- [x] T021 [US2] Enforce required category, duplicate id, and dangling relationship validation in `packages/product-test-harness/src/seeds/validation.ts`
- [x] T022 [US2] Enforce consent, jurisdiction, Alpha posture, and bias evidence validation in `packages/product-test-harness/src/seeds/validation.ts`
- [x] T023 [US2] Enforce unsafe metadata and secret-like value rejection in `packages/product-test-harness/src/seeds/validation.ts`
- [x] T024 [US2] Implement `missing-consent` and `jurisdiction-kill-switch` fixtures in `packages/product-test-harness/src/seeds/fixtures.ts`

**Checkpoint**: User Stories 1 and 2 are independently functional and testable.

---

## Phase 5: User Story 3 - Apply Seeds Through the Existing Lifecycle (Priority: P2)

**Goal**: Connect deterministic seed generation to lifecycle callbacks and result-store persistence.

**Independent Test**: Run an offline sample that generates seeds, records dry-run application evidence, returns lifecycle seed metadata, persists seed records, and reloads them from the local result store.

### Tests for User Story 3

- [x] T025 [P] [US3] Add offline seed application adapter tests in `packages/product-test-harness/src/__tests__/seed-factories.test.ts`
- [x] T026 [P] [US3] Add lifecycle seed callback integration test in `packages/product-test-harness/src/__tests__/seed-factories.test.ts`
- [x] T027 [P] [US3] Add local result-store persistence test for generated seed records in `packages/product-test-harness/src/__tests__/seed-factories.test.ts`

### Implementation for User Story 3

- [x] T028 [US3] Implement offline seed application adapter in `packages/product-test-harness/src/seeds/apply.ts`
- [x] T029 [US3] Implement lifecycle seed callback helper in `packages/product-test-harness/src/seeds/apply.ts`
- [x] T030 [US3] Implement seed factory sample in `packages/product-test-harness/src/samples/seed-factory-scenario.ts`
- [x] T031 [US3] Export application helpers from `packages/product-test-harness/src/index.ts`

**Checkpoint**: All user stories are independently functional and testable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, roadmap evidence, and final validation.

- [x] T032 Update `.specify/specs/029-product-harness-seed-factories/quickstart.md` with actual command output notes
- [x] T033 Run `pnpm --filter @spyglass/product-test-harness test -- seed-factories`
- [x] T034 Run `pnpm --filter @spyglass/product-test-harness type-check`
- [x] T035 Run `pnpm --filter @spyglass/product-test-harness build`
- [x] T036 Run `pnpm --filter @spyglass/product-test-harness lint`
- [x] T037 Run `pnpm --filter @spyglass/product-test-harness run:seed-factory-sample`
- [x] T038 Run `/speckit-analyze` equivalent and record findings in `.specify/specs/029-product-harness-seed-factories/analyze-report.md`
- [x] T039 Final diff review, commit, push, and open PR

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 Setup has no dependencies.
- Phase 2 Foundational depends on Phase 1 and blocks all user stories.
- US1 and US2 are both P1; US2 depends on seed bundle structure from US1 but can be tested with hand-built invalid bundles after Phase 2.
- US3 depends on generated bundles from US1 and validation from US2.
- Polish depends on all desired user stories.

### User Story Dependencies

- **US1**: Starts after Foundational.
- **US2**: Starts after Foundational; integrates with US1 fixtures.
- **US3**: Depends on US1 generated bundles and US2 validation.

### Parallel Opportunities

- T002 can run in parallel with T003.
- T006, T007, T008, and T009 can run in parallel after T005 direction is clear.
- US1 tests T010-T012 can be written in parallel.
- US2 rejection tests T017-T020 can be written in parallel.
- US3 tests T025-T027 can be written in parallel after application contract shape is clear.

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete US1 deterministic Alpha happy-path generation.
3. Validate deterministic replay and seed-record compatibility.
4. Add relationship/compliance validation before lifecycle integration.

### Incremental Delivery

1. Seed contracts and deterministic helpers.
2. Happy-path fixture generation and seed records.
3. Validation and denial fixtures.
4. Offline application plus lifecycle/result-store integration.
5. Sample, quickstart evidence, and PR publication.
