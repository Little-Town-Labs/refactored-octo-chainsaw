# Tasks: Web-Chat Channel Adapter

**Input**: Design documents from `.specify/specs/019-web-chat-channel/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Tests are required because the specification defines conformance, duplicate, delivery/status, accessibility, boundary, and staged-run success criteria.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story the task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Package initialization and basic structure

- [x] T001 Create `packages/web-chat-channel/package.json` with package scripts and workspace dependencies
- [x] T002 Create `packages/web-chat-channel/tsconfig.json` extending the repo TypeScript package pattern
- [x] T003 Create `packages/web-chat-channel/jest.config.js` using the local Jest package pattern
- [x] T004 Create `packages/web-chat-channel/eslint.config.js` using the local package ESLint pattern
- [x] T005 [P] Create `packages/web-chat-channel/README.md` documenting package scope, boundaries, accessibility posture, and validation commands
- [x] T006 [P] Create source/test directories under `packages/web-chat-channel/src/`, `packages/web-chat-channel/src/__tests__/`, and `packages/web-chat-channel/scripts/`
- [x] T007 Create `packages/web-chat-channel/src/index.ts` export surface stub

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core types, constants, and boundaries that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T008 Define web-chat session, client event, channel-link, render, delivery/status, accessibility, and audit types in `packages/web-chat-channel/src/types.ts`
- [x] T009 Define web-chat adapter capability metadata in `packages/web-chat-channel/src/capabilities.ts`
- [x] T010 Define channel-neutral web-chat delivery/status mappings in `packages/web-chat-channel/src/delivery.ts`
- [x] T011 Define channel-link, participant posture, pending-verification, pause/withdraw, and session lookup interfaces in `packages/web-chat-channel/src/links.ts`
- [x] T012 Define session binding helpers and bounded Clerk principal references in `packages/web-chat-channel/src/session.ts`
- [x] T013 Define idempotency-store interface and web-chat retry key helpers in `packages/web-chat-channel/src/idempotency.ts`
- [x] T014 Define audit event builders for normalization, refusal, duplicate, render, status, accessibility validation, unsupported intent, and capability registration in `packages/web-chat-channel/src/audit.ts`
- [x] T015 [P] Add shared deterministic web-chat fixtures in `packages/web-chat-channel/src/__tests__/fixtures.ts`
- [x] T016 [P] Add contract-shape smoke tests for YAML contracts in `packages/web-chat-channel/src/__tests__/contracts.test.ts`
- [x] T017 Wire base `WebChatChannelAdapter` composition skeleton in `packages/web-chat-channel/src/adapter.ts`

**Checkpoint**: Foundation ready. User story implementation can now begin in priority order or in parallel.

---

## Phase 3: User Story 1 - Accept Authenticated Web-Chat Input (Priority: P1) MVP

**Goal**: Normalize authenticated or pending-link web-chat input into canonical channel messages and refuse unsafe or unauthorized events.

**Independent Test**: Submit client events for authenticated, pending-link, unauthenticated, expired-session, wrong-participant, duplicate, malformed, unsupported-action, expired-action, wrong-thread, and paused-seeker cases and verify canonical messages or structured refusals.

### Tests for User Story 1

- [x] T018 [P] [US1] Add authenticated inbound text normalization test in `packages/web-chat-channel/src/__tests__/adapter.test.ts`
- [x] T019 [P] [US1] Add pending-link verification and resume normalization tests in `packages/web-chat-channel/src/__tests__/links.test.ts`
- [x] T020 [P] [US1] Add unauthenticated, expired-session, unknown-principal, wrong-participant, disabled, paused, and withdrawn refusal tests in `packages/web-chat-channel/src/__tests__/session.test.ts`
- [x] T021 [P] [US1] Add duplicate client event and repeated action submission tests in `packages/web-chat-channel/src/__tests__/idempotency.test.ts`
- [x] T022 [P] [US1] Add expired-action, wrong-thread, malformed, over-size, empty, and unsupported attachment refusal tests in `packages/web-chat-channel/src/__tests__/adapter.test.ts`
- [x] T023 [P] [US1] Add unsupported pre-F20 command classification tests in `packages/web-chat-channel/src/__tests__/boundary.test.ts`

### Implementation for User Story 1

- [x] T024 [P] [US1] Implement session binding and expiry validation helpers in `packages/web-chat-channel/src/session.ts`
- [x] T025 [P] [US1] Implement web-chat idempotency key derivation in `packages/web-chat-channel/src/idempotency.ts`
- [x] T026 [US1] Implement inbound client-event classification in `packages/web-chat-channel/src/normalize.ts`
- [x] T027 [US1] Implement channel-link, participant, thread, pause, and withdrawal posture checks in `packages/web-chat-channel/src/normalize.ts`
- [x] T028 [US1] Implement pending verification and resume inbound handling in `packages/web-chat-channel/src/normalize.ts`
- [x] T029 [US1] Implement unauthenticated prompt/refusal, expired-session, wrong-participant, disabled, paused, malformed, over-size, expired-action, wrong-thread, and unsupported-event refusals in `packages/web-chat-channel/src/normalize.ts`
- [x] T030 [US1] Implement duplicate suppression flow in `packages/web-chat-channel/src/adapter.ts`
- [x] T031 [US1] Emit inbound normalization, refusal, duplicate, and unsupported-intent audit events in `packages/web-chat-channel/src/audit.ts`
- [x] T032 [US1] Export US1 adapter entry points from `packages/web-chat-channel/src/index.ts`

**Checkpoint**: User Story 1 is independently functional and testable.

---

## Phase 4: User Story 2 - Render Approved Web-Chat Responses (Priority: P2)

**Goal**: Render approved canonical outbound messages into safe web-chat render models and map render/client status outcomes channel-neutrally.

**Independent Test**: Render approved projection/system outbound messages, refuse missing or unapproved disclosure posture, refuse invalid targets, degrade rich content to approved fallback models, and map web-chat delivery/status signals.

### Tests for User Story 2

- [x] T033 [P] [US2] Add approved outbound text and system notice render tests in `packages/web-chat-channel/src/__tests__/render.test.ts`
- [x] T034 [P] [US2] Add missing/unapproved projection refusal tests in `packages/web-chat-channel/src/__tests__/render.test.ts`
- [x] T035 [P] [US2] Add invalid participant, closed-thread, expired-action, and unsafe metadata outbound refusal tests in `packages/web-chat-channel/src/__tests__/render.test.ts`
- [x] T036 [P] [US2] Add rich-card fallback, disabled action, and unsupported content render tests in `packages/web-chat-channel/src/__tests__/render.test.ts`
- [x] T037 [P] [US2] Add rendered, displayed, acknowledged, retryable, terminal, expired, cancelled, refused, unsupported, and duplicate status mapping tests in `packages/web-chat-channel/src/__tests__/delivery.test.ts`

### Implementation for User Story 2

- [x] T038 [P] [US2] Implement bounded text, status, fallback, and rich-card-summary render helpers in `packages/web-chat-channel/src/render.ts`
- [x] T039 [P] [US2] Implement stable action identity and disabled-control render helpers in `packages/web-chat-channel/src/render.ts`
- [x] T040 [US2] Implement approved projection/system-generated outbound posture checks in `packages/web-chat-channel/src/render.ts`
- [x] T041 [US2] Implement invalid participant, closed-thread, expired-action, and unsafe metadata outbound refusals in `packages/web-chat-channel/src/render.ts`
- [x] T042 [US2] Implement approved rich-content fallback rendering in `packages/web-chat-channel/src/render.ts`
- [x] T043 [US2] Implement web-chat delivery/status mapping in `packages/web-chat-channel/src/delivery.ts`
- [x] T044 [US2] Emit outbound render and delivery/status audit events in `packages/web-chat-channel/src/audit.ts`
- [x] T045 [US2] Integrate outbound render and delivery/status mapping through `packages/web-chat-channel/src/adapter.ts`

**Checkpoint**: User Stories 1 and 2 are independently functional and testable.

---

## Phase 5: User Story 3 - Preserve Web-Chat Adapter and Accessibility Boundaries (Priority: P3)

**Goal**: Prove the web-chat adapter conforms to F16, enforces the no-dashboard/product-execution boundary, and exposes WCAG 2.2 AA-facing semantics for the consuming web surface.

**Independent Test**: Run web-chat-specific conformance fixtures against channel-core and validate unsupported dashboard intents, prohibited data surfaces, keyboard/focus/status contract requirements, and unsafe action controls.

### Tests for User Story 3

- [x] T046 [P] [US3] Add F16 channel-core conformance tests for web-chat capabilities and canonical message shape in `packages/web-chat-channel/src/__tests__/boundary.test.ts`
- [x] T047 [P] [US3] Add prohibited data surface tests for raw counterparty records, transcripts, Parley state, scoring internals, unfiltered dossier internals, Clerk secrets, and web session tokens in `packages/web-chat-channel/src/__tests__/boundary.test.ts`
- [x] T048 [P] [US3] Add unsupported dashboard, ticket-list, analytics, recommended-jobs, and direct-negotiation intent tests in `packages/web-chat-channel/src/__tests__/boundary.test.ts`
- [x] T049 [P] [US3] Add accessibility contract tests for labels, keyboard activation, focus order, disabled controls, error/status announcements, and reduced-motion posture in `packages/web-chat-channel/src/__tests__/accessibility.test.ts`
- [x] T050 [P] [US3] Add capability declaration tests in `packages/web-chat-channel/src/__tests__/capabilities.test.ts`

### Implementation for User Story 3

- [x] T051 [US3] Implement web-chat adapter capability declaration in `packages/web-chat-channel/src/capabilities.ts`
- [x] T052 [US3] Implement accessibility contract validation helpers in `packages/web-chat-channel/src/accessibility.ts`
- [x] T053 [US3] Implement unsupported dashboard/direct-negotiation intent classification and safe downgrade/refusal behavior in `packages/web-chat-channel/src/normalize.ts`
- [x] T054 [US3] Harden public exports to expose only adapter, types, capability, render contract, accessibility contract, and provider-neutral helpers in `packages/web-chat-channel/src/index.ts`
- [x] T055 [US3] Add boundary notes, supported/unsupported content posture, and accessibility contract posture to `packages/web-chat-channel/README.md`

**Checkpoint**: All user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verification, evidence, reviews, roadmap updates, and publish readiness.

- [x] T056 Add staged dev-run script for F19 in `packages/web-chat-channel/scripts/f19-staged-dev-run.ts`
- [x] T057 Run `pnpm --filter @spyglass/web-chat-channel test` and fix failures
- [x] T058 Run `pnpm --filter @spyglass/web-chat-channel type-check` and fix failures
- [x] T059 Run `pnpm --filter @spyglass/web-chat-channel lint` and fix failures
- [x] T060 Run `pnpm --filter @spyglass/web-chat-channel build` and fix failures
- [x] T061 Run `pnpm --filter @spyglass/web-chat-channel dev-run:f19` and record evidence in `.specify/specs/019-web-chat-channel/quickstart-run-2026-05-23.md`
- [x] T062 Run `/speckit-analyze` and record results in `.specify/specs/019-web-chat-channel/analyze-report.md`
- [x] T063 Perform code review and record findings in `.specify/specs/019-web-chat-channel/code-review-t063.md`
- [x] T064 Perform security and accessibility review and record findings in `.specify/specs/019-web-chat-channel/security-accessibility-review-t064.md`
- [x] T065 Update `.specify/roadmap.md` with F19 implementation status and next-step guidance
- [x] T066 Review final diff, commit branch `019-web-chat-channel`, push, open PR, verify checks/mergeability, and follow through to merge

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

- **US1 Accept Authenticated Web-Chat Input**: Start after Foundational. No dependency on US2/US3.
- **US2 Render Approved Web-Chat Responses**: Start after Foundational. Uses shared types and link posture but not US1 execution.
- **US3 Preserve Web-Chat Adapter and Accessibility Boundaries**: Start after Foundational. Best completed after US1/US2 implementation exposes public surfaces.

### Parallel Opportunities

- T005 and T006 can run in parallel with core setup.
- T015 and T016 can run in parallel after source/test directories exist.
- US1 tests T018-T023 can be written in parallel.
- US2 tests T033-T037 can be written in parallel.
- US3 tests T046-T050 can be written in parallel.
- Implementation helpers touching `session.ts`, `idempotency.ts`, `render.ts`, `delivery.ts`, and `accessibility.ts` can be parallelized once shared types are stable.

---

## Parallel Example: User Story 1

```bash
Task: "Add authenticated inbound text normalization test in packages/web-chat-channel/src/__tests__/adapter.test.ts"
Task: "Add pending-link verification and resume normalization tests in packages/web-chat-channel/src/__tests__/links.test.ts"
Task: "Add duplicate client event and repeated action submission tests in packages/web-chat-channel/src/__tests__/idempotency.test.ts"
Task: "Add unauthenticated and expired-session refusal tests in packages/web-chat-channel/src/__tests__/session.test.ts"
```

## Parallel Example: User Story 2

```bash
Task: "Add approved outbound text and system notice render tests in packages/web-chat-channel/src/__tests__/render.test.ts"
Task: "Add rendered/displayed/acknowledged/failure status mapping tests in packages/web-chat-channel/src/__tests__/delivery.test.ts"
Task: "Implement bounded text and fallback render helpers in packages/web-chat-channel/src/render.ts"
Task: "Implement web-chat delivery/status mapping in packages/web-chat-channel/src/delivery.ts"
```

## Parallel Example: User Story 3

```bash
Task: "Add accessibility contract tests in packages/web-chat-channel/src/__tests__/accessibility.test.ts"
Task: "Add prohibited data surface tests in packages/web-chat-channel/src/__tests__/boundary.test.ts"
Task: "Implement accessibility contract validation helpers in packages/web-chat-channel/src/accessibility.ts"
Task: "Add capability declaration tests in packages/web-chat-channel/src/__tests__/capabilities.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 setup.
2. Complete Phase 2 foundation.
3. Write US1 tests and confirm they fail.
4. Implement US1 session binding, link posture, normalization/refusal, and duplicate behavior.
5. Validate US1 independently with package tests.

### Incremental Delivery

1. US1: authenticated inbound normalization, pending-link handling, refusal, and duplicate suppression.
2. US2: outbound render models and delivery/status reporting.
3. US3: conformance, no-dashboard boundary, and accessibility contract hardening.
4. Phase 6: full verification, analyze, review, roadmap, PR.

### Notes

- `[P]` tasks touch separate files or can be executed independently.
