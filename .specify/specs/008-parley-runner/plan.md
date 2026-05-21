# Implementation Plan: F08 Parley Runner

**Branch**: `008-parley-runner` | **Date**: 2026-05-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `.specify/specs/008-parley-runner/spec.md`

## Summary

F08 turns the existing `@spyglass/parley` placeholder into the event-driven Parley harness runtime. It dispatches match-made and renegotiation events, resolves and freezes contracts/rubrics/tool/privacy refs, coordinates seeker/employer side turns under the Parley run-state machine, enforces run-to-completion and round caps, isolates per-run/per-side contexts, routes counterparty exposure through privacy filtering and tool dispatcher boundaries, and produces conclusive or inconclusive signed dossiers through F10.

The first implementation slice is a deterministic package-level harness suitable for CI and staged quickstart evidence. It models the six Parley/Inngest function surfaces and event contracts without binding the package to a live Inngest SDK yet, so later application wiring can wrap the same typed functions with real Inngest handlers.

## Technical Context

**Language/Version**: TypeScript, Node 24, ESM.

**Primary Dependencies**: Existing `@spyglass/agent-contracts`, `@spyglass/rubrics`, `@spyglass/tool-dispatcher`, `@spyglass/privacy-filter`, `@spyglass/dossiers`, `@spyglass/audit-log`, and `@spyglass/db` types. No new runtime service dependency in the first slice.

**Storage**: F08 owns no filesystem workspaces. The package uses a typed run repository interface and in-memory implementation for tests/dev-run. Durable production state remains match-ticket fields, audit log, transcript/dossier persistence, and downstream package repositories.

**Testing**: Jest unit tests, package type-check, lint, contract schema validation tests, cross-run/context isolation tests, run-state-machine tests, tool semantic scan tests, and an F08 staged quickstart run that produces a signed valid dossier.

**Target Platform**: Existing TypeScript monorepo, Vercel server-side runtime, Postgres-backed domain packages, future Inngest handlers.

**Project Type**: Backend domain package + event contracts + staged integration harness. No user-facing UI.

**Performance Goals**: Synthetic in-memory Parley run completes under 250ms p95 locally; dispatch preflight completes under 100ms p95 with seeded repositories.

**Constraints**: No polling; no hot reload of policy files; no filesystem workspace; deterministic scoring; tool dispatcher as only invocation path; privacy filter for all counterparty content; best-effort inconclusive dossier on failure; no human-input pause tools.

**Scale/Scope**: One match-ticket run at a time in package tests; function definitions carry concurrency metadata for later Inngest binding. Global/per-principal concurrency enforcement beyond typed metadata is deferred to application-level Inngest wiring.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | F08 compliance plan |
| --- | --- | --- |
| §I.A primitives | Parley runtime must enforce compliance spine | F08 consumes F07a/F07b/F08.5/F09/F10/F11 surfaces and refuses unsafe dispatch |
| §I.1 Confidentiality | Counterparty content must be filtered | Context updates accept counterparty data only from privacy-filtered projections |
| §I.2 Integrity | Decisions must be reconstructable | Frozen refs, transition evidence, deterministic scoring, and signed dossiers |
| §I.5.2 AAA | Least privilege tool access | Side runners call tools only through F08.5 dispatcher interfaces |
| §I.6 Secure by default | Missing evidence fails closed | Dispatch denies unresolved contracts, missing bias tests, unavailable tool surfaces, and privacy issues |
| §II Agent-native | Agent-first runtime | Typed side-runner protocol and event contracts define machine-consumable negotiation flow |
| §III.2 Agent semantics | Typed machine-readable contracts | YAML schemas cover dispatch, turns, scoring, filter, dossier request, and terminal events |

**Gate result**: Pass. F08 integrates completed Stage 4 compliance packages and adds the bounded runtime.

## Project Structure

### Documentation (this feature)

```text
.specify/specs/008-parley-runner/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── parley-dispatch-request.schema.yaml
│   ├── negotiation-turn.schema.yaml
│   ├── negotiation-filter.schema.yaml
│   ├── negotiation-scoring.schema.yaml
│   ├── negotiation-dossier-request.schema.yaml
│   └── negotiation-terminal.schema.yaml
└── tasks.md
```

### Source Code (repository root)

```text
packages/parley/
├── package.json
├── tsconfig.json
├── jest.config.js
├── eslint.config.js
├── src/
│   ├── index.ts
│   ├── types.ts
│   ├── events.ts
│   ├── config.ts
│   ├── context.ts
│   ├── tool-scan.ts
│   ├── scoring.ts
│   ├── dispatcher.ts
│   ├── coordinator.ts
│   ├── side-runner.ts
│   ├── filter-worker.ts
│   ├── dossier-producer.ts
│   ├── invalidator.ts
│   ├── repo.ts
│   └── __tests__/
└── scripts/
    └── f08-staged-dev-run.ts
```

**Structure Decision**: Extend the existing `@spyglass/parley` package. Keep the initial implementation SDK-agnostic and expose typed function definitions that can be bound to Inngest in the app layer.

## Phase 0 Research

See [research.md](research.md). No unresolved clarification markers remain.

## Phase 1 Design

See:

- [data-model.md](data-model.md)
- [quickstart.md](quickstart.md)
- [contracts/parley-dispatch-request.schema.yaml](contracts/parley-dispatch-request.schema.yaml)
- [contracts/negotiation-turn.schema.yaml](contracts/negotiation-turn.schema.yaml)
- [contracts/negotiation-filter.schema.yaml](contracts/negotiation-filter.schema.yaml)
- [contracts/negotiation-scoring.schema.yaml](contracts/negotiation-scoring.schema.yaml)
- [contracts/negotiation-dossier-request.schema.yaml](contracts/negotiation-dossier-request.schema.yaml)
- [contracts/negotiation-terminal.schema.yaml](contracts/negotiation-terminal.schema.yaml)

## Implementation Phases

1. **Contracts and package wiring**: add package dependencies, event/type surfaces, and schema tests.
2. **Run repository and context manager**: implement idempotent run claims, transition recording, context isolation, and release evidence.
3. **Dispatch gate**: resolve contracts/rubrics, scan advertised tools for human-input semantics, freeze refs, and deny unsafe dispatch.
4. **Coordinator and side runners**: enforce seeker-first alternation, round caps, done signals, structured output validation, and deterministic scoring.
5. **Filter and dossier producers**: wrap privacy-filter handoffs and F10 dossier creation/signing into function surfaces.
6. **Invalidation and failure paths**: abort stale runs, create best-effort inconclusive dossiers, and emit terminal evidence.
7. **Closure**: staged quickstart, analyze/code/security review notes, verification, and roadmap update.

## Risks

- **Scope creep into live Inngest wiring**: mitigated by typed function definitions first; app binding can be a later feature.
- **Context leakage**: mitigated by run-id and side-keyed context storage plus type-level prompt input shape.
- **Tool bypass**: mitigated by importing only dispatcher types into side-runner execution paths and running boundary checks.
- **False conclusive dossiers**: mitigated by F10 dossier validation and F08 scoring completeness checks.
- **Human-input pause semantics**: mitigated by catalog scan before dispatch and tests with forbidden descriptors.

## Post-Design Constitution Re-check

| Article | Result |
| --- | --- |
| §I.A | Pass: F08 orchestrates the Stage 4 compliance spine |
| §I.1 | Pass: counterparty flow is filter-mediated |
| §I.2 | Pass: frozen refs, transition evidence, deterministic scoring, signed dossier |
| §I.5.2 | Pass: dispatcher-only tool path |
| §I.6 | Pass: missing evidence fails closed |
| §II | Pass: typed agent runtime events |
| §III.2 | Pass: event schemas and typed runner contracts |

**Gate result**: Pass. No complexity exceptions required.

## Complexity Tracking

No constitution violations or complexity exceptions.
