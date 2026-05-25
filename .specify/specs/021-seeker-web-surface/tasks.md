# Tasks: Seeker Web Surface

**Input**: Design documents from `.specify/specs/021-seeker-web-surface/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`

**Tests**: Required by the feature specification independent-test sections and success criteria.

**Organization**: Tasks are grouped by user story so landing, public docs, and A2A discovery can be implemented and verified independently.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Point the repo at F21 and prepare shared content/test scaffolding.

- [x] T001 Update `.specify/feature.json` to point at `.specify/specs/021-seeker-web-surface`
- [x] T002 Update `AGENTS.md` to point at `.specify/specs/021-seeker-web-surface/plan.md`
- [x] T003 [P] Add F21 test fixture directory in `apps/web/src/seeker-web/__tests__/`
- [x] T004 [P] Add F21 public content module scaffold in `apps/web/src/seeker-web/landing-content.ts`
- [x] T005 [P] Add F21 no-dashboard guard module scaffold in `apps/web/src/seeker-web/no-dashboard-guard.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared typed card data, public route helpers, and guardrails required before user stories.

**CRITICAL**: No user story work begins until this phase is complete.

- [x] T006 Add A2A card/index types and candidate card constants in `packages/a2a/src/index.ts`
- [x] T007 [P] Add A2A card route helper functions in `apps/web/src/seeker-web/a2a-card-routes.ts`
- [x] T008 [P] Add web-facing A2A card exports in `apps/web/src/seeker-web/a2a-cards.ts`
- [x] T009 [P] Add no-dashboard prohibited path and prohibited term constants in `apps/web/src/seeker-web/no-dashboard-guard.ts`
- [x] T010 [P] Add A2A card/index contract tests in `apps/web/src/seeker-web/__tests__/a2a-cards.test.ts`
- [x] T011 [P] Add no-dashboard guard tests in `apps/web/src/seeker-web/__tests__/no-dashboard-guard.test.ts`
- [x] T012 Export any new public A2A helpers from `packages/a2a/src/index.ts`

**Checkpoint**: Shared card data and guard contracts compile and fail only where story surfaces are not implemented.

---

## Phase 3: User Story 1 - Understand Spyglass and Start Account Setup (Priority: P1) MVP

**Goal**: A seeker can understand Spyglass, start account setup, and reach Clerk account/profile entry points without dashboard-like navigation.

**Independent Test**: Render the landing page at desktop and mobile widths, check primary calls to action, verify Clerk entry links, and prove prohibited dashboard-like navigation does not exist.

### Tests for User Story 1

- [x] T013 [P] [US1] Add landing content tests for positioning, channel paths, and Clerk entry links in `apps/web/src/seeker-web/__tests__/landing-content.test.ts`
- [x] T014 [P] [US1] Add landing render tests for headings, landmarks, links, and no-dashboard navigation in `apps/web/src/seeker-web/__tests__/landing-page.test.tsx`
- [x] T015 [P] [US1] Add responsive/accessibility smoke tests for landing text, focusable links, and semantic sections in `apps/web/src/seeker-web/__tests__/landing-page.test.tsx`

### Implementation for User Story 1

- [x] T016 [P] [US1] Implement landing content constants in `apps/web/src/seeker-web/landing-content.ts`
- [x] T017 [US1] Replace scaffold home page with the F21 seeker landing surface in `apps/web/app/page.tsx`
- [x] T018 [US1] Add seeker signup/login/profile entry links using existing Clerk routes and a Clerk-backed profile/account target in `apps/web/app/page.tsx`
- [x] T019 [US1] Add public docs and A2A discovery links to the landing surface in `apps/web/app/page.tsx`
- [x] T020 [US1] Add no-dashboard not-found behavior for prohibited seeker paths in `apps/web/app/not-found.tsx`
- [x] T021 [US1] Add public landing cache/privacy/no-auth assertions in `apps/web/src/seeker-web/__tests__/landing-page.test.tsx`

**Checkpoint**: US1 independently renders the public seeker landing surface and exposes no prohibited product UI.

---

## Phase 4: User Story 2 - Publish Agent-Readable Site Instructions (Priority: P2)

**Goal**: Agents and LLM crawlers can fetch public instructions that describe onboarding paths, A2A card locations, unsupported actions, and public-surface boundaries.

**Independent Test**: Fetch `/agents.md` and `/llms.txt`, check required sections and links, and verify they do not advertise unsupported seeker APIs or dashboards.

### Tests for User Story 2

- [x] T022 [P] [US2] Add `/agents.md` content tests for required sections and unsupported actions in `apps/web/src/seeker-web/__tests__/public-docs.test.ts`
- [x] T023 [P] [US2] Add `/llms.txt` content tests for site summary, public paths, disallowed use, and A2A pointers in `apps/web/src/seeker-web/__tests__/public-docs.test.ts`
- [x] T024 [P] [US2] Add public-doc no-dashboard/no-runtime-A2A claim tests in `apps/web/src/seeker-web/__tests__/public-docs.test.ts`
- [x] T025 [P] [US2] Add public-doc cache/privacy/no-auth tests for `/agents.md` and `/llms.txt` in `apps/web/src/seeker-web/__tests__/public-docs.test.ts`

### Implementation for User Story 2

- [x] T026 [US2] Replace placeholder `apps/web/public/agents.md` with F21 agent-readable instructions
- [x] T027 [US2] Replace placeholder `apps/web/public/llms.txt` with F21 LLM-readable site instructions
- [x] T028 [US2] Add public-doc links and source-of-truth references matching `public-docs.contract.md` in `apps/web/public/agents.md`
- [x] T029 [US2] Add explicit disallowed scraping/model-training and unsupported-product-surface statements in `apps/web/public/llms.txt`

**Checkpoint**: US2 independently publishes agent-readable docs with stable boundary language.

---

## Phase 5: User Story 3 - Publish A2A Discovery Cards (Priority: P3)

**Goal**: External agents can discover the five v0 candidate A2A cards and understand discovery-only/runtime-deferred capability status.

**Independent Test**: Fetch the card index and each individual card, validate shape, check capability metadata, and confirm no card implies unsupported runtime behavior is live.

### Tests for User Story 3

- [x] T030 [P] [US3] Add card index route tests for all five card IDs and stable URLs in `apps/web/src/seeker-web/__tests__/a2a-card-routes.test.ts`
- [x] T031 [P] [US3] Add individual card route tests for `seeker-intake` and `dossier-reader` in `apps/web/src/seeker-web/__tests__/a2a-card-routes.test.ts`
- [x] T032 [P] [US3] Add individual card route tests for `employer-intake`, `match-coordinator`, and `negotiation-participant` in `apps/web/src/seeker-web/__tests__/a2a-card-routes.test.ts`
- [x] T033 [P] [US3] Add unknown-card fail-closed route tests in `apps/web/src/seeker-web/__tests__/a2a-card-routes.test.ts`

### Implementation for User Story 3

- [x] T034 [P] [US3] Implement `/.well-known/a2a/index.json` route handler in `apps/web/app/.well-known/a2a/index.json/route.ts`
- [x] T035 [P] [US3] Implement concrete `/.well-known/a2a/{card}.json` route handlers in `apps/web/app/.well-known/a2a/*/route.ts`
- [x] T036 [US3] Add cache and content-type headers for A2A discovery responses in `apps/web/src/seeker-web/a2a-card-routes.ts`
- [x] T037 [US3] Add F21 A2A discovery links to `/agents.md` and landing page in `apps/web/public/agents.md` and `apps/web/app/page.tsx`

**Checkpoint**: US3 independently publishes validated A2A discovery cards without runtime protocol claims.

---

## Phase 6: Verification and Evidence

**Purpose**: Prove F21 works across public web, docs, and A2A discovery surfaces.

- [x] T038 Run `pnpm --filter @spyglass/web test` and record evidence in `.specify/specs/021-seeker-web-surface/quickstart.md`
- [x] T039 Run `pnpm --filter @spyglass/web type-check` and record evidence in `.specify/specs/021-seeker-web-surface/quickstart.md`
- [x] T040 Run `pnpm --filter @spyglass/web lint` and record evidence in `.specify/specs/021-seeker-web-surface/quickstart.md`
- [x] T041 Run `pnpm --filter @spyglass/web build` and record evidence in `.specify/specs/021-seeker-web-surface/quickstart.md`
- [x] T042 Run `pnpm --filter @spyglass/a2a test` and record evidence in `.specify/specs/021-seeker-web-surface/quickstart.md`
- [x] T043 Run `pnpm --filter @spyglass/a2a type-check` and record evidence in `.specify/specs/021-seeker-web-surface/quickstart.md`
- [x] T044 Run `pnpm type-check` and record workspace evidence in `.specify/specs/021-seeker-web-surface/quickstart.md`
- [x] T045 Run `pnpm lint` and record workspace evidence in `.specify/specs/021-seeker-web-surface/quickstart.md`
- [x] T046 Run `pnpm test` and record workspace evidence in `.specify/specs/021-seeker-web-surface/quickstart.md`
- [x] T047 Run browser/responsive validation for landing, public docs, and A2A card routes and record evidence in `.specify/specs/021-seeker-web-surface/quickstart.md`

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Spec consistency, review, roadmap, and PR readiness.

- [x] T048 [P] Add `/speckit-analyze` report for spec/plan/tasks consistency in `.specify/specs/021-seeker-web-surface/analysis.md`
- [x] T049 [P] Add code review notes in `.specify/specs/021-seeker-web-surface/reviews/code-review.md`
- [x] T050 [P] Add security/accessibility review notes in `.specify/specs/021-seeker-web-surface/reviews/security-accessibility-review.md`
- [x] T051 Update `.specify/roadmap.md` with F21 active status and next-step guidance
- [ ] T052 Review final F21 diff including `.specify/specs/021-seeker-web-surface/tasks.md`, commit, push, open PR, and verify checks/mergeability

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: No dependencies.
- **Phase 2 Foundational**: Depends on Phase 1 and blocks all user stories.
- **US1 Landing**: Depends on Phase 2 and is MVP.
- **US2 Public Docs**: Depends on Phase 2; can start after shared boundary language is stable.
- **US3 A2A Cards**: Depends on Phase 2; can start after card constants/types exist.
- **Phase 6 Verification**: Depends on all implemented stories selected for the PR.
- **Phase 7 Polish**: Depends on verification evidence.

### User Story Dependencies

- **US1 (P1)**: First delivery target; proves the human web surface and no-dashboard boundary.
- **US2 (P2)**: Can proceed after foundation; public docs should align with US1 links.
- **US3 (P3)**: Can proceed after foundation; A2A links should be reflected in US2 docs and US1 landing.

### Parallel Opportunities

- T003-T005 can run in parallel after active pointers are updated.
- T007-T011 can run in parallel after A2A card constants are sketched.
- US1 tests T013-T015 can be written in parallel before implementation.
- US2 tests T022-T025 can be written in parallel before documentation replacement.
- US3 tests T030-T033 can be written in parallel before route handler implementation.
- US2 and US3 implementation can proceed in parallel after shared A2A constants are available, with coordination on landing/doc links.

---

## Parallel Example: User Story 1

```bash
Task: "Add landing content tests for positioning, channel paths, and Clerk entry links in apps/web/src/seeker-web/__tests__/landing-content.test.ts"
Task: "Add landing render tests for headings, landmarks, links, and no-dashboard navigation in apps/web/src/seeker-web/__tests__/landing-page.test.tsx"
Task: "Implement landing content constants in apps/web/src/seeker-web/landing-content.ts"
```

## Parallel Example: User Story 2

```bash
Task: "Add /agents.md content tests for required sections and unsupported actions in apps/web/src/seeker-web/__tests__/public-docs.test.ts"
Task: "Add /llms.txt content tests for site summary, public paths, disallowed use, and A2A pointers in apps/web/src/seeker-web/__tests__/public-docs.test.ts"
Task: "Replace placeholder apps/web/public/agents.md with F21 agent-readable instructions"
```

## Parallel Example: User Story 3

```bash
Task: "Add card index route tests for all five card IDs and stable URLs in apps/web/src/seeker-web/__tests__/a2a-card-routes.test.ts"
Task: "Implement /.well-known/a2a/index.json route handler in apps/web/app/.well-known/a2a/index.json/route.ts"
Task: "Implement /.well-known/a2a/[card].json route handler in apps/web/app/.well-known/a2a/[card].json/route.ts"
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1 setup.
2. Complete Phase 2 foundation.
3. Complete US1 landing surface and no-dashboard guards.
4. Validate US1 independently with focused web tests.
5. Add public docs and A2A discovery cards.

### Incremental Delivery

1. Foundation creates reusable A2A card data and no-dashboard guardrails.
2. US1 delivers the human landing/account entry surface.
3. US2 replaces agent-readable docs.
4. US3 publishes card index and individual cards.
5. Phase 6 verifies the full public web/discovery surface.

### Review Strategy

1. Run `/speckit-analyze` before implementation is considered complete.
2. Treat dashboard drift, A2A over-promise, privacy leakage, and accessibility regressions as review-blocking.
3. Complete code and security/accessibility review artifacts before T052 PR publication.
