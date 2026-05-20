# Tasks: F07a Agent Contract Registry

**Input**: Design documents from `.specify/specs/007-agent-contract-registry/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: TDD is required for registry immutability, scoped publication, fail-closed dispatch resolution, and review reads.

## Phase 1: Setup

- [X] T001 Add `@spyglass/agent-contracts` package skeleton with `package.json`, `tsconfig.json`, `jest.config.js`, and `src/index.ts`
- [X] T002 [P] Add F07a contract schemas in `.specify/specs/007-agent-contract-registry/contracts/`
- [X] T003 [P] Add contract schema validation tests in `packages/agent-contracts/src/__tests__/contracts.test.ts`
- [X] T004 [P] Add F07a data-governance entries in `docs/data-governance/data-classification.yaml`
- [X] T005 [P] Add F07a retention and integrity entries in `docs/data-governance/retention-policy.md` and `docs/data-governance/integrity-invariants.md`

## Phase 2: Foundational Schema And Shared Types

- [X] T006 Add `agent_contract_versions` and `agent_contract_events` schema in `packages/db/src/schema/agent-contracts.ts`
- [X] T007 Export F07a schema from `packages/db/src/schema/index.ts`
- [X] T008 Add migration `packages/db/migrations/0008_f07a_agent_contract_registry.sql` and journal entry in `packages/db/migrations/meta/_journal.json`
- [X] T009 Add F07a shared enums and type exports in `packages/agent-contracts/src/types.ts`
- [X] T010 Add repository interfaces and Drizzle adapter skeleton in `packages/agent-contracts/src/repo.ts`

## Phase 3: User Story 1 - Resolve Immutable Agent Contracts (Priority: P1)

**Goal**: Resolve valid `(contract_id, version)` refs and reject missing or mutated versions.

**Independent Test**: Resolve an existing contract, then attempt to overwrite the same id/version with different material and verify rejection.

- [X] T011 [P] [US1] Add RED resolution tests in `packages/agent-contracts/src/__tests__/resolver.test.ts`
- [X] T012 [P] [US1] Add RED immutability tests in `packages/agent-contracts/src/__tests__/publish.test.ts`
- [X] T013 [US1] Implement canonical contract validation and hashing in `packages/agent-contracts/src/validation.ts`
- [X] T014 [US1] Implement immutable publish checks in `packages/agent-contracts/src/publish.ts`
- [X] T015 [US1] Implement dispatch contract resolution in `packages/agent-contracts/src/resolver.ts`
- [X] T016 [US1] Run `pnpm --filter @spyglass/agent-contracts test -- resolver.test.ts publish.test.ts`

## Phase 4: User Story 2 - Publish Reviewed Contract Versions (Priority: P1)

**Goal**: Publish and deprecate reviewed contract versions with scoped principals and canonical audit evidence.

**Independent Test**: Publish a new reviewed version, verify it resolves, and verify publication/deprecation audit links exist.

- [X] T017 [P] [US2] Add RED publication authorization and audit tests in `packages/agent-contracts/src/__tests__/publication-audit.test.ts`
- [X] T018 [US2] Declare F07a scopes `contract.read`, `contract.publish`, and `contract.deprecate` in `packages/agent-contracts/src/scopes.ts`
- [X] T019 [US2] Implement scoped publication and deprecation flows in `packages/agent-contracts/src/publish.ts`
- [X] T020 [US2] Persist immutable contract event rows and canonical audit events in `packages/agent-contracts/src/repo.ts`
- [X] T021 [US2] Run `pnpm --filter @spyglass/agent-contracts test -- publication-audit.test.ts publish.test.ts`

## Phase 5: User Story 3 - Validate Dispatch References (Priority: P2)

**Goal**: Fail closed for missing prompt, rubric, tool-surface, model, and bias-test dependencies while returning runtime clamps.

**Independent Test**: Resolve contracts with unavailable dependencies and over-ceiling runtime settings; verify stable denials and clamp records.

- [X] T022 [P] [US3] Add RED dependency validation tests in `packages/agent-contracts/src/__tests__/resolver-dependencies.test.ts`
- [X] T023 [US3] Implement dependency checker interfaces in `packages/agent-contracts/src/resolver.ts`
- [X] T024 [US3] Implement runtime ceiling clamp projection in `packages/agent-contracts/src/resolver.ts`
- [X] T025 [US3] Run `pnpm --filter @spyglass/agent-contracts test -- resolver-dependencies.test.ts resolver.test.ts`

## Phase 6: User Story 4 - Review Contract History (Priority: P2)

**Goal**: Provide scoped, bounded review reads for contract versions and events.

**Independent Test**: Scoped reviewer reads contract history by filters; unscoped reads deny by default.

- [X] T026 [P] [US4] Add RED scoped review-read tests in `packages/agent-contracts/src/__tests__/review.test.ts`
- [X] T027 [US4] Implement bounded contract version and event reads in `packages/agent-contracts/src/review.ts`
- [X] T028 [US4] Wire Drizzle read queries and scope checks in `packages/agent-contracts/src/repo.ts`
- [X] T029 [US4] Run `pnpm --filter @spyglass/agent-contracts test -- review.test.ts`

## Phase 7: Integration, Quickstart, Reviews, And Closure

- [X] T030 Add staged quickstart runner `packages/agent-contracts/scripts/f07a-staged-dev-run.ts`
- [X] T031 Add `dev-run:f07a` package script in `packages/agent-contracts/package.json`
- [X] T032 Add operator runbook `docs/runbooks/agent-contract-registry.md`
- [X] T033 Execute F07a quickstart scenarios and save `.specify/specs/007-agent-contract-registry/quickstart-run-2026-05-20.md`
- [X] T034 Run `/speckit-analyze` and resolve findings in `.specify/specs/007-agent-contract-registry/`
- [X] T035 Run `/code-review` and resolve findings
- [X] T036 Run mandatory `/security-review` and resolve findings
- [X] T037 Run final verification: `pnpm --filter @spyglass/agent-contracts test`, `type-check`, `lint`, `pnpm schema:lint`, and `pnpm --filter @spyglass/agent-contracts dev-run:f07a`

## Dependencies & Execution Order

Phase 1 -> Phase 2

Phase 2 -> US1

US1 -> US2

US1 + US2 -> US3

US1 + US2 + US3 -> US4

All user stories -> Phase 7

## Parallel Opportunities

- T003, T004, and T005 can run in parallel after T001/T002.
- T011 and T012 can run in parallel after Phase 2.
- T017 can run after T014 starts and before T019.
- T022 and T026 can run in parallel once foundational types are stable.

## Implementation Strategy

1. Complete setup and foundational schema first.
2. Ship US1 as the MVP: immutable publish check and deterministic resolution.
3. Add publication/deprecation audit evidence.
4. Add dependency validation and review reads.
5. Run quickstart, analyze, code review, security review, and final verification.
