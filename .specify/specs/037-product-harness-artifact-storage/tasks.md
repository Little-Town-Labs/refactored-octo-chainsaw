# Tasks: PTH12 Durable Artifact Storage

**Input**: PTH12 spec, plan, research, data model, contract, and quickstart.

## Phase 1: Setup

- [x] T001 Update Spec Kit pointers in `.specify/feature.json` and `AGENTS.md`
- [x] T002 Update product harness roadmap status for PTH12 implementation

## Phase 2: Tests First

- [x] T003 [P] Add durable artifact storage tests in `packages/product-test-harness/src/__tests__/artifact-storage.test.ts`

## Phase 3: Core Implementation

- [x] T004 Add artifact storage contracts to `packages/product-test-harness/src/artifacts/storage.ts`
- [x] T005 Implement validation, checksum, and `RunArtifact` conversion helpers in `packages/product-test-harness/src/artifacts/storage.ts`
- [x] T006 Implement `LocalFileProductArtifactStore` with atomic writes, metadata sidecars, idempotency, and conflict rejection
- [x] T007 Export PTH12 public APIs from `packages/product-test-harness/src/index.ts`

## Phase 4: Polish and Validation

- [x] T008 Run focused artifact-storage tests
- [x] T009 Run package type-check, lint, build, and tests
- [x] T010 Run workspace format/diff hygiene checks
- [x] T011 Run Spec Kit analyze pass and close task checkboxes
