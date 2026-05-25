# Tasks: Conversational Onboarding and Seeker Product Flows

**Input**: Design documents from `.specify/specs/020-seeker-conversational-flows/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`

**Tests**: Required by the feature specification independent-test sections and success criteria.

**Organization**: Tasks are grouped by user story so each flow family can be implemented and verified independently.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the package and wire it into the workspace without adding product behavior.

- [x] T001 Create `packages/seeker-flows/` package structure with `src/`, `src/__tests__/`, `scripts/`, `package.json`, `tsconfig.json`, `jest.config.js`, and `eslint.config.js`
- [x] T002 Add `@spyglass/seeker-flows` workspace dependencies and package scripts in `packages/seeker-flows/package.json`
- [x] T003 [P] Add public package README with F20 scope and out-of-scope boundaries in `packages/seeker-flows/README.md`
- [x] T004 [P] Add staged dev-run script placeholder in `packages/seeker-flows/scripts/f20-staged-dev-run.ts`
- [x] T005 Export the new workspace package path through repository package discovery as needed in `pnpm-workspace.yaml`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared contracts, repositories, idempotency, audit, policy, and channel glue required before any user story.

**CRITICAL**: No user story work begins until this phase is complete.

- [x] T006 Add core product-flow types from `data-model.md` in `packages/seeker-flows/src/types.ts`
- [x] T007 [P] Add repository interface contracts for seeker state, profile drafts, thresholds, demographic consent, scheduled insights, and idempotency in `packages/seeker-flows/src/repo.ts`
- [x] T008 [P] Add channel dispatch and canonical `ChannelMessage` adapter glue in `packages/seeker-flows/src/channels.ts`
- [x] T009 [P] Add idempotency key builders and duplicate outcome types in `packages/seeker-flows/src/idempotency.ts`
- [x] T010 [P] Add audit event builders matching `seeker-flow-audit-event.schema.yaml` in `packages/seeker-flows/src/audit.ts`
- [x] T011 [P] Add policy helpers for verified channel posture, active ticket posture, jurisdiction posture, and counsel posture in `packages/seeker-flows/src/policy.ts`
- [x] T012 [P] Add outbound prompt builders and approved refusal prompt templates in `packages/seeker-flows/src/prompts.ts`
- [x] T013 Add root flow orchestrator dispatch skeleton in `packages/seeker-flows/src/flows.ts`
- [x] T014 Export public API from `packages/seeker-flows/src/index.ts`
- [x] T015 [P] Add in-memory test repositories and cross-channel fixture helpers in `packages/seeker-flows/src/__tests__/fixtures.ts`
- [x] T016 [P] Add contract schema validation tests for all F20 schemas in `packages/seeker-flows/src/__tests__/contracts.test.ts`
- [x] T017 [P] Add audit builder tests for required event types and reason codes in `packages/seeker-flows/src/__tests__/audit.test.ts`
- [x] T018 [P] Add policy helper tests for fail-closed authorization and counsel/jurisdiction posture in `packages/seeker-flows/src/__tests__/policy.test.ts`
- [x] T019 [P] Add duplicate suppression tests for inbound messages, scheduled prompts, and match notifications in `packages/seeker-flows/src/__tests__/idempotency.test.ts`

**Checkpoint**: Foundation compiles and tests fail only for unimplemented story handlers.

---

## Phase 3: User Story 1 - Complete Conversational Seeker Onboarding (Priority: P1) MVP

**Goal**: A seeker starts from Telegram, email, or web chat, verifies channel posture, completes required profile/resume, jurisdiction, and threshold steps, and reaches active seeker-ticket posture without a dashboard.

**Independent Test**: Send canonical inbound fixtures for new, returning, incomplete, paused, duplicate, malformed, and unsupported seekers across all three channels, then verify state transitions, prompts, audit events, and refusals.

### Tests for User Story 1

- [x] T020 [P] [US1] Add onboarding contract fixture tests for Telegram, email, and web chat in `packages/seeker-flows/src/__tests__/onboarding.test.ts`
- [x] T021 [P] [US1] Add profile/resume validation tests for bounded text, file refs, malformed input, unsupported attachments, and prompt-injection text in `packages/seeker-flows/src/__tests__/profile.test.ts`
- [x] T022 [P] [US1] Add threshold/preference validation tests for accepted, rejected, duplicate, and confirmation flows in `packages/seeker-flows/src/__tests__/thresholds.test.ts`
- [x] T023 [P] [US1] Add no-dashboard and unsupported-intent boundary tests for onboarding in `packages/seeker-flows/src/__tests__/boundary.test.ts`

### Implementation for User Story 1

- [x] T024 [P] [US1] Implement seeker ticket open/resume and onboarding state advancement in `packages/seeker-flows/src/onboarding.ts`
- [x] T025 [P] [US1] Implement resume import and conversational profile draft handling in `packages/seeker-flows/src/profile.ts`
- [x] T026 [P] [US1] Implement threshold and preference tuning handlers in `packages/seeker-flows/src/thresholds.ts`
- [x] T027 [US1] Integrate work-jurisdiction attestation and active-posture gate in `packages/seeker-flows/src/onboarding.ts`
- [x] T028 [US1] Integrate US1 handlers into root dispatch in `packages/seeker-flows/src/flows.ts`
- [x] T029 [US1] Add onboarding audit emission for profile, jurisdiction, threshold, duplicate, refusal, and delivery outcomes in `packages/seeker-flows/src/audit.ts`
- [x] T030 [US1] Add onboarding staged-run scenarios to `packages/seeker-flows/scripts/f20-staged-dev-run.ts`

**Checkpoint**: US1 independently opens/resumes exactly one seeker ticket and reaches active posture only after required profile, threshold, and jurisdiction inputs.

---

## Phase 4: User Story 2 - Handle Match Notifications and Dossier Review (Priority: P2)

**Goal**: A seeker receives approved channel-native match notifications, reviews privacy-filtered dossier summaries, records supported review actions, and is refused when asking for hidden or raw data.

**Independent Test**: Submit threshold-cleared, one-side-cleared, neither-cleared, inconclusive, stale, duplicate, and closed-ticket match events, then verify outbound notifications, review actions, and forbidden-data refusals.

### Tests for User Story 2

- [x] T031 [P] [US2] Add Telegram, email, and web-chat match notification tests for approved, stale, duplicate, closed, unauthorized, jurisdiction-blocked, and projection-missing events in `packages/seeker-flows/src/__tests__/match-notifications.test.ts`
- [x] T032 [P] [US2] Add Telegram, email, and web-chat dossier review tests for acknowledge, decline, human-follow-up, threshold-change, pause, resume, and withdraw actions in `packages/seeker-flows/src/__tests__/dossier-review.test.ts`
- [x] T033 [P] [US2] Add hidden-state, raw-dossier, transcript, scoring-internals, and direct-counterparty refusal tests in `packages/seeker-flows/src/__tests__/boundary.test.ts`
- [x] T034 [P] [US2] Add Parley boundary tests proving review actions do not mutate run internals in `packages/seeker-flows/src/__tests__/dossier-review.test.ts`

### Implementation for User Story 2

- [x] T035 [P] [US2] Implement match event validation and approved projection requirement in `packages/seeker-flows/src/match-notifications.ts`
- [x] T036 [P] [US2] Implement approved match notification prompt rendering in `packages/seeker-flows/src/prompts.ts`
- [x] T037 [P] [US2] Implement dossier review action handling in `packages/seeker-flows/src/dossier-review.ts`
- [x] T038 [P] [US2] Implement forbidden-data and dashboard-like intent classification in `packages/seeker-flows/src/flows.ts`
- [x] T039 [US2] Integrate US2 handlers into root dispatch in `packages/seeker-flows/src/flows.ts`
- [x] T040 [US2] Add match notification and dossier review audit evidence in `packages/seeker-flows/src/audit.ts`
- [x] T041 [US2] Add match notification and dossier review staged-run scenarios to `packages/seeker-flows/scripts/f20-staged-dev-run.ts`

**Checkpoint**: US2 sends seeker notifications only with approved projections and records supported review decisions without exposing hidden run state.

---

## Phase 5: User Story 3 - Maintain Ongoing Seeker Control and Insight (Priority: P3)

**Goal**: A seeker can pause, resume, withdraw, tune thresholds over time, receive approved aggregate insight reports, and manage optional demographic consent with segregated storage semantics.

**Independent Test**: Run scheduled insights, threshold check-ins, pause/resume/withdraw commands, demographic consent/decline/withdrawal events, no-match/starvation scenarios, and disabled counsel/jurisdiction posture across supported channels.

### Tests for User Story 3

- [x] T042 [P] [US3] Add Telegram, email, and web-chat pause/resume/withdraw authorization and state-transition tests in `packages/seeker-flows/src/__tests__/controls.test.ts`
- [x] T043 [P] [US3] Add Telegram, email, and web-chat aggregate insight and threshold check-in tests for active, paused, withdrawn, duplicate, and no-match seekers in `packages/seeker-flows/src/__tests__/aggregate-insights.test.ts`
- [x] T044 [P] [US3] Add demographic consent, decline, withdrawal, duplicate, ambiguous, counsel-disabled, jurisdiction-disabled, and operational-profile separation tests in `packages/seeker-flows/src/__tests__/demographics.test.ts`
- [x] T045 [P] [US3] Add aggregate-report no-dashboard/no-raw-record boundary tests in `packages/seeker-flows/src/__tests__/boundary.test.ts`

### Implementation for User Story 3

- [x] T046 [P] [US3] Implement pause, resume, and withdraw handlers with guardrails in `packages/seeker-flows/src/controls.ts`
- [x] T047 [P] [US3] Implement aggregate insight report and threshold check-in generation from approved aggregate inputs in `packages/seeker-flows/src/aggregate-insights.ts`
- [x] T048 [P] [US3] Implement demographic consent, decline, withdrawal, counsel-disabled, jurisdiction-disabled, and segregated-data reference handling in `packages/seeker-flows/src/demographics.ts`
- [x] T049 [US3] Integrate US3 handlers into root dispatch in `packages/seeker-flows/src/flows.ts`
- [x] T050 [US3] Add ongoing control, aggregate insight, and demographic consent audit evidence in `packages/seeker-flows/src/audit.ts`
- [x] T051 [US3] Add US3 staged-run scenarios to `packages/seeker-flows/scripts/f20-staged-dev-run.ts`

**Checkpoint**: US3 independently supports controls, aggregate insight, and demographic consent posture without blocking core matching on demographic decline.

---

## Phase 6: Package Verification and Staged Evidence

**Purpose**: Prove the full F20 package works across all supported flow families and channels.

- [x] T052 Add staged dev-run assertions for duplicate suppression and unsupported-intent refusals across all flow families in `packages/seeker-flows/scripts/f20-staged-dev-run.ts`
- [x] T053 Add Jest coverage for staged dev-run output in `packages/seeker-flows/src/__tests__/staged-dev-run.test.ts`
- [x] T054 Run `pnpm --filter @spyglass/seeker-flows test` and record evidence in `.specify/specs/020-seeker-conversational-flows/quickstart.md`
- [x] T055 Run `pnpm --filter @spyglass/seeker-flows type-check` and record evidence in `.specify/specs/020-seeker-conversational-flows/quickstart.md`
- [x] T056 Run `pnpm --filter @spyglass/seeker-flows lint` and record evidence in `.specify/specs/020-seeker-conversational-flows/quickstart.md`
- [x] T057 Run `pnpm --filter @spyglass/seeker-flows dev-run:f20` and record scenario evidence in `.specify/specs/020-seeker-conversational-flows/quickstart.md`
- [x] T058 Run `pnpm type-check` and record workspace evidence in `.specify/specs/020-seeker-conversational-flows/quickstart.md`
- [x] T059 Run `pnpm lint` and record workspace evidence in `.specify/specs/020-seeker-conversational-flows/quickstart.md`
- [x] T060 Run `pnpm test` and record workspace evidence in `.specify/specs/020-seeker-conversational-flows/quickstart.md`

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, review, roadmap, and PR readiness.

- [x] T061 [P] Update `packages/seeker-flows/README.md` with supported flows, public API, fixtures, and out-of-scope boundaries
- [x] T062 [P] Add `/speckit-analyze` report for spec/plan/tasks consistency in `.specify/specs/020-seeker-conversational-flows/analysis.md`
- [x] T063 [P] Add code review notes in `.specify/specs/020-seeker-conversational-flows/reviews/code-review.md`
- [x] T064 [P] Add security/privacy review notes in `.specify/specs/020-seeker-conversational-flows/reviews/security-privacy-review.md`
- [x] T065 Add outbound prompt/action accessibility review notes for WCAG-facing semantics in `.specify/specs/020-seeker-conversational-flows/reviews/security-privacy-review.md`
- [x] T066 Update `.specify/roadmap.md` with F20 implementation status, quickstart evidence, and next-step guidance
- [x] T067 Review final F20 diff including `.specify/specs/020-seeker-conversational-flows/tasks.md`, commit, push, open PR, and verify checks/mergeability

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: No dependencies.
- **Phase 2 Foundational**: Depends on Phase 1 and blocks all user stories.
- **US1 Onboarding**: Depends on Phase 2 and is MVP.
- **US2 Match Notifications and Dossier Review**: Depends on Phase 2; may reuse active ticket fixtures from US1 but must remain testable with fakes.
- **US3 Controls, Insights, and Demographics**: Depends on Phase 2; may reuse ticket/profile helpers but must remain testable independently.
- **Phase 6 Verification**: Depends on all implemented stories selected for the PR.
- **Phase 7 Polish**: Depends on verification evidence.

### User Story Dependencies

- **US1 (P1)**: First delivery target; required for active seeker posture.
- **US2 (P2)**: Can start after foundation with seeded active seeker fixtures; product value increases after US1.
- **US3 (P3)**: Can start after foundation with seeded active/paused/withdrawn fixtures; finalizes ongoing control and insight.

### Parallel Opportunities

- T003-T004 can run in parallel after package directory creation.
- T007-T012 and T015-T019 can run in parallel once core types are sketched.
- US1 tests T020-T023 can be written in parallel before implementation.
- US2 tests T031-T034 can be written in parallel before implementation.
- US3 tests T042-T045 can be written in parallel before implementation.
- Implementation files for onboarding/profile/thresholds, match/dossier/refusal, and controls/insights/demographics can proceed in parallel after foundation if merge coordination is handled in `flows.ts` and `audit.ts`.

---

## Parallel Example: User Story 1

```bash
Task: "Add onboarding contract fixture tests for Telegram, email, and web chat in packages/seeker-flows/src/__tests__/onboarding.test.ts"
Task: "Add profile/resume validation tests for bounded text, file refs, malformed input, unsupported attachments, and prompt-injection text in packages/seeker-flows/src/__tests__/profile.test.ts"
Task: "Add threshold/preference validation tests for accepted, rejected, duplicate, and confirmation flows in packages/seeker-flows/src/__tests__/thresholds.test.ts"
Task: "Add no-dashboard and unsupported-intent boundary tests for onboarding in packages/seeker-flows/src/__tests__/boundary.test.ts"
```

## Parallel Example: User Story 2

```bash
Task: "Implement match event validation and approved projection requirement in packages/seeker-flows/src/match-notifications.ts"
Task: "Implement approved match notification prompt rendering in packages/seeker-flows/src/prompts.ts"
Task: "Implement dossier review action handling in packages/seeker-flows/src/dossier-review.ts"
```

## Parallel Example: User Story 3

```bash
Task: "Implement pause, resume, and withdraw handlers with guardrails in packages/seeker-flows/src/controls.ts"
Task: "Implement aggregate insight report and threshold check-in generation from approved aggregate inputs in packages/seeker-flows/src/aggregate-insights.ts"
Task: "Implement demographic consent, decline, withdrawal, counsel-disabled, jurisdiction-disabled, and segregated-data reference handling in packages/seeker-flows/src/demographics.ts"
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1 setup.
2. Complete Phase 2 foundation.
3. Complete US1 onboarding.
4. Validate US1 with `pnpm --filter @spyglass/seeker-flows test -- onboarding profile thresholds boundary`.
5. Continue to US2 and US3 only after active seeker posture is proven.

### Incremental Delivery

1. Foundation creates typed orchestration seams and fakes.
2. US1 delivers active seeker onboarding.
3. US2 adds approved match notifications and dossier review.
4. US3 adds ongoing controls, aggregate insight, and demographic posture.
5. Phase 6 verifies the whole staged flow across Telegram, email, and web chat.

### Review Strategy

1. Run `/speckit-analyze` before implementation changes are considered complete.
2. Keep channel adapters thin; do not move product logic into F17-F19 packages.
3. Treat privacy, Parley boundary, demographic segregation, and no-dashboard checks as review-blocking.
4. Complete code/security review artifacts before T067 PR publication.
