# Tasks: F12 AI Infrastructure

**Input**: Design documents from `.specify/specs/012-ai-infrastructure/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, threat-model.md, contracts/, quickstart.md

**Tests**: Required. F12 is a constitutional Article I/I.C/II feature with explicit verification gates, contract schemas, direct-provider boundary checks, and staged quickstart evidence.

**Organization**: Tasks are grouped by user story so the governed invocation MVP can land first, then immutable publication, manifest freeze, and cost/supply-chain controls.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare F12 docs, package scripts, and shared AI package structure.

- [x] T001 Add F12 quickstart script command to `packages/ai/package.json`
- [x] T002 [P] Create F12 runbook skeleton in `docs/runbooks/ai-infrastructure.md`
- [x] T003 [P] Add AI package test fixture skeleton in `packages/ai/src/__tests__/fixtures.ts`
- [x] T004 [P] Create AI package module files from the plan in `packages/ai/src/types.ts`, `packages/ai/src/repo.ts`, `packages/ai/src/prompt-registry.ts`, `packages/ai/src/model-registry.ts`, `packages/ai/src/manifest.ts`, `packages/ai/src/prompt-renderer.ts`, `packages/ai/src/gateway.ts`, `packages/ai/src/invocation.ts`, `packages/ai/src/cost-controls.ts`, `packages/ai/src/review.ts`, and `packages/ai/src/import-boundary.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add the schema, shared types, contract tests, and verification boundaries every story depends on.

**Critical**: No user story work can begin until these tasks are complete.

- [x] T005 Create F12 Drizzle schema in `packages/db/src/schema/ai-infrastructure.ts`
- [x] T006 Wire F12 schema exports in `packages/db/src/schema/index.ts` and `packages/db/src/schema.ts`
- [x] T007 Add F12 migration and journal entry in `packages/db/migrations/0014_f12_ai_infrastructure.sql` and `packages/db/migrations/meta/_journal.json`
- [x] T008 Update schema convention coverage for F12 AI infrastructure tables in `scripts/check-schema-conventions.sh` and related governance docs
- [x] T009 Implement shared F12 domain types and reason codes in `packages/ai/src/types.ts`
- [x] T010 Implement in-memory repository primitives in `packages/ai/src/repo.ts`
- [x] T011 [P] Add JSON Schema contract tests for F12 contracts in `packages/ai/src/__tests__/contracts.test.ts`
- [x] T012 [P] Add direct provider import boundary tests in `packages/ai/src/__tests__/import-boundary.test.ts`
- [x] T013 Implement direct provider import scanner in `packages/ai/src/import-boundary.ts`
- [x] T014 Update `packages/ai/src/index.ts` to export F12 public surfaces only

**Checkpoint**: Schema, contracts, shared types, repo primitives, and boundary checks are ready.

---

## Phase 3: User Story 1 - Invoke Approved AI Models Through a Governed Gateway (Priority: P1) MVP

**Goal**: All model calls flow through one governed invocation surface with required refs, auditability, and bypass detection.

**Independent Test**: Request accepted and refused invocations with fake gateway fixtures and verify prompt/model/manifest refs, request/response hashes, usage metadata, cost evidence, reason codes, and audit refs.

### Tests for User Story 1

- [x] T015 [P] [US1] Add gateway adapter tests in `packages/ai/src/__tests__/gateway.test.ts`
- [x] T016 [P] [US1] Add invocation preflight/refusal tests in `packages/ai/src/__tests__/invocation.test.ts`
- [x] T017 [P] [US1] Add governed invocation audit evidence tests in `packages/ai/src/__tests__/invocation-audit.test.ts`

### Implementation for User Story 1

- [x] T018 [US1] Implement fake and typed gateway adapter boundary in `packages/ai/src/gateway.ts`
- [x] T019 [US1] Implement invocation request validation and required-ref refusal in `packages/ai/src/invocation.ts`
- [x] T020 [US1] Implement invocation record persistence and hash evidence in `packages/ai/src/invocation.ts`
- [x] T021 [US1] Integrate audit refs for invocation acceptance/refusal in `packages/ai/src/invocation.ts`
- [x] T022 [US1] Export governed invocation helpers from `packages/ai/src/index.ts`

**Checkpoint**: US1 MVP works independently with deterministic fake gateway invocations.

---

## Phase 4: User Story 2 - Publish Immutable Prompt and Model Versions (Priority: P1)

**Goal**: Prompt templates and model profiles publish as immutable signed versions with scoped review evidence.

**Independent Test**: Publish prompt/model versions, attempt mutation, supersede with new versions, and verify prior refs remain unchanged and reviewable.

### Tests for User Story 2

- [x] T023 [P] [US2] Add prompt publication tests in `packages/ai/src/__tests__/prompt-registry.test.ts`
- [x] T024 [P] [US2] Add model publication tests in `packages/ai/src/__tests__/model-registry.test.ts`
- [x] T025 [P] [US2] Add prompt/model scoped review tests in `packages/ai/src/__tests__/review.test.ts`

### Implementation for User Story 2

- [x] T026 [US2] Implement immutable prompt publication and status transitions in `packages/ai/src/prompt-registry.ts`
- [x] T027 [US2] Implement immutable model profile publication and status transitions in `packages/ai/src/model-registry.ts`
- [x] T028 [US2] Implement prompt/model mutation rejection in `packages/ai/src/prompt-registry.ts` and `packages/ai/src/model-registry.ts`
- [x] T029 [US2] Implement scoped prompt/model review reads in `packages/ai/src/review.ts`
- [x] T030 [US2] Export registry and review helpers from `packages/ai/src/index.ts`

**Checkpoint**: US2 works independently and can publish/review immutable prompt/model versions.

---

## Phase 5: User Story 3 - Freeze AI Runtime Manifests Per Deployment (Priority: P1)

**Goal**: Signed runtime manifests freeze prompt/model/caller/cost posture and enforce no hot reload.

**Independent Test**: Publish a manifest, dispatch/invoke under it, publish newer prompt/model versions, and verify prior invocation records keep original frozen refs.

### Tests for User Story 3

- [x] T031 [P] [US3] Add manifest publication and verification tests in `packages/ai/src/__tests__/manifest.test.ts`
- [x] T032 [P] [US3] Add no-hot-reload freeze tests in `packages/ai/src/__tests__/no-hot-reload.test.ts`
- [x] T033 [P] [US3] Add prompt rendering contract tests in `packages/ai/src/__tests__/prompt-renderer.test.ts`

### Implementation for User Story 3

- [x] T034 [US3] Implement manifest publication, hash verification, and active status checks in `packages/ai/src/manifest.ts`
- [x] T035 [US3] Implement dispatch-time manifest selection and frozen ref helpers in `packages/ai/src/manifest.ts`
- [x] T036 [US3] Implement prompt variable contract validation and sentinel preservation in `packages/ai/src/prompt-renderer.ts`
- [x] T037 [US3] Integrate manifest verification into invocation preflight in `packages/ai/src/invocation.ts`
- [x] T038 [US3] Export manifest and prompt rendering helpers from `packages/ai/src/index.ts`

**Checkpoint**: US3 works independently and proves signed no-hot-reload manifest posture.

---

## Phase 6: User Story 4 - Control AI Cost, Abuse, and Supply-Chain Risk (Priority: P2)

**Goal**: Provider allowlists, model allowlists, budget ceilings, usage metadata, and supply-chain failures are enforced and auditable.

**Independent Test**: Seed approved and unapproved models, configure budgets, simulate invocations, and verify allowed, refused, downgraded, and usage-incomplete paths.

### Tests for User Story 4

- [x] T039 [P] [US4] Add cost control tests in `packages/ai/src/__tests__/cost-controls.test.ts`
- [x] T040 [P] [US4] Add provider/model allowlist tests in `packages/ai/src/__tests__/supply-chain.test.ts`
- [x] T041 [P] [US4] Add usage metadata risk evidence tests in `packages/ai/src/__tests__/usage-metadata.test.ts`

### Implementation for User Story 4

- [x] T042 [US4] Implement budget preflight and post-usage evaluation in `packages/ai/src/cost-controls.ts`
- [x] T043 [US4] Implement provider/model allowlist enforcement in `packages/ai/src/manifest.ts`
- [x] T044 [US4] Integrate cost and supply-chain decisions into invocation records in `packages/ai/src/invocation.ts`
- [x] T045 [US4] Implement usage metadata missing evidence in `packages/ai/src/invocation.ts`
- [x] T046 [US4] Export cost-control helpers from `packages/ai/src/index.ts`

**Checkpoint**: US4 works independently and cost/supply-chain refusal paths are auditable.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Complete documentation, staged evidence, and final verification.

- [x] T047 [P] Update `packages/ai/README.md` with F12 public API and no-direct-provider posture
- [x] T048 [P] Complete `docs/runbooks/ai-infrastructure.md` with publish, rotate, revoke, incident, and cost-review procedures
- [x] T049 Implement staged F12 dev run in `packages/ai/scripts/f12-staged-dev-run.ts`
- [x] T050 Record quickstart evidence in `.specify/specs/012-ai-infrastructure/quickstart-run-2026-05-21.md`
- [x] T051 Run `/speckit-analyze` and record findings in `.specify/specs/012-ai-infrastructure/analyze-report.md`
- [x] T052 Run `/code-review` and record findings in `.specify/specs/012-ai-infrastructure/code-review-t052.md`
- [x] T053 Run `/security-review` and record findings in `.specify/specs/012-ai-infrastructure/security-review-t053.md`
- [x] T054 Run final verification commands from `.specify/specs/012-ai-infrastructure/quickstart.md`
- [x] T055 Update `.specify/roadmap.md` F12 status after implementation verification

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion; blocks all user stories.
- **US1 Governed Invocation (Phase 3)**: Depends on Foundational; MVP.
- **US2 Immutable Prompt/Model Versions (Phase 4)**: Depends on Foundational; integrates with US1 for full invocation.
- **US3 Runtime Manifests (Phase 5)**: Depends on US2 for prompt/model refs and integrates with US1 invocation preflight.
- **US4 Cost/Supply-Chain Controls (Phase 6)**: Depends on US3 manifest structure.
- **Polish (Phase 7)**: Depends on desired story completion.

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational; gives MVP governed invocation with fixtures.
- **US2 (P1)**: Can start after Foundational but full value appears when US1 consumes versions.
- **US3 (P1)**: Requires US2 prompt/model refs.
- **US4 (P2)**: Requires US3 manifest controls.

### Parallel Opportunities

- T002, T003, and T004 can run in parallel after T001.
- T011 and T012 can run in parallel with T009/T010 once contract files exist.
- Test tasks within each user story can run in parallel before implementation.
- US1 and US2 can begin in parallel after Foundational if implementation ownership is split, then integrate at US3.

## Parallel Example: US1

```text
Task: "Add gateway adapter tests in packages/ai/src/__tests__/gateway.test.ts"
Task: "Add invocation preflight/refusal tests in packages/ai/src/__tests__/invocation.test.ts"
Task: "Add governed invocation audit evidence tests in packages/ai/src/__tests__/invocation-audit.test.ts"
```

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational tasks.
2. Complete US1 governed invocation with fake gateway fixtures.
3. Validate US1 with package tests before adding registry/manifest complexity.

### Incremental Delivery

1. Add immutable prompt/model registries.
2. Add runtime manifests and no-hot-reload freeze checks.
3. Add cost/supply-chain controls.
4. Finish quickstart evidence, analyze, code review, security review, and final verification.
