# Tasks: Phase 0 Alpha Posture Infrastructure

**Input**: Design documents from `.specify/specs/025-phase-0-alpha-posture/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Required. F25 gates constitutional launch posture and must fail closed.

## Phase 1: Setup

- [x] T001 Create `packages/alpha-posture/` package with config and `src/index.ts`
- [x] T002 [P] Copy alpha posture contract to `packages/alpha-posture/contracts/alpha-posture.v1.schema.yaml`
- [x] T003 [P] Create source files `types.ts`, `schemas.ts`, `consent.ts`, `dossier.ts`, `gate.ts`, and `counsel.ts`
- [x] T004 [P] Create `docs/runbooks/phase-0-alpha-posture.md`
- [x] T005 Update `.specify/roadmap.md` current status and changelog to mark F25 active

## Phase 2: Foundation

- [x] T006 [P] Add F25 Drizzle schema in `packages/db/src/schema/alpha-posture.ts`
- [x] T007 Export F25 schema from `packages/db/src/schema/index.ts`
- [x] T008 Add F25 schema coverage in `packages/db/src/__tests__/schema.test.ts`
- [x] T009 [P] Define F25 Zod schemas and domain types in `packages/alpha-posture/src/schemas.ts` and `packages/alpha-posture/src/types.ts`
- [x] T010 [P] Add alpha posture contract alignment test in `packages/alpha-posture/src/__tests__/contract.test.ts`

## Phase 3: User Story 1 - Capture Alpha Consent

- [x] T011 [P] [US1] Add consent tests in `packages/alpha-posture/src/__tests__/consent.test.ts`
- [x] T012 [US1] Implement consent text, record, withdrawal, and eligibility helpers in `packages/alpha-posture/src/consent.ts`

## Phase 4: User Story 2 - Label Dossiers Informational Only

- [x] T013 [P] [US2] Add dossier posture tests in `packages/alpha-posture/src/__tests__/dossier.test.ts`
- [x] T014 [US2] Implement alpha dossier posture helpers in `packages/alpha-posture/src/dossier.ts`

## Phase 5: User Story 3 - Require Human Review Before Outreach

- [x] T015 [P] [US3] Add human review gate tests in `packages/alpha-posture/src/__tests__/gate.test.ts`
- [x] T016 [US3] Implement fail-closed alpha outreach gate in `packages/alpha-posture/src/gate.ts`

## Phase 6: User Story 4 - Retain Counsel Evidence

- [x] T017 [P] [US4] Add counsel evidence tests in `packages/alpha-posture/src/__tests__/counsel.test.ts`
- [x] T018 [US4] Implement counsel evidence validation in `packages/alpha-posture/src/counsel.ts`
- [x] T019 [US4] Finalize Phase 0 posture runbook in `docs/runbooks/phase-0-alpha-posture.md`

## Phase 7: Polish

- [x] T020 [P] Add F25 threat model in `.specify/specs/025-phase-0-alpha-posture/reviews/threat-model.md`
- [x] T021 [P] Add F25 security review in `.specify/specs/025-phase-0-alpha-posture/reviews/security-review.md`
- [x] T022 [P] Add F25 code review in `.specify/specs/025-phase-0-alpha-posture/reviews/code-review.md`
- [x] T023 Add analyze report in `.specify/specs/025-phase-0-alpha-posture/analyze-report.md`
- [x] T024 Record quickstart evidence in `.specify/specs/025-phase-0-alpha-posture/quickstart-run-2026-05-26.md`
- [x] T025 Run focused and workspace verification
- [x] T026 Review final diff, commit, push, open PR, and verify checks/mergeability
