# Tasks: PTH13 Browserbase Preview/Prod Replay Driver

**Input**: PTH13 spec, plan, research, data model, contract, and quickstart.

## Phase 1: Setup

- [x] T001 Update Spec Kit pointers in `.specify/feature.json` and `AGENTS.md`
- [x] T002 Update product harness roadmap status for PTH13 implementation

## Phase 2: Tests First

- [x] T003 [P] Add Browserbase driver tests in `packages/product-test-harness/src/__tests__/browserbase-driver.test.ts`

## Phase 3: Core Implementation

- [x] T004 Implement Browserbase session/config/connector contracts in `packages/product-test-harness/src/browser/browserbase-driver.ts`
- [x] T005 Implement `BrowserbaseBrowserJourneyDriver.visit` with session creation, connector execution, safe evidence refs, failure mapping, and cleanup
- [x] T006 Implement Browserbase env parsing and missing-config errors
- [x] T007 Export PTH13 public APIs from `packages/product-test-harness/src/index.ts`

## Phase 4: Polish and Validation

- [x] T008 Run focused Browserbase driver tests
- [x] T009 Run existing browser journey tests
- [x] T010 Run package type-check, lint, build, and tests
- [x] T011 Run workspace format/type/lint/build checks
- [x] T012 Run Spec Kit analyze pass and close task checkboxes
