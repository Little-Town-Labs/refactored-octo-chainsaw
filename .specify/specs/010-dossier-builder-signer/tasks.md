# Tasks: F10 Dossier Builder + Signer

**Input**: Design documents from `.specify/specs/010-dossier-builder-signer/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Test tasks are included because F10 is a compliance/integrity boundary with canonical signing, deterministic projections, verification, and scoped evidence review.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the F10 package, schema entry points, and documentation skeleton.

- [x] T001 Create `packages/dossiers/package.json`, `packages/dossiers/tsconfig.json`, `packages/dossiers/jest.config.js`, and `packages/dossiers/eslint.config.js`
- [x] T002 Create `packages/dossiers/src/index.ts`, `packages/dossiers/src/types.ts`, `packages/dossiers/src/repo.ts`, and `packages/dossiers/src/scopes.ts`
- [x] T003 Add F10 schema export placeholder in `packages/db/src/schema/dossiers.ts` and wire it from `packages/db/src/schema/index.ts`
- [x] T004 [P] Add F10 runbook skeleton in `docs/runbooks/dossier-builder-signer.md`
- [x] T005 [P] Add F10 staged-run script skeleton in `packages/dossiers/scripts/f10-staged-dev-run.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish governance, storage, shared validation, and contract tests that all stories depend on.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T006 Add `dossier_artifact`, `dossier_projection`, and `dossier_signature_evidence` classes and F10 table entries to `docs/data-governance/data-classification.yaml`
- [x] T007 Add F10 retention entries to `docs/data-governance/retention-policy.md`
- [x] T008 Add F10 integrity invariants for `dossier_artifacts`, `dossier_projections`, `dossier_signatures`, and `dossier_verification_events` to `docs/data-governance/integrity-invariants.md`
- [x] T009 Implement Drizzle schema for F10 tables in `packages/db/src/schema/dossiers.ts`
- [x] T010 Add migration `packages/db/migrations/0012_f10_dossier_builder_signer.sql` and update `packages/db/migrations/meta/_journal.json`
- [x] T011 [P] Add JSON Schema contract validation tests for F10 contract files in `packages/dossiers/src/__tests__/contracts.test.ts`
- [x] T012 [P] Implement shared F10 type definitions and reason-code unions in `packages/dossiers/src/types.ts`
- [x] T013 Implement canonicalization and hash helpers in `packages/dossiers/src/canonicalize.ts`
- [x] T014 Implement in-memory test fixtures and repo harness in `packages/dossiers/src/__tests__/fixtures.ts`

**Checkpoint**: Foundation ready; user story implementation can begin.

---

## Phase 3: User Story 1 - Build Deterministic Dossiers (Priority: P1) MVP

**Goal**: Stable dossier artifacts can be assembled from seeded run evidence with identical canonical hashes across rebuilds.

**Independent Test**: Build the same dossier twice and verify canonical payload, content hash, rubric breakdowns, rationales, flags, and version metadata match.

### Tests for User Story 1

- [x] T015 [P] [US1] Add deterministic dossier build tests in `packages/dossiers/src/__tests__/build.test.ts`
- [x] T016 [P] [US1] Add canonicalization key-order regression tests in `packages/dossiers/src/__tests__/canonicalize.test.ts`

### Implementation for User Story 1

- [x] T017 [US1] Implement dossier repository write/read operations in `packages/dossiers/src/repo.ts`
- [x] T018 [US1] Implement deterministic dossier assembly and content hashing in `packages/dossiers/src/build.ts`
- [x] T019 [US1] Validate rubric breakdown totals and side rationales in `packages/dossiers/src/build.ts`
- [x] T020 [US1] Emit canonical audit evidence for dossier build outcomes in `packages/dossiers/src/build.ts`
- [x] T021 [US1] Export build, canonicalization, repository, and reason-code APIs from `packages/dossiers/src/index.ts`

**Checkpoint**: User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Pre-Compute Per-Audience Projections (Priority: P1)

**Goal**: Seeker, employer, auditor, and A2A receiver projections are stored on the dossier and never derived at delivery time.

**Independent Test**: Build all four audience projections and verify required projection enforcement and stored refs.

### Tests for User Story 2

- [x] T022 [P] [US2] Add projection storage and audience coverage tests in `packages/dossiers/src/__tests__/projections.test.ts`
- [x] T023 [P] [US2] Add missing-projection fail-closed and inconclusive-flag tests in `packages/dossiers/src/__tests__/projection-gate.test.ts`

### Implementation for User Story 2

- [x] T024 [US2] Implement projection validation and payload hashing in `packages/dossiers/src/projections.ts`
- [x] T025 [US2] Integrate required projection enforcement into `packages/dossiers/src/build.ts`
- [x] T026 [US2] Persist stored projections through `packages/dossiers/src/repo.ts`
- [x] T027 [US2] Export projection APIs from `packages/dossiers/src/index.ts`

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Sign and Verify Canonical Dossiers (Priority: P1)

**Goal**: Dossiers can be signed, verified, and rejected on tampering with deterministic canonical signature coverage.

**Independent Test**: Sign a dossier, verify it, mutate signed fields, reorder keys, and verify reason codes.

### Tests for User Story 3

- [x] T028 [P] [US3] Add signing and successful verification tests in `packages/dossiers/src/__tests__/signing.test.ts`
- [x] T029 [P] [US3] Add tamper, unknown-key, disabled-signing, and key-order verification tests in `packages/dossiers/src/__tests__/verify.test.ts`

### Implementation for User Story 3

- [x] T030 [US3] Implement signing abstraction and Ed25519 test signer in `packages/dossiers/src/signing.ts`
- [x] T031 [US3] Implement verification helper and stable reason codes in `packages/dossiers/src/verify.ts`
- [x] T032 [US3] Persist dossier signatures and verification events through `packages/dossiers/src/repo.ts`
- [x] T033 [US3] Emit canonical audit evidence for signing and verification outcomes in `packages/dossiers/src/signing.ts` and `packages/dossiers/src/verify.ts`
- [x] T034 [US3] Export signing and verification APIs from `packages/dossiers/src/index.ts`

**Checkpoint**: User Stories 1, 2, and 3 are independently functional.

---

## Phase 6: User Story 4 - Review Dossier Evidence (Priority: P2)

**Goal**: Scoped reviewers can reconstruct dossier metadata, projections, signatures, verification outcomes, and inconclusive flags without raw transcript expansion.

**Independent Test**: Scoped reads return bounded evidence and unscoped reads are denied by default.

### Tests for User Story 4

- [x] T035 [P] [US4] Add scoped dossier review read tests in `packages/dossiers/src/__tests__/review.test.ts`
- [x] T036 [P] [US4] Add unscoped access denial tests in `packages/dossiers/src/__tests__/review-auth.test.ts`

### Implementation for User Story 4

- [x] T037 [US4] Implement scoped review reads for dossiers, projections, signatures, and verification events in `packages/dossiers/src/review.ts`
- [x] T038 [US4] Add review scopes and descriptions in `packages/dossiers/src/scopes.ts`
- [x] T039 [US4] Export review APIs from `packages/dossiers/src/index.ts`

**Checkpoint**: All user stories are independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verification, documentation, and required closure reviews.

- [x] T040 [P] Update `docs/runbooks/dossier-builder-signer.md` with build, projection, signing, verification, review, and rollback procedures
- [x] T041 Implement staged quickstart run in `packages/dossiers/scripts/f10-staged-dev-run.ts`
- [x] T042 Run and record quickstart evidence in `.specify/specs/010-dossier-builder-signer/quickstart-run-2026-05-20.md`
- [x] T043 Run `/speckit-analyze` and record findings in `.specify/specs/010-dossier-builder-signer/analyze-report.md`
- [x] T044 Run `/code-review` and record findings in `.specify/specs/010-dossier-builder-signer/code-review-t044.md`
- [x] T045 Run `/security-review` and record findings in `.specify/specs/010-dossier-builder-signer/security-review-t045.md`
- [x] T046 Run final verification: `pnpm --filter @spyglass/dossiers test`, `pnpm --filter @spyglass/dossiers type-check`, `pnpm --filter @spyglass/dossiers lint`, `pnpm --filter @spyglass/dossiers build`, `pnpm --filter @spyglass/dossiers dev-run:f10`, `pnpm --filter @spyglass/db build`, and `pnpm schema:lint`
- [x] T047 Update `.specify/roadmap.md` Stage 4 notes after F10 implementation evidence is complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user stories.
- **US1 (Phase 3)**: Depends on Foundational; MVP for deterministic dossier assembly.
- **US2 (Phase 4)**: Depends on US1 because projections are stored on dossier artifacts.
- **US3 (Phase 5)**: Depends on US1 and US2 because signatures cover completed dossier payloads.
- **US4 (Phase 6)**: Requires records from US1, US2, and US3.
- **Polish (Phase 7)**: Depends on all selected user stories.

### User Story Dependencies

- **User Story 1 (P1)**: Start after Foundational; no dependency on other stories.
- **User Story 2 (P1)**: Requires US1 dossier artifacts.
- **User Story 3 (P1)**: Requires dossier artifacts and projections to sign.
- **User Story 4 (P2)**: Requires evidence records from US1, US2, and US3.

### Parallel Opportunities

- T004 and T005 can run alongside package skeleton work.
- T011, T012, and T014 can run after contract schemas are stable.
- US1 tests T015 and T016 can be written in parallel.
- US2 tests T022 and T023 can be written in parallel.
- US3 tests T028 and T029 can be written in parallel.
- US4 tests T035 and T036 can be written in parallel.

---

## Parallel Example: User Story 3

```text
Task: "Add signing and successful verification tests in packages/dossiers/src/__tests__/signing.test.ts"
Task: "Add tamper, unknown-key, disabled-signing, and key-order verification tests in packages/dossiers/src/__tests__/verify.test.ts"
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete User Story 1 to establish deterministic dossier assembly and canonical hashes.
3. Validate US1 independently with `build.test.ts` and `canonicalize.test.ts`.
4. Complete User Story 2 before signing so the signed dossier includes stored projections.

### Compliance Gate Completion

1. Complete signing and verification in User Story 3 before exposing dossiers to delivery surfaces.
2. Complete scoped review reads in User Story 4.
3. Run quickstart, analyze, code review, security review, and final gates.
