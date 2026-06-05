# Tasks: F12 Follow-up OpenRouter AI Gateway

**Input**: Design documents from `.specify/specs/043-openrouter-ai-gateway/`

**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

**Tests**: Required. This is a provider integration behind a constitutional F12 AI gateway boundary.

**Organization**: Tasks are grouped by user story so the adapter can be implemented independently from documentation cleanup.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Align Spec Kit feature pointers and baseline docs.

- [x] T001 Update `.specify/feature.json` and `AGENTS.md` to point at `.specify/specs/043-openrouter-ai-gateway/plan.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add provider configuration and keep generated env docs source-driven.

- [x] T002 Add OpenRouter env schema entries in `packages/shared/src/env.ts`
- [x] T003 Regenerate `.env.example` with `pnpm gen:env-example`

**Checkpoint**: OpenRouter configuration is visible through the repo's generated env manifest.

---

## Phase 3: User Story 1 - Invoke Through OpenRouter Without Bypassing Governance (Priority: P1)

**Goal**: Real provider calls can use OpenRouter behind the existing gateway adapter.

**Independent Test**: Mock `fetch`, invoke the OpenRouter adapter, and verify request headers/body plus normalized response behavior.

### Tests for User Story 1

- [x] T004 [P] [US1] Add OpenRouter adapter tests in `packages/ai/src/__tests__/gateway.test.ts`

### Implementation for User Story 1

- [x] T005 [US1] Implement `OpenRouterGatewayAdapter` in `packages/ai/src/gateway.ts`
- [x] T006 [US1] Export `OpenRouterGatewayAdapter` from `packages/ai/src/index.ts`

**Checkpoint**: OpenRouter adapter passes package tests without live credentials.

---

## Phase 4: User Story 2 - Configure and Operate OpenRouter Secrets Clearly (Priority: P2)

**Goal**: Operators can set the right Vercel secrets and model allowlists without relying on Vercel AI Gateway language.

**Independent Test**: Read the runbook and generated env manifest and verify OpenRouter setup is complete.

### Implementation for User Story 2

- [x] T007 [US2] Update AI infrastructure runbook provider setup in `docs/runbooks/ai-infrastructure.md`
- [x] T008 [US2] Update F12 docs to mark AI Gateway naming as legacy where relevant in `packages/ai/README.md`

**Checkpoint**: Operator setup docs identify OpenRouter secrets and provider allowlist guidance.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Verify the feature and record closure evidence.

- [x] T009 Run package verification commands from `.specify/specs/043-openrouter-ai-gateway/quickstart.md`
- [x] T010 Record verification evidence in `.specify/specs/043-openrouter-ai-gateway/quickstart-run-2026-05-29.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup completion.
- **US1 (Phase 3)**: Depends on Foundational configuration.
- **US2 (Phase 4)**: Can run after Foundational and can overlap with US1 after env names are settled.
- **Polish (Phase 5)**: Depends on US1 and US2.

### User Story Dependencies

- **US1 (P1)**: No dependency on US2 after env schema exists.
- **US2 (P2)**: Documents the configuration created for US1.

### Parallel Opportunities

- T004 can be written while T007/T008 documentation work proceeds.

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational env schema.
2. Complete US1 adapter tests and implementation.
3. Validate `@spyglass/ai` tests before documentation polish.

### Incremental Delivery

1. Add docs and generated env manifest.
2. Run verification commands.
3. Record quickstart evidence and leave live provider smoke testing as credential-gated follow-up.
