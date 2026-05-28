# Tasks: PTH10 Reports, Dashboard, and CI/Canary Workflows

**Input**: PTH10 spec, plan, data model, contracts, and quickstart.

## Phase 1: Setup

- [x] T001 Update Spec Kit pointers in `.specify/feature.json` and `AGENTS.md`
- [x] T002 Update product harness roadmap status for PTH10 implementation

## Phase 2: Tests First

- [x] T003 [P] Add reporting/CI unit tests in `packages/product-test-harness/src/__tests__/reporting-ci.test.ts`

## Phase 3: Core Implementation

- [x] T004 Add PTH10 report/command/workflow contracts to `packages/product-test-harness/src/contracts.ts`
- [x] T005 Implement aggregate report rendering in `packages/product-test-harness/src/reporting/reports.ts`
- [x] T006 Implement command metadata in `packages/product-test-harness/src/reporting/commands.ts`
- [x] T007 Implement workflow metadata in `packages/product-test-harness/src/reporting/workflows.ts`
- [x] T008 Export PTH10 public APIs from `packages/product-test-harness/src/index.ts`

## Phase 4: Integration

- [x] T009 Add deterministic reporting sample in `packages/product-test-harness/src/samples/reporting-ci.ts`
- [x] T010 Add package/root scripts for `run:reporting-ci`, `product:gate`, `product:eval`, and `product:canary`
- [x] T011 Add GitHub Actions workflows for product gate, persona eval, and alpha canary

## Phase 5: Polish and Validation

- [x] T012 Run focused product-test-harness reporting tests
- [x] T013 Run package and workspace validation commands
- [x] T014 Run Spec Kit analyze pass and close task checkboxes
