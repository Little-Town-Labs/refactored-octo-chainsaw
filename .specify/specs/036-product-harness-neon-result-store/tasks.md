# Tasks: PTH11 Neon Test Harness Schema Persistence

**Input**: PTH11 spec, plan, research, data model, contract, and quickstart.

## Phase 1: Setup

- [x] T001 Update Spec Kit pointers in `.specify/feature.json` and `AGENTS.md`
- [x] T002 Update product harness roadmap status for PTH11 implementation

## Phase 2: Tests First

- [x] T003 [P] Add Neon result-store unit tests in `packages/product-test-harness/src/__tests__/result-store.test.ts`

## Phase 3: Core Implementation

- [x] T004 Add Neon result-store SQL client/options contracts in `packages/product-test-harness/src/results/neon-store.ts`
- [x] T005 Implement schema identifier guards and schema initialization SQL
- [x] T006 Implement `saveRun` with stable hash, idempotent duplicate handling, and conflict rejection
- [x] T007 Implement `getRun` and `listRuns` with existing filters and newest-first ordering
- [x] T008 Export Neon result-store APIs from `packages/product-test-harness/src/index.ts`

## Phase 4: Polish and Validation

- [x] T009 Run focused product-test-harness result-store tests
- [x] T010 Run package type-check, lint, build, and tests
- [x] T011 Run workspace format/diff hygiene checks
- [x] T012 Run Spec Kit analyze pass and close task checkboxes
