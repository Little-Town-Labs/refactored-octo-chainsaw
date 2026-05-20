# Tasks: F08.5 Tool Surface & Dispatcher

**Input**: Design documents from `.specify/specs/008-tool-surface-dispatcher/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Test tasks are included because F08.5 is a compliance/security boundary with immutable policy storage, dispatcher-only invocation, disclosure routing, and CI-gated bypass enforcement.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the F08.5 package, schema entry points, and documentation skeleton.

- [x] T001 Create `packages/tool-dispatcher/package.json`, `packages/tool-dispatcher/tsconfig.json`, `packages/tool-dispatcher/jest.config.js`, and `packages/tool-dispatcher/eslint.config.js`
- [x] T002 Create `packages/tool-dispatcher/src/index.ts`, `packages/tool-dispatcher/src/types.ts`, `packages/tool-dispatcher/src/validation.ts`, `packages/tool-dispatcher/src/repo.ts`, and `packages/tool-dispatcher/src/scopes.ts`
- [x] T003 Add F08.5 schema export placeholder in `packages/db/src/schema/tool-surfaces.ts` and wire it from `packages/db/src/schema/index.ts`
- [x] T004 [P] Add F08.5 runbook skeleton in `docs/runbooks/tool-surface-dispatcher.md`
- [x] T005 [P] Add F08.5 staged-run script skeleton in `packages/tool-dispatcher/scripts/f08-5-staged-dev-run.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish governance, storage, shared validation, and audit contracts that all stories depend on.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T006 Add `tool_surface_policy`, `tool_dispatch_evidence`, and `tool_disclosure_evidence` classes and F08.5 table entries to `docs/data-governance/data-classification.yaml`
- [x] T007 Add F08.5 retention entries to `docs/data-governance/retention-policy.md`
- [x] T008 Add F08.5 integrity invariants for `tool_surface_versions`, `tool_descriptor_versions`, `tool_surface_descriptors`, `tool_dispatch_events`, and `dispatcher_bypass_findings` to `docs/data-governance/integrity-invariants.md`
- [x] T009 Implement Drizzle schema for F08.5 tables in `packages/db/src/schema/tool-surfaces.ts`
- [x] T010 Add migration `packages/db/migrations/0010_f08_5_tool_surface_dispatcher.sql` and update `packages/db/migrations/meta/_journal.json`
- [x] T011 [P] Add JSON Schema contract validation tests for F08.5 contract files in `packages/tool-dispatcher/src/__tests__/contracts.test.ts`
- [x] T012 [P] Implement shared F08.5 type definitions and reason-code unions in `packages/tool-dispatcher/src/types.ts`
- [x] T013 Implement shared validation helpers for descriptor schemas, disclosure classes, statuses, content hashes, and canonical refs in `packages/tool-dispatcher/src/validation.ts`
- [x] T014 Implement in-memory test fixtures and repo harness in `packages/tool-dispatcher/src/__tests__/fixtures.ts`

**Checkpoint**: Foundation ready; user story implementation can begin.

---

## Phase 3: User Story 1 - Resolve Pinned Tool Surfaces for Dispatch (Priority: P1) MVP

**Goal**: Contract-pinned tool surface refs resolve deterministically and immutable catalog versions cannot be overwritten.

**Independent Test**: Resolve a published surface, verify advertised descriptors/provenance, and verify mutation attempts fail.

### Tests for User Story 1

- [x] T015 [P] [US1] Add immutable descriptor and surface publish tests in `packages/tool-dispatcher/src/__tests__/publish.test.ts`
- [x] T016 [P] [US1] Add resolver success, missing, unpublished, deprecated, and adapter-unavailable tests in `packages/tool-dispatcher/src/__tests__/resolver.test.ts`

### Implementation for User Story 1

- [x] T017 [US1] Implement descriptor and surface publication/deprecation logic with scoped principals in `packages/tool-dispatcher/src/publish.ts`
- [x] T018 [US1] Implement tool surface repository write/read operations in `packages/tool-dispatcher/src/repo.ts`
- [x] T019 [US1] Implement dispatch-facing surface resolution and advertisement in `packages/tool-dispatcher/src/resolver.ts`
- [x] T020 [US1] Implement F07a `checkToolSurface` adapter in `packages/tool-dispatcher/src/agent-contract-adapter.ts`
- [x] T021 [US1] Emit canonical audit evidence for descriptor and surface publication/deprecation in `packages/tool-dispatcher/src/publish.ts`
- [x] T022 [US1] Export publication, deprecation, resolution, advertisement, and reason-code APIs from `packages/tool-dispatcher/src/index.ts`

**Checkpoint**: User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Invoke Tools Only Through the Dispatcher (Priority: P1)

**Goal**: Supported tools execute only through the dispatcher, unsupported tools degrade gracefully, and direct calls are rejected by CI/type gates.

**Independent Test**: Invoke supported, unsupported, unauthorized, and bypassing paths and verify structured outcomes.

### Tests for User Story 2

- [x] T023 [P] [US2] Add supported invocation and input/output schema validation tests in `packages/tool-dispatcher/src/__tests__/dispatcher.test.ts`
- [x] T024 [P] [US2] Add unsupported-tool continuation tests in `packages/tool-dispatcher/src/__tests__/unsupported-tool.test.ts`
- [x] T025 [P] [US2] Add direct-call bypass fixture and expected failure test in `packages/tool-dispatcher/src/__tests__/import-boundary.test.ts`

### Implementation for User Story 2

- [x] T026 [US2] Implement adapter registration and adapter availability checks in `packages/tool-dispatcher/src/adapter-registry.ts`
- [x] T027 [US2] Implement dispatcher authorization, per-turn call-limit checks, and schema validation in `packages/tool-dispatcher/src/dispatcher.ts`
- [x] T028 [US2] Implement `tool_unsupported`, `denied`, `adapter_failed`, `adapter_timeout`, and `schema_invalid` result handling in `packages/tool-dispatcher/src/dispatcher.ts`
- [x] T029 [US2] Implement direct-call import boundary guard helper in `packages/tool-dispatcher/src/import-boundary.ts`
- [x] T030 [US2] Wire F08.5 import-boundary guard into package lint/type-check workflow in `packages/tool-dispatcher/package.json`
- [x] T031 [US2] Emit canonical audit evidence for dispatch invocation, unsupported tools, denials, adapter failures, and bypass findings in `packages/tool-dispatcher/src/dispatcher.ts` and `packages/tool-dispatcher/src/import-boundary.ts`

**Checkpoint**: User Stories 1 and 2 both work independently, and unsupported tools continue the turn.

---

## Phase 5: User Story 3 - Enforce Disclosure-Class Routing (Priority: P1)

**Goal**: Tool outputs are routed by disclosure class and raw `counterparty_filtered` data cannot bypass the privacy-filter boundary.

**Independent Test**: Dispatch each disclosure class and verify routing decisions and fail-closed behavior.

### Tests for User Story 3

- [x] T032 [P] [US3] Add disclosure routing matrix tests in `packages/tool-dispatcher/src/__tests__/disclosure.test.ts`
- [x] T033 [P] [US3] Add `counterparty_filtered` fail-closed tests in `packages/tool-dispatcher/src/__tests__/privacy-boundary.test.ts`

### Implementation for User Story 3

- [x] T034 [US3] Implement disclosure routing decisions for `principal_self`, `counterparty_filtered`, and `platform_open` in `packages/tool-dispatcher/src/disclosure.ts`
- [x] T035 [US3] Implement F09-facing privacy-filter port and unavailable-filter fail-closed behavior in `packages/tool-dispatcher/src/disclosure.ts`
- [x] T036 [US3] Integrate disclosure routing with dispatcher result construction in `packages/tool-dispatcher/src/dispatcher.ts`
- [x] T037 [US3] Emit canonical disclosure routing evidence in `packages/tool-dispatcher/src/disclosure.ts`
- [x] T038 [US3] Export disclosure routing types and privacy-filter port from `packages/tool-dispatcher/src/index.ts`

**Checkpoint**: User Stories 1, 2, and 3 are independently functional.

---

## Phase 6: User Story 4 - Review Tool Catalog and Dispatch Evidence (Priority: P2)

**Goal**: Scoped reviewers can reconstruct catalog, dispatch, unsupported-tool, bypass, and disclosure-routing evidence without raw sensitive payload access.

**Independent Test**: Scoped reads return bounded metadata and unscoped reads are denied by default.

### Tests for User Story 4

- [x] T039 [P] [US4] Add scoped catalog and descriptor review read tests in `packages/tool-dispatcher/src/__tests__/review.test.ts`
- [x] T040 [P] [US4] Add unscoped access denial and payload redaction tests in `packages/tool-dispatcher/src/__tests__/review-auth.test.ts`

### Implementation for User Story 4

- [x] T041 [US4] Implement scoped review reads for tool surfaces, descriptors, and publication events in `packages/tool-dispatcher/src/review.ts`
- [x] T042 [US4] Implement scoped review reads for dispatch outcomes, disclosure routing, unsupported-tool events, and bypass findings in `packages/tool-dispatcher/src/review.ts`
- [x] T043 [US4] Add review scopes and descriptions in `packages/tool-dispatcher/src/scopes.ts`
- [x] T044 [US4] Export review APIs from `packages/tool-dispatcher/src/index.ts`

**Checkpoint**: All user stories are independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verification, documentation, and required closure reviews.

- [x] T045 [P] Update `docs/runbooks/tool-surface-dispatcher.md` with publish, resolution, dispatch, unsupported-tool, disclosure routing, bypass guard, review, and rollback procedures
- [x] T046 Implement staged quickstart run in `packages/tool-dispatcher/scripts/f08-5-staged-dev-run.ts`
- [x] T047 Run and record quickstart evidence in `.specify/specs/008-tool-surface-dispatcher/quickstart-run-2026-05-20.md`
- [x] T048 Run `/speckit-analyze` and record findings in `.specify/specs/008-tool-surface-dispatcher/analyze-report.md`
- [x] T049 Run `/code-review` and record findings in `.specify/specs/008-tool-surface-dispatcher/code-review-t049.md`
- [x] T050 Run `/security-review` and record findings in `.specify/specs/008-tool-surface-dispatcher/security-review-t050.md`
- [x] T051 Run final verification: `pnpm --filter @spyglass/tool-dispatcher test`, `pnpm --filter @spyglass/tool-dispatcher type-check`, `pnpm --filter @spyglass/tool-dispatcher lint`, and `pnpm schema:lint`
- [x] T052 Update `.specify/roadmap.md` Stage 4 notes after F08.5 implementation evidence is complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user stories.
- **US1 (Phase 3)**: Depends on Foundational; MVP for catalog storage and contract-pinned resolution.
- **US2 (Phase 4)**: Depends on US1 because dispatcher calls require a resolved advertised surface.
- **US3 (Phase 5)**: Depends on US2 because routing applies to dispatcher outputs.
- **US4 (Phase 6)**: Depends on US1, US2, and US3 event shapes.
- **Polish (Phase 7)**: Depends on all selected user stories.

### User Story Dependencies

- **User Story 1 (P1)**: Start after Foundational; no dependency on other stories.
- **User Story 2 (P1)**: Requires US1 surface resolution and descriptor refs.
- **User Story 3 (P1)**: Requires US2 dispatcher result construction.
- **User Story 4 (P2)**: Requires event records from US1, US2, and US3.

### Parallel Opportunities

- T004 and T005 can run alongside package skeleton work.
- T011, T012, and parts of T014 can run after contract schemas are stable.
- US1 tests T015 and T016 can be written in parallel.
- US2 tests T023, T024, and T025 can be written in parallel.
- US3 tests T032 and T033 can be written in parallel.
- US4 tests T039 and T040 can be written in parallel.

---

## Parallel Example: User Story 2

```text
Task: "Add supported invocation and input/output schema validation tests in packages/tool-dispatcher/src/__tests__/dispatcher.test.ts"
Task: "Add unsupported-tool continuation tests in packages/tool-dispatcher/src/__tests__/unsupported-tool.test.ts"
Task: "Add direct-call bypass fixture and expected failure test in packages/tool-dispatcher/src/__tests__/import-boundary.test.ts"
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete User Story 1 to establish immutable tool surfaces and contract-pinned resolution.
3. Validate US1 independently with `publish.test.ts` and `resolver.test.ts`.
4. Complete User Story 2 before any Parley runner integration.

### Compliance Gate Completion

1. Complete disclosure routing in User Story 3 before exposing tool outputs to future F08/F09 work.
2. Complete scoped review reads in User Story 4.
3. Run quickstart, analyze, code review, security review, and final gates.
