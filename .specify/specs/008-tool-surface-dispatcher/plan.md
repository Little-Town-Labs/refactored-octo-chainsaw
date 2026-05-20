# Implementation Plan: F08.5 Tool Surface & Dispatcher

**Branch**: `008-tool-surface-dispatcher` | **Date**: 2026-05-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `.specify/specs/008-tool-surface-dispatcher/spec.md`

## Summary

F08.5 adds Spyglass' versioned Tool Surface Registry and dispatcher boundary: immutable tool catalog versions, per-contract advertisement for F07a `tool_surface_ref` values, dispatcher-only invocation, unsupported-tool graceful degradation, disclosure-class routing, CI/type-level bypass enforcement, canonical audit evidence, and scoped review reads.

The technical approach extends the existing TypeScript monorepo with:

- New Drizzle schema/migration modules in `@spyglass/db`.
- A new `@spyglass/tool-dispatcher` package for catalog validation, publication, contract surface resolution, dispatcher invocation, disclosure routing, review reads, and CI guard fixtures.
- F05 `@spyglass/audit-log` integration for canonical catalog publication, dispatch outcomes, unsupported-tool events, disclosure routing, and bypass findings.
- F07a `@spyglass/agent-contracts` integration through a real `checkToolSurface` adapter.
- An F09-facing privacy-filter port that is enforced now while the privacy filter implementation remains a later feature.
- Initial JSON Schema contracts for tool descriptors, catalog versions, advertisements, dispatch requests/results, and disclosure routing evidence.

## Technical Context

**Language/Version**: TypeScript, Node 24, ESM.

**Primary Dependencies**: Existing Drizzle ORM, `@spyglass/db`, `@spyglass/auth`, `@spyglass/audit-log`, `@spyglass/agent-contracts`; `zod` may be used for package-local validation; existing lint/type-check tooling enforces import boundaries.

**Storage**: PostgreSQL/Neon through Drizzle migrations. New F08.5 tables: `tool_surface_versions`, `tool_descriptor_versions`, `tool_surface_descriptors`, `tool_surface_events`, `tool_dispatch_events`, and `dispatcher_bypass_findings`.

**Testing**: Jest unit/integration tests, package type-check, ESLint, schema-lint, contract schema validation tests, dispatcher-bypass fixture tests, disclosure routing tests, and a staged dev quickstart run.

**Target Platform**: Existing Next.js/Vercel server-side monorepo with package-level domain logic and Drizzle-backed persistence.

**Project Type**: Monorepo package + database schema + server integration surface. F08.5 is backend/compliance infrastructure, not a user-facing page.

**Performance Goals**: Tool surface resolution should complete under 50ms p95 in seeded local package tests; dispatcher overhead before adapter invocation should be allocation-light and deterministic for normal Parley turn sizes.

**Constraints**: Immutable catalog versions; side-runner tool invocation only through dispatcher APIs; direct adapter/SDK/tRPC calls rejected by CI; missing data defaults to refusal; `counterparty_filtered` raw output cannot be exposed without the F09 privacy-filter boundary.

**Scale/Scope**: Initial catalog support for the tool surfaces already referenced by F07a contract fixtures, with reason codes and event shapes stable enough for F08 runner, F09 privacy filter, F10 dossier, and F12 manifest work.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | F08.5 compliance plan |
| --- | --- | --- |
| §I.1 Confidentiality | Privacy filter is non-bypassable | `counterparty_filtered` outputs are routed to a privacy-filter boundary and fail closed until F09 is available |
| §I.2 Integrity | Policy artifacts and run evidence are versioned and reconstructable | Tool surfaces and descriptors are immutable versioned artifacts with content hashes and audit refs |
| §I.5.2 Authorization | Least privilege and scoped short-lived agent permissions | Dispatcher checks principal, side, contract, surface, and per-turn limits before adapter invocation |
| §I.5.3 Accountability | Privileged actions attributable to identified principals | Catalog publication, dispatch, unsupported calls, and bypass findings emit attributable audit evidence |
| §I.6 Defense in Depth | Secure defaults and non-bypassable layers | Dispatcher is the only tool path; direct calls fail CI/type-check; missing adapters or filter boundary fail closed |
| §II Agent-Native | Agents need explicit machine-readable capabilities | Tool descriptors expose input/output schemas and disclosure classes for contract-pinned runs |
| §III.2 Agent semantics | Interfaces should be typed and machine-readable | JSON Schema contracts define catalog, advertisement, request, result, and routing evidence |
| §III.3 Contract evolution | Versioned surfaces must be immutable and reviewable | `(surface_id, version)` and descriptor `(name, version)` cannot be overwritten; deprecation preserves history |

**Gate result**: Pass. F08.5 implements the roadmap's tool dispatcher defense-in-depth layer before F08 runtime execution. Mandatory `/security-review` remains required before closure because the feature gates least-privilege tool access.

## Project Structure

### Documentation (this feature)

```text
.specify/specs/008-tool-surface-dispatcher/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── disclosure-routing-evidence.schema.yaml
│   ├── tool-advertisement.schema.yaml
│   ├── tool-catalog-version.schema.yaml
│   ├── tool-descriptor.schema.yaml
│   └── tool-dispatch-result.schema.yaml
└── tasks.md
```

### Source Code (repository root)

```text
packages/db/
├── src/schema/tool-surfaces.ts
├── migrations/0010_f08_5_tool_surface_dispatcher.sql
└── migrations/meta/_journal.json

packages/tool-dispatcher/
├── package.json
├── tsconfig.json
├── jest.config.js
├── eslint.config.js
├── src/
│   ├── index.ts
│   ├── types.ts
│   ├── validation.ts
│   ├── publish.ts
│   ├── resolver.ts
│   ├── dispatcher.ts
│   ├── disclosure.ts
│   ├── adapter-registry.ts
│   ├── import-boundary.ts
│   ├── review.ts
│   ├── repo.ts
│   ├── scopes.ts
│   └── __tests__/
└── scripts/
    └── f08-5-staged-dev-run.ts

docs/runbooks/
└── tool-surface-dispatcher.md
```

**Structure Decision**: Use a new `@spyglass/tool-dispatcher` package. Tool catalog and invocation policy are shared Parley infrastructure consumed by contracts, runners, privacy filtering, audit, and future external API surfaces; keeping it separate avoids embedding tool policy inside F07a contracts or the F08 runner.

## Phase 0 Research

See [research.md](research.md). All technical unknowns are resolved without remaining clarification markers.

## Phase 1 Design

See:

- [data-model.md](data-model.md)
- [quickstart.md](quickstart.md)
- [contracts/tool-descriptor.schema.yaml](contracts/tool-descriptor.schema.yaml)
- [contracts/tool-catalog-version.schema.yaml](contracts/tool-catalog-version.schema.yaml)
- [contracts/tool-advertisement.schema.yaml](contracts/tool-advertisement.schema.yaml)
- [contracts/tool-dispatch-result.schema.yaml](contracts/tool-dispatch-result.schema.yaml)
- [contracts/disclosure-routing-evidence.schema.yaml](contracts/disclosure-routing-evidence.schema.yaml)

## Implementation Phases

1. **Governance and contracts**: classify F08.5 tables, add retention/invariant entries, validate JSON schemas.
2. **Schema and package setup**: add tool-surface tables, migration, and `@spyglass/tool-dispatcher` package skeleton.
3. **Catalog publication path**: implement scoped publish/deprecate logic with immutable surface and descriptor enforcement.
4. **Contract resolution path**: implement F07a `checkToolSurface` adapter and per-contract advertisement.
5. **Dispatcher boundary**: implement adapter registry, invocation checks, input/output schema validation, unsupported-tool outcomes, and audit evidence.
6. **Disclosure routing and CI gates**: implement privacy-filter port, raw-output fail-closed behavior, and direct-call bypass detection.
7. **Review reads and closure**: implement scoped reads, staged run, runbook, `/speckit-analyze`, `/code-review`, `/security-review`, final verification.

## Risks

- **Side-runner bypasses dispatcher**: mitigated by explicit import-boundary tests, lint/type-check guard fixtures, and a package layout that keeps adapters unreachable from runner code.
- **Tool output leaks across sides**: mitigated by mandatory disclosure classes and fail-closed `counterparty_filtered` routing before F09 implementation.
- **Catalog version drift changes old contracts**: mitigated by immutable surface versions and contract-pinned descriptor refs.
- **Unsupported tool terminates negotiation**: mitigated by stable `tool_unsupported` results that allow the turn to continue.
- **Real adapter behavior exceeds descriptor schema**: mitigated by output validation before successful dispatch results are returned.
- **F08/F09 ownership blurs**: mitigated by a boundary-only privacy-filter port and no full runner orchestration.

## Post-Design Constitution Re-check

| Article | Result |
| --- | --- |
| §I.1 | Pass: `counterparty_filtered` outputs cannot be raw counterparty-visible data |
| §I.2 | Pass: catalog versions, descriptors, dispatch results, and routing evidence are reconstructable |
| §I.5.2 | Pass: dispatcher enforces scoped authorization and per-contract availability |
| §I.5.3 | Pass: privileged catalog mutations and tool outcomes are attributable |
| §I.6 | Pass: dispatcher-only invocation and fail-closed routing provide defense in depth |
| §II | Pass: agents receive machine-readable advertised capabilities |
| §III.2 | Pass: descriptor and dispatch contracts are typed and schema-validated |
| §III.3 | Pass: tool surfaces are immutable and historically reviewable |

**Gate result**: Pass. No complexity exceptions required.

## Complexity Tracking

No constitution violations or complexity exceptions.
