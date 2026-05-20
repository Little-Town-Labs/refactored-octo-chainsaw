# Implementation Plan: F07a Agent Contract Registry

**Branch**: `007-agent-contract-registry` | **Date**: 2026-05-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `.specify/specs/007-agent-contract-registry/spec.md`

## Summary

F07a adds Spyglass' versioned Agent Contract Registry: immutable `(contract_id, version)` definitions, scoped publication and deprecation, dispatch-time resolution with fail-closed reason codes, provenance/audit evidence, and scoped review reads.

The technical approach extends the existing TypeScript monorepo with:

- New Drizzle schema/migration modules in `@spyglass/db`.
- A new `@spyglass/agent-contracts` package for pure contract validation, publication, resolution, deprecation, review reads, and Drizzle adapters.
- F05 `@spyglass/audit-log` integration for canonical contract publication/deprecation evidence.
- F05 transcript compatibility by preserving stable `contract_id` and `contract_version` refs for every future Parley turn.
- Initial JSON Schema contracts for contract versions and resolution failures.

## Technical Context

**Language/Version**: TypeScript, Node 24, ESM.

**Primary Dependencies**: Existing Drizzle ORM, `@spyglass/db`, `@spyglass/auth`, `@spyglass/audit-log`; `zod` may be used for package-local validation.

**Storage**: PostgreSQL/Neon through Drizzle migrations. New F07a tables: `agent_contract_versions` and `agent_contract_events`.

**Testing**: Jest unit/integration tests, package type-check, ESLint, schema-lint, contract schema validation tests, and a staged dev quickstart run.

**Target Platform**: Existing Next.js/Vercel server-side monorepo with package-level domain logic and Drizzle-backed persistence.

**Project Type**: Monorepo package + database schema + server integration surface. F07a is backend/compliance infrastructure, not a user-facing page.

**Performance Goals**: Contract resolution should complete under 50ms p95 in seeded local package tests; review reads should be bounded and paginated.

**Constraints**: Immutable `(contract_id, version)` records; fail-closed dispatch for missing/deprecated/invalid/unresolvable dependencies; every privileged mutation attributable to a principal; canonical audit evidence for publication and deprecation; no rubric body or prompt body embedded in the contract.

**Scale/Scope**: Phase 0/Phase 1 launch contract set for seeker and employer agents, with reason codes stable enough for F08 and F10 to consume.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | F07a compliance plan |
| --- | --- | --- |
| §I.2 Integrity | Policy artifacts must be reconstructable and tamper-evident | Immutable versions plus F05 canonical audit evidence |
| §I.5 AAA | Privileged actions attributable to identified principals | Publication/deprecation require scoped principals and audit links |
| §I.6 Secure by default | Access defaults deny; fail-safe behavior | Missing, invalid, deprecated, or unresolvable contract refs deny dispatch |
| §II Agent-Native | Agents operate through explicit contracts and scopes | Contract pins side, model, prompt/rubric/tool refs, and runtime settings |
| §III.3 Contract Evolution | Immutable versioned contracts with explicit evolution | `(contract_id, version)` cannot be overwritten; new versions carry provenance |
| §I.D Forensic readiness | Evidence preserved for review and incidents | Contract events and resolution failures have stable reason codes and evidence refs |

**Gate result**: Pass. F07a implements the immutable agent-contract primitive required by Parley and the project constitution. Mandatory `/security-review` remains required before closure per roadmap.

## Project Structure

### Documentation (this feature)

```text
.specify/specs/007-agent-contract-registry/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── agent-contract-version.schema.yaml
│   └── contract-resolution.schema.yaml
└── tasks.md
```

### Source Code (repository root)

```text
packages/db/
├── src/schema/agent-contracts.ts
├── migrations/0008_f07a_agent_contract_registry.sql
└── migrations/meta/_journal.json

packages/agent-contracts/
├── package.json
├── tsconfig.json
├── jest.config.js
├── src/
│   ├── index.ts
│   ├── types.ts
│   ├── validation.ts
│   ├── publish.ts
│   ├── resolver.ts
│   ├── review.ts
│   ├── repo.ts
│   └── __tests__/
└── scripts/
    └── f07a-staged-dev-run.ts

docs/runbooks/
└── agent-contract-registry.md
```

**Structure Decision**: Use a new `@spyglass/agent-contracts` package. Contracts are a compliance artifact consumed by Parley, auth, audit, and future registries; keeping the domain separate avoids burying policy versioning inside `@spyglass/parley`.

## Phase 0 Research

See [research.md](research.md). All technical unknowns are resolved without remaining clarification markers.

## Phase 1 Design

See:

- [data-model.md](data-model.md)
- [quickstart.md](quickstart.md)
- [contracts/agent-contract-version.schema.yaml](contracts/agent-contract-version.schema.yaml)
- [contracts/contract-resolution.schema.yaml](contracts/contract-resolution.schema.yaml)

## Implementation Phases

1. **Governance and contracts**: classify F07a tables, add retention/invariant entries, validate JSON schemas.
2. **Schema and package setup**: add contract registry tables, migration, and `@spyglass/agent-contracts` package skeleton.
3. **Publication path**: implement scoped publish/deprecate logic with immutable write enforcement and canonical audit evidence.
4. **Resolution path**: implement dispatch-facing resolution, dependency validation, runtime ceiling clamps, and stable reason codes.
5. **Review reads**: implement scoped contract version/history reads.
6. **Quickstart, reviews, closure**: staged run, runbook, `/speckit-analyze`, `/code-review`, `/security-review`, final verification.

## Risks

- **Contract version mutated after dispatch**: mitigated by unique immutable rows and mutation rejection tests.
- **Dispatch proceeds with missing dependency**: mitigated by fail-closed reason codes and dispatch validation tests.
- **Policy authorship unclear**: mitigated by required author/reviewer principal refs and canonical audit events.
- **F07b ownership blurred**: mitigated by storing rubric refs only; rubric body and bias artifacts remain F07b.

## Post-Design Constitution Re-check

| Article | Result |
| --- | --- |
| §I.2 | Pass: versions are immutable and audit-linked |
| §I.5 | Pass: scoped publication/deprecation require principal attribution |
| §I.6 | Pass: default-deny dispatch semantics encoded in contracts and tests |
| §II | Pass: contracts define agent-side execution bounds and tool refs |
| §III.3 | Pass: version mutation is explicitly rejected |
| §I.D | Pass: publication/deprecation evidence and resolution failures are reviewable |

**Gate result**: Pass. No complexity exceptions required.

## Complexity Tracking

No constitution violations or complexity exceptions.
