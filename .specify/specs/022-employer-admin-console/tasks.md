# Tasks: Employer Admin Console

**Input**: Design documents from `.specify/specs/022-employer-admin-console/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`

**Tests**: Required by the feature specification independent-test sections and success criteria.

**Organization**: Tasks are grouped by user story so profile, req management, candidate inbox, and accessibility/access control can be implemented and verified independently.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Point the repo at F22 and prepare shared employer-console scaffolding.

- [x] T001 Update `.specify/feature.json` to point at `.specify/specs/022-employer-admin-console`
- [x] T002 Update `AGENTS.md` to point at `.specify/specs/022-employer-admin-console/plan.md`
- [x] T003 [P] Add F22 test fixture directory in `apps/web/src/employer-console/__tests__/`
- [x] T004 [P] Add employer-console module scaffolds in `apps/web/src/employer-console/`
- [x] T005 [P] Add employer console route-group placeholders under `apps/web/app/(employer)/employer/console/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared org-scoped guards, parsers, persistence, and layout primitives required before user stories.

**CRITICAL**: No user story work begins until this phase is complete.

- [x] T006 Add employer-console principal/session helpers in `apps/web/src/employer-console/session.ts` for employer org and admin/member capability checks, with AAL2 enforced by `apps/web/proxy.ts`
- [x] T007 [P] Add employer-console constants and capability types in `apps/web/src/employer-console/types.ts`
- [x] T008 [P] Add employer-console parse utilities for profile, req, close, and pagination forms in `apps/web/src/employer-console/parsers.ts`
- [x] T009 Add `employer_organization_profiles` schema and migration for F22 profile fields in `packages/db/src/schema/`, unless an existing durable profile table already satisfies the contract without mutating Clerk-mirror `organizations` rows
- [x] T010 Add employer req fields required by F22, including `decision_locus_jurisdiction` and `threshold`, to schema/repo/action types where absent
- [x] T011 [P] Add org-scoped console read repository in `apps/web/src/employer-console/repos.ts`
- [x] T012 [P] Add shared console layout/view primitives in `apps/web/src/employer-console/employer-console-layout.tsx`
- [x] T013 [P] Add parser and session helper tests in `apps/web/src/employer-console/__tests__/`
- [x] T014 Wire `apps/web/app/(employer)/layout.tsx` and `apps/web/app/(employer)/employer/console/layout.tsx` to the F22 layout, skip link, nav, and auth boundary

**Checkpoint**: Shared F22 helpers compile and fail only where story surfaces are not implemented.

---

## Phase 3: User Story 1 - Manage Employer Organization Profile (Priority: P1) MVP

**Goal**: An employer admin can verify active organization context and view/update matching-relevant company profile fields.

**Independent Test**: Render the employer console as an employer admin with AAL2 satisfied, update allowed company-profile fields, and confirm non-admin or wrong-organization principals cannot view or mutate the profile.

### Tests for User Story 1

- [x] T015 [P] [US1] Add profile parser/action tests for required fields, org scoping, and non-enumerating errors in `apps/web/src/employer-console/__tests__/profile-action.test.ts`
- [x] T016 [P] [US1] Add profile view tests for organization context, empty state, success state, labels, and error summary in `apps/web/src/employer-console/__tests__/profile-view.test.tsx`
- [x] T017 [P] [US1] Add profile authorization tests for employer admin, employer member, seeker, no-org, and below-AAL2 principals in `apps/web/src/employer-console/__tests__/session.test.ts`

### Implementation for User Story 1

- [x] T018 [US1] Implement profile repository reads/upserts and audit emission in `apps/web/src/employer-console/profile-repo.ts`
- [x] T019 [US1] Implement `saveEmployerProfile` server action with `getPrincipal()`/typed principal coverage in `apps/web/src/employer-console/employer-profile-action.ts`
- [x] T020 [P] [US1] Implement profile view component in `apps/web/src/employer-console/employer-profile-view.tsx`
- [x] T021 [US1] Implement `/employer/console` and `/employer/console/profile` pages in `apps/web/app/(employer)/employer/console/`
- [x] T022 [US1] Ensure employer members have read-only or denied profile mutation behavior matching the capability contract

**Checkpoint**: US1 independently proves organization-scoped profile management and console entry.

---

## Phase 4: User Story 2 - Create and Manage Requisitions (Priority: P1)

**Goal**: An employer admin can create req tickets, set threshold and jurisdiction fields, list organization reqs, amend allowed fields, and close reqs.

**Independent Test**: Submit a req as an employer admin, verify org-scoped persistence/listing, edit allowed source fields, and close as filled or canceled. Canceled maps to internal `closed` with a cancellation reason.

### Tests for User Story 2

- [x] T023 [P] [US2] Add req parser tests for role, compensation, work mode, headcount, threshold, jurisdictions, and decision locus in `apps/web/src/employer-console/__tests__/parsers.test.ts`
- [x] T024 [P] [US2] Add req create/action tests for org scoping, admin-only mutation, state-machine use, and non-enumerating errors in `apps/web/src/employer-console/__tests__/req-actions.test.ts`
- [x] T025 [P] [US2] Add req list/detail view tests for state, headcount, jurisdictions, next actions, bounded page size, labels, captions, and empty states in `apps/web/src/employer-console/__tests__/req-views.test.tsx`
- [x] T026 [P] [US2] Add req amend/close tests for audited source updates, `filled`/`closed` terminal reasons, canceled-to-`closed` mapping, terminal-state rejection, and wrong-org denial in `apps/web/src/employer-console/__tests__/req-actions.test.ts`

### Implementation for User Story 2

- [x] T027 [US2] Extend employer ticket parsing/action types to include F22 `threshold` and `decision_locus_jurisdiction` inputs
- [x] T028 [US2] Extend employer req repositories to support org-scoped list/detail reads and any required F22 field persistence
- [x] T029 [P] [US2] Implement req form/list/detail components in `apps/web/src/employer-console/req-form.tsx`, `req-list-view.tsx`, and `req-detail-view.tsx`
- [x] T030 [US2] Implement create/amend/close req server actions with typed principal coverage in `apps/web/src/employer-console/req-actions.ts`
- [x] T031 [US2] Implement `/employer/console/reqs`, `/reqs/new`, `/reqs/[id]`, and `/reqs/[id]/close` pages under `apps/web/app/(employer)/employer/console/`
- [x] T032 [US2] Preserve existing jurisdiction-cascade and audit behavior when allowed source fields change

**Checkpoint**: US2 independently creates, lists, amends, and closes employer reqs from the console.

---

## Phase 5: User Story 3 - Review Candidate Inbox and Dossiers (Priority: P2)

**Goal**: An authorized employer user can review delivered candidate entries and approved signed dossier projections without seeing seeker-private internals.

**Independent Test**: Seed org-owned delivered matches with dossiers, render the inbox/detail, verify only owned delivered entries appear, and assert private transcript/run-state fields are absent.

### Tests for User Story 3

- [x] T033 [P] [US3] Add candidate inbox repository tests for org ownership, delivered-only filtering, bounded page size, pagination, and malformed cursors in `apps/web/src/employer-console/__tests__/candidate-views.test.tsx`
- [x] T034 [P] [US3] Add candidate inbox/detail view tests for req filters, delivery time, signature metadata, empty state, and invalid-signature warning in `apps/web/src/employer-console/__tests__/candidate-views.test.tsx`
- [x] T035 [P] [US3] Add privacy regression tests proving no raw transcript, hidden run state, private notes, or unapproved score internals render in candidate views
- [x] T036 [P] [US3] Add authorization tests for employer admin/member, wrong organization, seeker, no-org, and below-AAL2 principals

### Implementation for User Story 3

- [x] T037 [US3] Implement candidate inbox/detail read projections in `apps/web/src/employer-console/repos.ts`
- [x] T038 [P] [US3] Implement `candidate-inbox-view.tsx` with req/state filters, table semantics, pagination, and empty state
- [x] T039 [P] [US3] Implement `candidate-detail-view.tsx` with approved employer-side dossier projection and signed metadata state
- [x] T040 [US3] Implement `/employer/console/candidates` and `/candidates/[id]` pages under `apps/web/app/(employer)/employer/console/`
- [x] T041 [US3] Add explicit privacy allowlist for dossier fields rendered by employer candidate detail views

**Checkpoint**: US3 independently presents delivered candidate dossiers without leaking private negotiation internals.

---

## Phase 6: User Story 4 - Operate Accessibly and Safely (Priority: P2)

**Goal**: Employer users can operate the console with keyboard and assistive technology while mutating actions remain principal-gated and non-enumerating.

**Independent Test**: Run render/accessibility smoke tests for landmarks, forms, tables, dialogs, error summaries, and auth banners; verify all mutations require authenticated employer admin principals and AAL2.

### Tests for User Story 4

- [x] T042 [P] [US4] Add console layout accessibility tests for skip link, landmarks, nav, focus target, and page headings
- [x] T043 [P] [US4] Add form/table/dialog accessibility smoke tests for profile, req, close confirmation, inbox, and dossier detail views
- [x] T044 [P] [US4] Add principal-coverage regression assertions for every F22 route/action file touched by mutating behavior
- [x] T045 [P] [US4] Add non-enumerating error/banner tests for validation, authorization, missing org, no data, and signature unavailable states
- [x] T046 [P] [US4] Add prohibited-surface regression tests proving F22 does not introduce seeker dashboard routes, F23 API/webhook behavior, ATS connector controls, A2A runtime handlers, candidate disposition mutation, or anonymous mutating handlers

### Implementation for User Story 4

- [x] T047 [US4] Normalize F22 auth-denial, missing-org, validation, and success states in `apps/web/src/employer-console/feedback.tsx`
- [x] T048 [US4] Add confirmation dialog and keyboard-safe close flow for req terminal actions
- [x] T049 [US4] Ensure all F22 server actions and route handlers satisfy `scripts/check-principal-coverage.sh`
- [x] T050 [US4] Add accessibility evidence notes to `.specify/specs/022-employer-admin-console/quickstart.md`

**Checkpoint**: US4 independently proves accessibility and AAA guardrails across F22 surfaces.

---

## Phase 7: Verification and Evidence

**Purpose**: Prove F22 works across employer profile, req, candidate, security, and accessibility surfaces.

- [x] T051 Run `pnpm --filter @spyglass/web test -- --runInBand src/employer-console/__tests__` and record evidence in `.specify/specs/022-employer-admin-console/quickstart.md`
- [x] T052 Run `pnpm --filter @spyglass/web type-check` and record evidence in `.specify/specs/022-employer-admin-console/quickstart.md`
- [x] T053 Run `pnpm --filter @spyglass/web lint` and record evidence in `.specify/specs/022-employer-admin-console/quickstart.md`
- [x] T054 Run `pnpm --filter @spyglass/web build` and record evidence in `.specify/specs/022-employer-admin-console/quickstart.md`
- [x] T055 Run `bash scripts/check-principal-coverage.sh` and record evidence in `.specify/specs/022-employer-admin-console/quickstart.md`
- [x] T056 Run `pnpm type-check` and record workspace evidence in `.specify/specs/022-employer-admin-console/quickstart.md`
- [x] T057 Run `pnpm lint` and record workspace evidence in `.specify/specs/022-employer-admin-console/quickstart.md`
- [x] T058 Run `pnpm test` and record workspace evidence in `.specify/specs/022-employer-admin-console/quickstart.md`
- [x] T059 Run manual/browser validation where local Clerk employer config permits it and record evidence or blocker details in `.specify/specs/022-employer-admin-console/quickstart.md`

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Spec consistency, review, roadmap, and PR readiness.

- [x] T060 [P] Add `/speckit-analyze` report for spec/plan/tasks consistency in `.specify/specs/022-employer-admin-console/analysis.md`
- [x] T061 [P] Add STRIDE/LINDDUN threat model for F22 Article I/II controls in `.specify/specs/022-employer-admin-console/reviews/threat-model.md`
- [x] T062 [P] Add code review notes in `.specify/specs/022-employer-admin-console/reviews/code-review.md`
- [x] T063 [P] Run mandatory `/security-review` and record findings in `.specify/specs/022-employer-admin-console/reviews/security-review.md`
- [x] T064 [P] Add accessibility review notes in `.specify/specs/022-employer-admin-console/reviews/accessibility-review.md`
- [x] T065 Update `.specify/roadmap.md` with F22 active status and next-step guidance
- [x] T066 Review final F22 diff including `.specify/specs/022-employer-admin-console/tasks.md`, commit, push, open PR, and verify checks/mergeability

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: No dependencies.
- **Phase 2 Foundational**: Depends on Phase 1 and blocks all user stories.
- **US1 Profile**: Depends on Phase 2 and is MVP.
- **US2 Reqs**: Depends on Phase 2 and can proceed in parallel with US1 after shared parsers/session helpers exist, but profile context should be visible before manual validation.
- **US3 Candidate Inbox**: Depends on Phase 2 and any read projections needed from existing match/dossier repositories.
- **US4 Accessibility/Safety**: Depends on story surfaces, but tests can be drafted in parallel once view contracts are stable.
- **Phase 7 Verification**: Depends on all implemented stories selected for the PR.
- **Phase 8 Polish**: Depends on verification evidence.

### User Story Dependencies

- **US1 (P1)**: First delivery target; proves org context and profile mutation.
- **US2 (P1)**: Core employer admin workflow; should land with US1 for F22 MVP.
- **US3 (P2)**: Depends on match/dossier projections and may use seeded fixtures before live candidate delivery exists.
- **US4 (P2)**: Cross-cutting release gate for human UI and principal coverage.

### Parallel Opportunities

- T003-T005 can run in parallel after active pointers are updated.
- T007-T008 and T011-T013 can run in parallel after session helper shape is agreed.
- US1 tests T015-T017 can be written in parallel before implementation.
- US2 tests T023-T026 can be written in parallel before req action implementation.
- US3 tests T033-T036 can be written in parallel before candidate repository/view implementation.
- US4 tests T042-T046 can be drafted while story components are being implemented.

---

## Parallel Example: User Story 1

```bash
Task: "Add profile parser/action tests for required fields, org scoping, and non-enumerating errors in apps/web/src/employer-console/__tests__/profile-action.test.ts"
Task: "Add profile view tests for organization context, empty state, success state, labels, and error summary in apps/web/src/employer-console/__tests__/profile-view.test.tsx"
Task: "Implement profile view component in apps/web/src/employer-console/employer-profile-view.tsx"
```

## Parallel Example: User Story 2

```bash
Task: "Add req parser tests for role, compensation, work mode, headcount, threshold, jurisdictions, and decision locus in apps/web/src/employer-console/__tests__/req-parser.test.ts"
Task: "Implement req form/list/detail components in apps/web/src/employer-console/req-form.tsx, req-list-view.tsx, and req-detail-view.tsx"
Task: "Implement create/amend/close req server actions with typed principal coverage in apps/web/src/employer-console/req-actions.ts"
```

## Parallel Example: User Story 3

```bash
Task: "Add candidate inbox repository tests for org ownership, delivered-only filtering, bounded page size, pagination, and malformed cursors in apps/web/src/employer-console/__tests__/candidate-repo.test.ts"
Task: "Implement candidate inbox/detail read projections in apps/web/src/employer-console/candidate-repo.ts"
Task: "Implement candidate-detail-view.tsx with approved employer-side dossier projection and signed metadata state"
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1 setup.
2. Complete Phase 2 foundation.
3. Complete US1 profile and US2 req management.
4. Validate profile/req workflows independently with focused web tests.
5. Add candidate inbox/dossier views and cross-cutting accessibility/security evidence.

### Incremental Delivery

1. Foundation creates session guards, parsers, profile persistence, and org-scoped read helpers.
2. US1 delivers active-org profile management.
3. US2 delivers req create/list/amend/close.
4. US3 delivers candidate inbox and dossier detail projections.
5. US4 hardens accessibility, authorization, and non-enumerating feedback.
6. Phase 7 verifies the full employer console.

### Review Strategy

1. Run `/speckit-analyze` before implementation begins.
2. Treat cross-org leakage, below-AAL2 access, anonymous mutation, raw transcript exposure, missing threat-model coverage, and accessibility regressions as review-blocking.
3. Complete code, threat-model, `/security-review`, and accessibility review artifacts before T066 PR publication.
