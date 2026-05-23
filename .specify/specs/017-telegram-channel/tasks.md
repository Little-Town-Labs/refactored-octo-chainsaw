# Tasks: Telegram Channel Adapter

**Input**: Design documents from `.specify/specs/017-telegram-channel/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Tests are included because the F17 spec defines conformance, duplicate, outbound, delivery, boundary, unsupported-intent, and staged dev-run success criteria.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently after shared setup/foundation.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the Telegram adapter package and baseline project wiring.

- [x] T001 Scaffold `packages/telegram-channel/package.json` with build, test, type-check, lint, and `dev-run:f17` scripts
- [x] T002 [P] Add `packages/telegram-channel/tsconfig.json` extending `tsconfig.base.json`
- [x] T003 [P] Add `packages/telegram-channel/jest.config.js` using the monorepo Jest pattern
- [x] T004 [P] Add `packages/telegram-channel/eslint.config.js` using the root ESLint config
- [x] T005 [P] Add `packages/telegram-channel/README.md` documenting adapter scope, boundaries, and quickstart commands
- [x] T006 Create `packages/telegram-channel/src/index.ts` exporting the public F17 adapter surface
- [x] T007 Add `grammy` and workspace dependencies to `packages/telegram-channel/package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared Telegram types, capabilities, link/idempotency boundaries, and audit helpers required by all user stories.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T008 [P] Implement Telegram native and bounded metadata types in `packages/telegram-channel/src/types.ts`
- [x] T009 [P] Implement Telegram adapter capability declaration in `packages/telegram-channel/src/capabilities.ts`
- [x] T010 [P] Implement channel-link lookup interfaces and in-memory test fixture helpers in `packages/telegram-channel/src/links.ts`
- [x] T011 [P] Implement duplicate-store interfaces and idempotency key helpers in `packages/telegram-channel/src/idempotency.ts`
- [x] T012 [P] Implement Telegram audit event builders in `packages/telegram-channel/src/audit.ts`
- [x] T013 [P] Add shared Telegram test fixtures in `packages/telegram-channel/src/__tests__/fixtures.ts`
- [x] T014 Validate YAML contract artifacts in `.specify/specs/017-telegram-channel/contracts/`

**Checkpoint**: Foundation ready. Telegram link posture, idempotency, capability, audit, and fixture primitives exist.

---

## Phase 3: User Story 1 - Receive Telegram Seeker Messages (Priority: P1) MVP

**Goal**: Normalize verified/pending Telegram inbound updates into canonical channel messages and refuse or suppress unsafe inputs.

**Independent Test**: Submit verified, pending-verification, unknown, disabled, malformed, oversized, unsupported, and duplicate Telegram fixture updates and verify exactly one canonical message or structured refusal/suppression outcome.

### Tests for User Story 1

- [x] T015 [P] [US1] Add verified inbound normalization test in `packages/telegram-channel/src/__tests__/adapter.test.ts`
- [x] T016 [P] [US1] Add pending-link verification normalization test in `packages/telegram-channel/src/__tests__/links.test.ts`
- [x] T017 [P] [US1] Add unknown/disabled sender refusal tests in `packages/telegram-channel/src/__tests__/links.test.ts`
- [x] T018 [P] [US1] Add duplicate Telegram update suppression tests in `packages/telegram-channel/src/__tests__/idempotency.test.ts`
- [x] T019 [P] [US1] Add malformed, oversized, and unsupported update refusal tests in `packages/telegram-channel/src/__tests__/adapter.test.ts`

### Implementation for User Story 1

- [x] T020 [US1] Implement Telegram native update parsing and bounds checks in `packages/telegram-channel/src/normalize.ts`
- [x] T021 [US1] Implement inbound channel-link posture decisions in `packages/telegram-channel/src/links.ts`
- [x] T022 [US1] Implement duplicate suppression before normalization side effects in `packages/telegram-channel/src/idempotency.ts`
- [x] T023 [US1] Implement inbound `ChannelMessage` creation for verified and pending-link Telegram updates in `packages/telegram-channel/src/normalize.ts`
- [x] T024 [US1] Implement inbound refusal mapping for unknown, disabled, unauthorized, malformed, oversized, and unsupported Telegram updates in `packages/telegram-channel/src/normalize.ts`
- [x] T025 [US1] Wire `normalizeInbound` in `packages/telegram-channel/src/adapter.ts`
- [x] T026 [US1] Emit inbound normalized, refused, and duplicate-suppressed audit events from `packages/telegram-channel/src/audit.ts`

**Checkpoint**: User Story 1 is independently functional and testable as the MVP.

---

## Phase 4: User Story 2 - Send Approved Telegram Replies (Priority: P2)

**Goal**: Render approved canonical outbound messages to Telegram and map provider responses into F16 delivery outcomes.

**Independent Test**: Render approved projection/system outbound messages, refuse missing or unapproved disclosure posture, degrade rich cards to approved fallback text, and map provider success, retry, terminal, and throttling responses.

### Tests for User Story 2

- [x] T027 [P] [US2] Add approved outbound rendering tests in `packages/telegram-channel/src/__tests__/render.test.ts`
- [x] T028 [P] [US2] Add missing/unapproved projection refusal tests in `packages/telegram-channel/src/__tests__/render.test.ts`
- [x] T029 [P] [US2] Add rich-card fallback rendering tests in `packages/telegram-channel/src/__tests__/render.test.ts`
- [x] T030 [P] [US2] Add Telegram provider delivery mapping tests in `packages/telegram-channel/src/__tests__/delivery.test.ts`

### Implementation for User Story 2

- [x] T031 [US2] Implement approved outbound content validation in `packages/telegram-channel/src/render.ts`
- [x] T032 [US2] Implement Telegram text and rich-card fallback rendering in `packages/telegram-channel/src/render.ts`
- [x] T033 [US2] Implement outbound render refusal mapping for invalid participant, unsendable thread, missing projection, and unsupported content in `packages/telegram-channel/src/render.ts`
- [x] T034 [US2] Implement Telegram provider response to delivery outcome mapping in `packages/telegram-channel/src/delivery.ts`
- [x] T035 [US2] Wire `renderOutbound`, `acknowledgeInbound`, and `reportDelivery` in `packages/telegram-channel/src/adapter.ts`
- [x] T036 [US2] Emit outbound rendered and delivery recorded audit events from `packages/telegram-channel/src/audit.ts`

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Preserve Telegram Adapter Boundaries (Priority: P3)

**Goal**: Prove the Telegram adapter conforms to F16 channel-core while refusing product execution, dashboard drift, and prohibited data surfaces.

**Independent Test**: Run channel-core conformance against Telegram fixtures, validate unsupported intents, and prove raw counterparty/dossier/Parley internals cannot be passed through the public adapter surface.

### Tests for User Story 3

- [x] T037 [P] [US3] Add channel-core conformance tests in `packages/telegram-channel/src/__tests__/adapter.test.ts`
- [x] T038 [P] [US3] Add unsupported dashboard/direct-negotiation intent tests in `packages/telegram-channel/src/__tests__/boundary.test.ts`
- [x] T039 [P] [US3] Add prohibited data surface boundary tests in `packages/telegram-channel/src/__tests__/boundary.test.ts`

### Implementation for User Story 3

- [x] T040 [US3] Add Telegram conformance fixtures that satisfy F16 helpers in `packages/telegram-channel/src/adapter.ts`
- [x] T041 [US3] Implement unsupported intent classification/downgrade helpers in `packages/telegram-channel/src/normalize.ts`
- [x] T042 [US3] Harden public exports so only canonical adapter, capability, fixtures, and bounded types are exported from `packages/telegram-channel/src/index.ts`
- [x] T043 [US3] Document adapter/product boundary examples in `packages/telegram-channel/README.md`

**Checkpoint**: All user stories are independently functional and boundary-tested.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verification, evidence, reviews, roadmap updates, and publish readiness.

- [x] T044 [P] Add staged F17 dev run in `packages/telegram-channel/scripts/f17-staged-dev-run.ts`
- [x] T045 Run `pnpm --filter @spyglass/telegram-channel test` and record results in `.specify/specs/017-telegram-channel/quickstart-run-2026-05-23.md`
- [x] T046 Run `pnpm --filter @spyglass/telegram-channel type-check` and append results to `.specify/specs/017-telegram-channel/quickstart-run-2026-05-23.md`
- [x] T047 Run `pnpm --filter @spyglass/telegram-channel lint` and append results to `.specify/specs/017-telegram-channel/quickstart-run-2026-05-23.md`
- [x] T048 Run `pnpm --filter @spyglass/telegram-channel build` and append results to `.specify/specs/017-telegram-channel/quickstart-run-2026-05-23.md`
- [x] T049 Run `pnpm --filter @spyglass/telegram-channel dev-run:f17` and append results to `.specify/specs/017-telegram-channel/quickstart-run-2026-05-23.md`
- [x] T050 Run `/speckit-analyze` and record findings in `.specify/specs/017-telegram-channel/analyze-report.md`
- [x] T051 Perform code review and record findings in `.specify/specs/017-telegram-channel/code-review-t051.md`
- [x] T052 Perform security review and record findings in `.specify/specs/017-telegram-channel/security-review-t052.md`
- [x] T053 Update `.specify/roadmap.md` with F17 implementation status and next-step guidance
- [x] T054 Review final diff, commit branch `017-telegram-channel`, push, open PR, verify checks/mergeability, and follow through to merge

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational and is the MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational; can be implemented after or alongside US1, but final staged run should include US1.
- **User Story 3 (Phase 5)**: Depends on Foundational and benefits from US1/US2 surfaces for boundary tests.
- **Polish (Phase 6)**: Depends on selected user stories being complete; publish readiness depends on all stories.

### User Story Dependencies

- **US1 Receive Telegram Seeker Messages**: MVP, no dependency on US2 or US3 after foundation.
- **US2 Send Approved Telegram Replies**: Can start after foundation; uses outbound fixtures independent of inbound flow.
- **US3 Preserve Telegram Adapter Boundaries**: Can start after foundation; final conformance coverage should include US1 and US2 paths.

### Parallel Opportunities

- T002-T005 can run in parallel after T001.
- T008-T013 can run in parallel after package setup.
- US1 tests T015-T019 can be written in parallel.
- US2 tests T027-T030 can be written in parallel.
- US3 tests T037-T039 can be written in parallel.
- Review artifacts T051-T052 can be drafted in parallel after verification.

## Parallel Example: User Story 1

```bash
Task: "Add verified inbound normalization test in packages/telegram-channel/src/__tests__/adapter.test.ts"
Task: "Add pending-link verification normalization test in packages/telegram-channel/src/__tests__/links.test.ts"
Task: "Add duplicate Telegram update suppression tests in packages/telegram-channel/src/__tests__/idempotency.test.ts"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 setup.
2. Complete Phase 2 foundation.
3. Write US1 tests and confirm they fail.
4. Implement US1 normalization/refusal/duplicate behavior.
5. Validate US1 independently with package tests.

### Incremental Delivery

1. US1: inbound normalization and refusal.
2. US2: outbound rendering and delivery reporting.
3. US3: conformance and boundary hardening.
4. Phase 6: full verification, analyze, review, roadmap, PR.

### Notes

- `[P]` tasks touch separate files or can be executed independently.
- `[US#]` labels map tasks to spec user stories.
- Keep product action execution out of this adapter; classify and normalize only.
- Do not add database migrations in F17 unless a later approved clarification changes scope.
