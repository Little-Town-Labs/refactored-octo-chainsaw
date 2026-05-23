# Tasks: Channel Adapter Framework

**Input**: Design documents from `.specify/specs/016-channels-core/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Tests are required for this feature because the spec defines conformance, boundary, duplicate, delivery, and unsupported-intent behavior as success criteria.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the existing `@spyglass/channels-core` placeholder for F16 implementation.

- [x] T001 Update `packages/channels-core/package.json` with `dev-run:f16` script and any needed local package metadata
- [x] T002 [P] Update `packages/channels-core/README.md` to describe F16 contract scope, out-of-scope adapters, and stability expectations
- [x] T003 [P] Create source module files `packages/channels-core/src/message.ts`, `content.ts`, `adapter.ts`, `capabilities.ts`, `delivery.ts`, `errors.ts`, `audit.ts`, `conformance.ts`, and `fixtures.ts`
- [x] T004 Update `packages/channels-core/src/index.ts` to export the F16 public API modules
- [x] T005 Create `packages/channels-core/scripts/f16-staged-dev-run.ts` for quickstart validation evidence

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define shared primitives needed before any user-story behavior can be implemented.

- [x] T006 Define channel, direction, participant, thread, content part, intent, disclosure, and metadata primitive types in `packages/channels-core/src/message.ts`
- [x] T007 [P] Define allowed and unsupported seeker-channel intent constants in `packages/channels-core/src/content.ts`
- [x] T008 [P] Define canonical reason codes and error/refusal helper types in `packages/channels-core/src/errors.ts`
- [x] T009 Define delivery status and outcome types in `packages/channels-core/src/delivery.ts`
- [x] T010 [P] Define adapter capability types and capability fixtures in `packages/channels-core/src/capabilities.ts`
- [x] T011 Define channel audit event types and builders in `packages/channels-core/src/audit.ts`
- [x] T012 [P] Add shared conformance fixtures for Telegram-like chat, email-like async threading, and web-chat/plain-text fallback in `packages/channels-core/src/fixtures.ts`

**Checkpoint**: Shared contract primitives exist and can be imported without concrete adapters.

---

## Phase 3: User Story 1 - Normalize Channel Messages (Priority: P1) MVP

**Goal**: Canonical inbound and outbound channel messages can be represented consistently across v0 channel types.

**Independent Test**: Construct inbound and outbound fixtures for Telegram, email, and web chat and verify required canonical fields and untrusted/approved classifications.

### Tests for User Story 1

- [x] T013 [P] [US1] Add canonical inbound/outbound fixture tests in `packages/channels-core/src/__tests__/message.test.ts`
- [x] T014 [P] [US1] Add content classification tests for untrusted inbound and approved outbound content in `packages/channels-core/src/__tests__/message.test.ts`
- [x] T015 [P] [US1] Add contract-shape tests aligned to `.specify/specs/016-channels-core/contracts/channel-message.schema.yaml` in `packages/channels-core/src/__tests__/message.test.ts`

### Implementation for User Story 1

- [x] T016 [US1] Implement `ChannelMessage` constructors and validation helpers in `packages/channels-core/src/message.ts`
- [x] T017 [US1] Implement content-part helpers and intent-family classification guards in `packages/channels-core/src/content.ts`
- [x] T018 [US1] Implement fixture builders for valid Telegram, email, and web-chat canonical messages in `packages/channels-core/src/fixtures.ts`
- [x] T019 [US1] Export User Story 1 types and helpers from `packages/channels-core/src/index.ts`

**Checkpoint**: User Story 1 is independently testable and provides the MVP channel envelope.

---

## Phase 4: User Story 2 - Enforce Adapter Boundaries (Priority: P2)

**Goal**: Concrete adapters can normalize, render, acknowledge, and report delivery through a thin transport boundary without access to prohibited state.

**Independent Test**: Use fake adapters and conformance checks to verify boundary methods, capability declarations, refusal outcomes, and absence of raw counterparty/transcript/run-state interfaces.

### Tests for User Story 2

- [x] T020 [P] [US2] Add adapter interface and fake-adapter conformance tests in `packages/channels-core/src/__tests__/adapter.test.ts`
- [x] T021 [P] [US2] Add capability profile tests for rich realtime, async threaded email, and plain-text fallback in `packages/channels-core/src/__tests__/conformance.test.ts`
- [x] T022 [P] [US2] Add privacy boundary type tests proving outbound adapter input cannot include raw counterparty records, transcripts, or hidden run state in `packages/channels-core/src/__tests__/adapter.test.ts`
- [x] T023 [P] [US2] Add delivery outcome and reason-code tests in `packages/channels-core/src/__tests__/delivery.test.ts`

### Implementation for User Story 2

- [x] T024 [US2] Implement `ChannelAdapter` interface and fake adapter helpers in `packages/channels-core/src/adapter.ts`
- [x] T025 [US2] Implement capability validation and built-in capability profiles in `packages/channels-core/src/capabilities.ts`
- [x] T026 [US2] Implement delivery outcome constructors and provider-neutral classifiers in `packages/channels-core/src/delivery.ts`
- [x] T027 [US2] Implement refusal helpers for unauthenticated links, unauthorized participants, malformed payloads, over-size payloads, missing projections, and provider failures in `packages/channels-core/src/errors.ts`
- [x] T028 [US2] Implement conformance runner helpers in `packages/channels-core/src/conformance.ts`
- [x] T029 [US2] Implement audit event builders for normalized, refused, duplicate-suppressed, outbound-rendered, delivery-recorded, and capability-registered events in `packages/channels-core/src/audit.ts`
- [x] T030 [US2] Export User Story 2 adapter, capability, delivery, conformance, error, and audit APIs from `packages/channels-core/src/index.ts`

**Checkpoint**: User Story 2 proves channel adapters are thin, bounded, and audit-ready.

---

## Phase 5: User Story 3 - Preserve Conversational Product Semantics (Priority: P3)

**Goal**: Channel-core supports allowed seeker conversational intents and rejects dashboard/direct-negotiation drift.

**Independent Test**: Classify supported and unsupported intent fixtures and verify unsupported dashboard/direct-negotiation requests cannot expose prohibited state.

### Tests for User Story 3

- [x] T031 [P] [US3] Add supported seeker-channel intent tests in `packages/channels-core/src/__tests__/unsupported-intents.test.ts`
- [x] T032 [P] [US3] Add unsupported dashboard and direct-negotiation intent refusal tests in `packages/channels-core/src/__tests__/unsupported-intents.test.ts`
- [x] T033 [P] [US3] Add plain-text degradation tests for channels without rich-card support in `packages/channels-core/src/__tests__/conformance.test.ts`

### Implementation for User Story 3

- [x] T034 [US3] Implement allowed and unsupported intent guards in `packages/channels-core/src/content.ts`
- [x] T035 [US3] Implement unsupported-intent delivery/refusal mapping in `packages/channels-core/src/errors.ts`
- [x] T036 [US3] Implement plain-text degradation helper for rich outbound content in `packages/channels-core/src/content.ts`
- [x] T037 [US3] Extend conformance fixtures to cover allowed conversational actions and unsupported dashboard/direct-negotiation actions in `packages/channels-core/src/fixtures.ts`

**Checkpoint**: User Story 3 prevents F16 from becoming a seeker dashboard or direct Parley control surface.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verification, evidence, and process closure.

- [x] T038 Run `pnpm --filter @spyglass/channels-core test` and fix failures
- [x] T039 Run `pnpm --filter @spyglass/channels-core type-check` and fix failures
- [x] T040 Run `pnpm --filter @spyglass/channels-core lint` and fix failures
- [x] T041 Run `pnpm --filter @spyglass/channels-core build` and fix failures
- [x] T042 Run `pnpm --filter @spyglass/channels-core dev-run:f16` and record evidence in `.specify/specs/016-channels-core/quickstart.md`
- [x] T043 Run `/speckit-analyze` for F16 and remediate material findings
- [x] T044 Run code review and security review for the F16 package and document/remediate findings
- [x] T045 Update `.specify/roadmap.md` to mark F16 implementation status, quickstart evidence, and next Stage 6 work after PR/merge
- [ ] T046 Commit F16 implementation, push branch `016-channels-core`, open PR, verify checks/mergeability, and follow through to merge or conflict resolution

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup completion and blocks user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational and is the MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational; can start after or alongside US1 once primitives stabilize, but final boundary tests depend on exported message types.
- **User Story 3 (Phase 5)**: Depends on Foundational; can run after content intent primitives exist.
- **Polish (Phase 6)**: Depends on desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Required first for the stable `ChannelMessage` envelope.
- **User Story 2 (P2)**: Builds on the envelope and validates adapter boundaries.
- **User Story 3 (P3)**: Builds on content/intent primitives and validates product-scope guardrails.

### Parallel Opportunities

- T002, T003, and T005 can proceed in parallel after T001.
- T007, T008, T010, and T012 can proceed in parallel after T006 is drafted.
- Tests T013-T015, T020-T023, and T031-T033 can be written in parallel by story.
- Implementation tasks in US2 can split by adapter, capability, delivery, error, conformance, and audit modules.

## Parallel Example: User Story 2

```text
Task: "Add adapter interface and fake-adapter conformance tests in packages/channels-core/src/__tests__/adapter.test.ts"
Task: "Add capability profile tests for rich realtime, async threaded email, and plain-text fallback in packages/channels-core/src/__tests__/conformance.test.ts"
Task: "Add delivery outcome and reason-code tests in packages/channels-core/src/__tests__/delivery.test.ts"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete setup and foundational primitives.
2. Implement `ChannelMessage`, content parts, intent families, and fixtures.
3. Verify Telegram/email/web-chat canonical fixtures independently.

### Incremental Delivery

1. Deliver US1 stable envelope.
2. Add US2 adapter/capability/delivery/audit conformance.
3. Add US3 product-scope guardrails and degradation helpers.
4. Run full package gates and staged dev run.

### Review Strategy

Complete `/speckit-analyze`, code review, and security review before publishing the PR. Treat privacy-boundary and unsupported-intent findings as blocking.
