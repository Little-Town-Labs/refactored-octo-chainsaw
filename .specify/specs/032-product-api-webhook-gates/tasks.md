# Tasks: Employer API and Webhook Gate Scenarios

**Input**: Design documents from `.specify/specs/032-product-api-webhook-gates/`

**Prerequisites**: plan.md, spec.md, quickstart.md

**Tests**: Jest unit tests are required for deterministic scoped auth, req lifecycle, webhook signature verification, receiver capture, idempotency, failure evidence, payload-boundary validation, and result-store persistence.

## Phase 1: Setup

- [x] T001 Update active Spec Kit pointers in `.specify/feature.json` and `AGENTS.md`
- [x] T002 Add API/webhook gate sample script in `packages/product-test-harness/package.json`

## Phase 2: Tests

- [x] T003 [P] Add scoped credential and req lifecycle tests in `packages/product-test-harness/src/__tests__/api-webhook-gates.test.ts`
- [x] T004 [P] Add signed webhook receiver, idempotency, failure evidence, payload-boundary, and result-store persistence tests in `packages/product-test-harness/src/__tests__/api-webhook-gates.test.ts`

## Phase 3: Core Implementation

- [x] T005 Add employer API/webhook contracts to `packages/product-test-harness/src/contracts.ts`
- [x] T006 Implement scoped synthetic credential helpers in `packages/product-test-harness/src/api-webhooks/credentials.ts`
- [x] T007 Implement webhook signing and verification in `packages/product-test-harness/src/api-webhooks/signing.ts`
- [x] T008 Implement payload-boundary assertions in `packages/product-test-harness/src/api-webhooks/payload-boundaries.ts`
- [x] T009 Implement synthetic webhook receiver capture and idempotency in `packages/product-test-harness/src/api-webhooks/receiver.ts`
- [x] T010 Implement deterministic PTH07 gate registry in `packages/product-test-harness/src/api-webhooks/gates.ts`
- [x] T011 Implement API/webhook gate runner and result-store persistence in `packages/product-test-harness/src/api-webhooks/runner.ts`
- [x] T012 Export API/webhook runner helpers from `packages/product-test-harness/src/index.ts`

## Phase 4: Sample and Documentation

- [x] T013 Implement local sample runner in `packages/product-test-harness/src/samples/api-webhook-gates.ts`
- [x] T014 Update `.specify/specs/032-product-api-webhook-gates/quickstart.md` with command evidence
- [x] T015 Update `docs/testing/product-harness/roadmap.md` for PTH07 implementation status and PTH08 next queue

## Phase 5: Validation

- [x] T016 Run `pnpm --filter @spyglass/product-test-harness test -- api-webhook-gates`
- [x] T017 Run `pnpm --filter @spyglass/product-test-harness test`
- [x] T018 Run `pnpm --filter @spyglass/product-test-harness type-check`
- [x] T019 Run `pnpm --filter @spyglass/product-test-harness build`
- [x] T020 Run `pnpm --filter @spyglass/product-test-harness lint`
- [x] T021 Run `pnpm --filter @spyglass/product-test-harness run:api-webhook-gates`
- [x] T022 Run `pnpm format:check`
- [x] T023 Run `/speckit-analyze` equivalent and record findings in `.specify/specs/032-product-api-webhook-gates/analyze-report.md`

## Dependencies & Execution Order

- Phase 1 precedes implementation.
- T003 and T004 should fail before T005-T013 implementation.
- T009 depends on T005-T008.
- T010 depends on T006-T009.
- T011 depends on T010.
- T013 depends on T011-T012.
- Validation follows all implementation tasks.
