# Tasks: PTH15 Eval Trend and Cost Monitoring

**Input**: PTH15 spec, plan, research, data model, contract, and quickstart.

## Phase 1: Setup

- [x] T001 Update Spec Kit pointers in `.specify/feature.json` and `AGENTS.md`
- [x] T002 Update product harness roadmap status for PTH15 implementation

## Phase 2: Tests First

- [x] T003 [P] Add eval trend report tests in `packages/product-test-harness/src/__tests__/reporting-ci.test.ts`
- [x] T004 [P] Add persona eval sample trend tests in `packages/product-test-harness/src/__tests__/pi-persona-evals.test.ts`

## Phase 3: Core Implementation

- [x] T005 Add eval trend extraction and summary helpers in `packages/product-test-harness/src/reporting/eval-trends.ts`
- [x] T006 Add report contract fields in `packages/product-test-harness/src/contracts.ts`
- [x] T007 Wire eval trends into `packages/product-test-harness/src/reporting/reports.ts`
- [x] T008 Wire compact trend summary into `packages/product-test-harness/src/samples/pi-persona-evals.ts`
- [x] T009 Export PTH15 trend APIs from `packages/product-test-harness/src/index.ts`
- [x] T010 Update `product:eval` command metadata to mention informational trend reporting

## Phase 4: Polish and Validation

- [x] T011 Run focused reporting/persona eval tests
- [x] T012 Run package type-check, lint, build, and tests
- [x] T013 Run workspace format/type/lint/build checks
- [x] T014 Run Spec Kit analyze pass and close task checkboxes
