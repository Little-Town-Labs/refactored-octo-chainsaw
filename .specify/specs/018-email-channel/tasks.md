# Tasks: Email Channel Adapter

**Input**: Design documents from `.specify/specs/018-email-channel/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Tests are required because the specification defines conformance, duplicate, delivery, boundary, and staged-run success criteria.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story the task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Package initialization and basic structure

- [x] T001 Create `packages/email-channel/package.json` with package scripts, workspace dependencies, and Resend dependency posture
- [x] T002 Create `packages/email-channel/tsconfig.json` extending the repo TypeScript package pattern
- [x] T003 Create `packages/email-channel/jest.config.js` using the local Jest package pattern
- [x] T004 Create `packages/email-channel/eslint.config.js` using the local package ESLint pattern
- [x] T005 [P] Create `packages/email-channel/README.md` documenting package scope, boundaries, and validation commands
- [x] T006 [P] Create source/test directories under `packages/email-channel/src/`, `packages/email-channel/src/__tests__/`, and `packages/email-channel/scripts/`
- [x] T007 Create `packages/email-channel/src/index.ts` export surface stub

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core types, constants, and boundaries that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T008 Define email native/provider event, channel-link, thread, render, delivery, and audit types in `packages/email-channel/src/types.ts`
- [x] T009 Define email adapter capability metadata in `packages/email-channel/src/capabilities.ts`
- [x] T010 Define provider-neutral email reason/status mappings in `packages/email-channel/src/delivery.ts`
- [x] T011 Define channel-link, unsubscribe, suppression, and pending-verification lookup interfaces in `packages/email-channel/src/links.ts`
- [x] T012 Define idempotency-store interface and key helpers in `packages/email-channel/src/idempotency.ts`
- [x] T013 Define audit event builders for normalization, refusal, duplicate, render, delivery, bounce/complaint, unsubscribe refusal, and capability registration in `packages/email-channel/src/audit.ts`
- [x] T014 [P] Add shared deterministic email fixtures in `packages/email-channel/src/__tests__/fixtures.ts`
- [x] T015 [P] Add contract-shape smoke tests for YAML contracts in `packages/email-channel/src/__tests__/contracts.test.ts`
- [x] T016 Wire base `EmailChannelAdapter` composition skeleton in `packages/email-channel/src/adapter.ts`

**Checkpoint**: Foundation ready. User story implementation can now begin in priority order or in parallel.

---

## Phase 3: User Story 1 - Receive Threaded Seeker Email Replies (Priority: P1) MVP

**Goal**: Normalize verified/pending threaded inbound email into canonical channel messages and refuse unsafe or unauthorized events.

**Independent Test**: Submit parsed inbound events for verified, pending-verification, unknown, disabled, spam-flagged, wrong-thread, malformed, duplicate, and unsafe-attachment cases and verify canonical messages or structured refusals.

### Tests for User Story 1

- [x] T017 [P] [US1] Add verified threaded inbound normalization test in `packages/email-channel/src/__tests__/adapter.test.ts`
- [x] T018 [P] [US1] Add pending-link verification normalization test in `packages/email-channel/src/__tests__/links.test.ts`
- [x] T019 [P] [US1] Add wrong-thread, unknown, disabled, unsubscribed, suppressed, and spam/spoof-risk refusal tests in `packages/email-channel/src/__tests__/adapter.test.ts`
- [x] T020 [P] [US1] Add duplicate provider event and duplicate message-id suppression tests in `packages/email-channel/src/__tests__/idempotency.test.ts`
- [x] T021 [P] [US1] Add reply-alias and reference-header thread derivation tests in `packages/email-channel/src/__tests__/threading.test.ts`
- [x] T022 [P] [US1] Add unsafe attachment and over-size body refusal tests in `packages/email-channel/src/__tests__/adapter.test.ts`

### Implementation for User Story 1

- [x] T023 [P] [US1] Implement email address, reply-alias, and reference-header normalization helpers in `packages/email-channel/src/threading.ts`
- [x] T024 [P] [US1] Implement email idempotency key derivation in `packages/email-channel/src/idempotency.ts`
- [x] T025 [US1] Implement inbound provider-event classification in `packages/email-channel/src/normalize.ts`
- [x] T026 [US1] Implement channel-link and thread-posture checks in `packages/email-channel/src/normalize.ts`
- [x] T027 [US1] Implement pending-verification inbound handling in `packages/email-channel/src/normalize.ts`
- [x] T028 [US1] Implement unknown, disabled, unsubscribed, suppressed, spam/spoof-risk, wrong-thread, malformed, over-size, and unsafe-attachment refusals in `packages/email-channel/src/normalize.ts`
- [x] T029 [US1] Implement duplicate suppression flow in `packages/email-channel/src/adapter.ts`
- [x] T030 [US1] Emit inbound normalization, refusal, and duplicate audit events in `packages/email-channel/src/audit.ts`
- [x] T031 [US1] Export US1 adapter entry points from `packages/email-channel/src/index.ts`

**Checkpoint**: User Story 1 is independently functional and testable.

---

## Phase 4: User Story 2 - Send Approved Email Messages (Priority: P2)

**Goal**: Render approved canonical outbound messages into safe email requests and map send/delivery outcomes provider-neutrally.

**Independent Test**: Render approved projection/system outbound messages, refuse missing or unapproved disclosure posture, refuse unsendable recipients, degrade rich content to approved fallback text, and map provider delivery signals.

### Tests for User Story 2

- [x] T032 [P] [US2] Add approved outbound text-first render tests in `packages/email-channel/src/__tests__/render.test.ts`
- [x] T033 [P] [US2] Add missing/unapproved projection refusal tests in `packages/email-channel/src/__tests__/render.test.ts`
- [x] T034 [P] [US2] Add unsubscribed, suppressed, invalid participant, and closed-thread outbound refusal tests in `packages/email-channel/src/__tests__/render.test.ts`
- [x] T035 [P] [US2] Add rich-card fallback and unsupported content tests in `packages/email-channel/src/__tests__/render.test.ts`
- [x] T036 [P] [US2] Add accepted, delivered, deferred, bounced, complained, suppressed, retryable, terminal, and rate-limited delivery mapping tests in `packages/email-channel/src/__tests__/delivery.test.ts`

### Implementation for User Story 2

- [x] T037 [P] [US2] Implement subject and text body rendering helpers in `packages/email-channel/src/render.ts`
- [x] T038 [P] [US2] Implement outbound thread header rendering in `packages/email-channel/src/threading.ts`
- [x] T039 [US2] Implement approved projection/system-generated outbound posture checks in `packages/email-channel/src/render.ts`
- [x] T040 [US2] Implement unsubscribe/suppression and invalid target outbound refusals in `packages/email-channel/src/render.ts`
- [x] T041 [US2] Implement approved rich-content fallback rendering in `packages/email-channel/src/render.ts`
- [x] T042 [US2] Implement email delivery and provider event mapping in `packages/email-channel/src/delivery.ts`
- [x] T043 [US2] Emit outbound render and delivery audit events in `packages/email-channel/src/audit.ts`
- [x] T044 [US2] Integrate outbound render and delivery mapping through `packages/email-channel/src/adapter.ts`

**Checkpoint**: User Stories 1 and 2 are independently functional and testable.

---

## Phase 5: User Story 3 - Preserve Email Adapter Boundaries (Priority: P3)

**Goal**: Prove the email adapter conforms to F16 and cannot absorb product, provider-administration, Parley, scoring, dossier, or privacy-filter responsibilities.

**Independent Test**: Run email-specific conformance fixtures against the shared channel-core contract and validate unsupported intents, prohibited data surfaces, bounce/complaint events, and unsafe attachments are refused or safely downgraded.

### Tests for User Story 3

- [x] T045 [P] [US3] Add F16 channel-core conformance tests for email capabilities and canonical message shape in `packages/email-channel/src/__tests__/boundary.test.ts`
- [x] T046 [P] [US3] Add prohibited data surface tests for raw counterparty records, transcripts, Parley state, scoring internals, unfiltered dossier internals, and provider secrets in `packages/email-channel/src/__tests__/boundary.test.ts`
- [x] T047 [P] [US3] Add unsupported dashboard/direct-negotiation intent tests in `packages/email-channel/src/__tests__/boundary.test.ts`
- [x] T048 [P] [US3] Add capability declaration tests in `packages/email-channel/src/__tests__/capabilities.test.ts`

### Implementation for User Story 3

- [x] T049 [US3] Implement email adapter capability declaration in `packages/email-channel/src/capabilities.ts`
- [x] T050 [US3] Implement unsupported intent classification and safe downgrade/refusal behavior in `packages/email-channel/src/normalize.ts`
- [x] T051 [US3] Harden public exports to expose only adapter, types, capability, and provider-neutral helpers in `packages/email-channel/src/index.ts`
- [x] T052 [US3] Add boundary notes and supported/unsupported content posture to `packages/email-channel/README.md`

**Checkpoint**: All user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verification, evidence, reviews, roadmap updates, and publish readiness.

- [x] T053 Add staged dev-run script for F18 in `packages/email-channel/scripts/f18-staged-dev-run.ts`
- [x] T054 Run `pnpm --filter @spyglass/email-channel test` and fix failures
- [x] T055 Run `pnpm --filter @spyglass/email-channel type-check` and fix failures
- [x] T056 Run `pnpm --filter @spyglass/email-channel lint` and fix failures
- [x] T057 Run `pnpm --filter @spyglass/email-channel build` and fix failures
- [x] T058 Run `pnpm --filter @spyglass/email-channel dev-run:f18` and record evidence in `.specify/specs/018-email-channel/quickstart-run-2026-05-23.md`
- [x] T059 Run `/speckit-analyze` and record results in `.specify/specs/018-email-channel/analyze-report.md`
- [x] T060 Perform code review and record findings in `.specify/specs/018-email-channel/code-review-t060.md`
- [x] T061 Perform security review and record findings in `.specify/specs/018-email-channel/security-review-t061.md`
- [x] T062 Update `.specify/roadmap.md` with F18 implementation status and next-step guidance
- [ ] T063 Review final diff, commit branch `018-email-channel`, push, open PR, verify checks/mergeability, and follow through to merge

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user stories.
- **US1 (Phase 3)**: Depends on Foundational; MVP slice.
- **US2 (Phase 4)**: Depends on Foundational and can use US1 fixtures/helpers, but remains independently testable.
- **US3 (Phase 5)**: Depends on Foundational and validates the full boundary after US1/US2 surfaces exist.
- **Polish (Phase 6)**: Depends on selected user stories being complete.

### User Story Dependencies

- **US1 Receive Threaded Seeker Email Replies**: Start after Foundational. No dependency on US2/US3.
- **US2 Send Approved Email Messages**: Start after Foundational. Uses shared types and link posture but not US1 execution.
- **US3 Preserve Email Adapter Boundaries**: Start after Foundational. Best completed after US1/US2 implementation exposes public surfaces.

### Parallel Opportunities

- T005 and T006 can run in parallel with core setup.
- T014 and T015 can run in parallel after source/test directories exist.
- US1 tests T017-T022 can be written in parallel.
- US2 tests T032-T036 can be written in parallel.
- US3 tests T045-T048 can be written in parallel.
- Implementation helpers touching `threading.ts`, `idempotency.ts`, `render.ts`, and `delivery.ts` can be parallelized once shared types are stable.

---

## Parallel Example: User Story 1

```bash
Task: "Add verified threaded inbound normalization test in packages/email-channel/src/__tests__/adapter.test.ts"
Task: "Add pending-link verification normalization test in packages/email-channel/src/__tests__/links.test.ts"
Task: "Add duplicate provider event and duplicate message-id suppression tests in packages/email-channel/src/__tests__/idempotency.test.ts"
Task: "Add reply-alias and reference-header thread derivation tests in packages/email-channel/src/__tests__/threading.test.ts"
```

## Parallel Example: User Story 2

```bash
Task: "Add approved outbound text-first render tests in packages/email-channel/src/__tests__/render.test.ts"
Task: "Add accepted/deferred/bounced/complained/suppressed delivery mapping tests in packages/email-channel/src/__tests__/delivery.test.ts"
Task: "Implement subject and text body rendering helpers in packages/email-channel/src/render.ts"
Task: "Implement outbound thread header rendering in packages/email-channel/src/threading.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 setup.
2. Complete Phase 2 foundation.
3. Write US1 tests and confirm they fail.
4. Implement US1 normalization/refusal/threading/duplicate behavior.
5. Validate US1 independently with package tests.

### Incremental Delivery

1. US1: inbound normalization, threading, refusal, and duplicate suppression.
2. US2: outbound rendering and delivery/bounce/complaint reporting.
3. US3: conformance and boundary hardening.
4. Phase 6: full verification, analyze, review, roadmap, PR.

### Notes

- `[P]` tasks touch separate files or can be executed independently.
- `[US#]` labels map tasks to spec user stories.
- Keep product action execution out of this adapter; classify and normalize only.
- Do not add database migrations in F18 unless a later approved clarification changes scope.
