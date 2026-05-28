# Tasks: PTH14 Canary Workflow Hardening

**Input**: PTH14 spec, plan, research, data model, contract, and quickstart.

## Phase 1: Setup

- [x] T001 Update Spec Kit pointers in `.specify/feature.json` and `AGENTS.md`
- [x] T002 Update product harness roadmap status for PTH14 implementation

## Phase 2: Tests First

- [x] T003 [P] Add reporting/canary env tests in `packages/product-test-harness/src/__tests__/reporting-ci.test.ts`

## Phase 3: Core Implementation

- [x] T004 Add canary env validation helper in `packages/product-test-harness/src/reporting/canary-env.ts`
- [x] T005 Update `product:canary` command metadata in `packages/product-test-harness/src/reporting/commands.ts`
- [x] T006 Wire canary validation into `packages/product-test-harness/src/samples/reporting-ci.ts`
- [x] T007 Export PTH14 canary validation APIs from `packages/product-test-harness/src/index.ts`
- [x] T008 Harden `.github/workflows/alpha-canary.yml` with explicit dry-run input, vars/secrets, and pre-build validation

## Phase 4: Polish and Validation

- [x] T009 Run focused reporting/canary tests
- [x] T010 Run package type-check, lint, build, and tests
- [x] T011 Run workspace format/type/lint/build checks
- [x] T012 Run Spec Kit analyze pass and close task checkboxes
