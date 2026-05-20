# Implementation Plan: F09 Privacy Filter

**Branch**: `009-privacy-filter` | **Date**: 2026-05-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `.specify/specs/009-privacy-filter/spec.md`

## Summary

F09 adds Spyglass' deterministic, no-model privacy filter: immutable privacy rulesets with disclosure stages, sentinel wrapping/validation for untrusted text, counterparty-safe filtered projections, F08.5-compatible `counterparty_filtered` handling, no-gateway-reachability guards, counterparty-access boundary guards, canonical audit evidence, and scoped review reads.

The technical approach extends the existing TypeScript monorepo with:

- New Drizzle schema/migration modules in `@spyglass/db`.
- A new `@spyglass/privacy-filter` package for ruleset publication, sentinel envelopes, deterministic filtering, F08.5 privacy-filter port integration, bypass guards, review reads, and quickstart fixtures.
- F05 `@spyglass/audit-log` integration for ruleset publication, filter decisions, sentinel failures, and bypass findings.
- F08.5 integration by implementing the privacy-filter port shape without making tool-dispatcher depend on privacy-filter.
- JSON Schema contracts for rulesets, sentinel envelopes, filtered projections, filter decisions, and access-boundary findings.

## Technical Context

**Language/Version**: TypeScript, Node 24, ESM.

**Primary Dependencies**: Existing Drizzle ORM, `@spyglass/db`, `@spyglass/auth`, `@spyglass/audit-log`, `@spyglass/tool-dispatcher`; `zod` may be used for validation. No AI gateway/model client dependency is permitted.

**Storage**: PostgreSQL/Neon through Drizzle migrations. New F09 tables: `privacy_ruleset_versions`, `privacy_filter_decisions`, `sentinel_failures`, and `counterparty_access_findings`.

**Testing**: Jest unit/integration tests, package type-check, ESLint, schema-lint, contract schema validation tests, no-gateway-reachability guard, sentinel-injection tests, counterparty-access bypass fixture tests, F08.5 privacy-filter-port tests, and staged dev quickstart run.

**Target Platform**: Existing Next.js/Vercel server-side monorepo with package-level domain logic and Drizzle-backed persistence.

**Project Type**: Monorepo package + database schema + server integration surface. F09 is backend/compliance infrastructure, not a user-facing page.

**Performance Goals**: Filtering should be deterministic and bounded; normal seeded local filter calls should complete under 50ms p95 for current Parley turn-sized payloads.

**Constraints**: No model/gateway imports or calls; missing/invalid rulesets fail closed; invalid sentinels fail closed; counterparty data is accessible only through filtered views; raw sensitive payloads are not stored in review evidence by default.

**Scale/Scope**: Initial rulesets for seeker-to-employer and employer-to-seeker projections, plus tool-returned `counterparty_filtered` outputs. Rule semantics must be stable enough for F08 runner, F10 dossier projections, F12 manifests, and future counsel review.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | F09 compliance plan |
| --- | --- | --- |
| §I.1 Confidentiality | Privacy filter is non-bypassable | Filter owns counterparty views and CI guards reject bypass access |
| §I.4 Privacy | Minimize disclosure and purpose-bound output | Rulesets expose only allowed fields per audience/stage |
| §I.5.2 Authorization | Need-to-know and least privilege | Scoped review reads and side-runner access boundaries constrain data paths |
| §I.6 Defense in Depth | Secure defaults and no silent bypass | Missing rulesets, invalid sentinels, and filter errors fail closed |
| §I.A.1 AI standards | OWASP LLM prompt-injection protections | Sentinel wrapping and injection tests protect untrusted input boundaries |
| §II Agent-Native | Agents need typed machine-readable policy artifacts | Rulesets, decisions, and filtered projections are versioned and typed |
| §III.2 Agent semantics | Interfaces should be typed and machine-readable | JSON Schema contracts define rulesets, envelopes, projections, and findings |
| §III.3 Contract evolution | Versioned surfaces must be immutable and reviewable | `(ruleset_id, version)` cannot be overwritten; deprecation preserves history |

**Gate result**: Pass. F09 implements the roadmap's non-bypassable privacy boundary before F08 runtime execution. Mandatory `/security-review` remains required before closure.

## Project Structure

### Documentation (this feature)

```text
.specify/specs/009-privacy-filter/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── counterparty-access-finding.schema.yaml
│   ├── filter-decision.schema.yaml
│   ├── filtered-projection.schema.yaml
│   ├── privacy-ruleset.schema.yaml
│   └── untrusted-input-envelope.schema.yaml
└── tasks.md
```

### Source Code (repository root)

```text
packages/db/
├── src/schema/privacy-filter.ts
├── migrations/0011_f09_privacy_filter.sql
└── migrations/meta/_journal.json

packages/privacy-filter/
├── package.json
├── tsconfig.json
├── jest.config.js
├── eslint.config.js
├── src/
│   ├── index.ts
│   ├── types.ts
│   ├── validation.ts
│   ├── publish.ts
│   ├── sentinel.ts
│   ├── filter.ts
│   ├── tool-port.ts
│   ├── reachability.ts
│   ├── access-boundary.ts
│   ├── review.ts
│   ├── repo.ts
│   ├── scopes.ts
│   └── __tests__/
└── scripts/
    └── f09-staged-dev-run.ts

docs/runbooks/
└── privacy-filter.md
```

**Structure Decision**: Use a new `@spyglass/privacy-filter` package. Privacy rules and deterministic filtering are shared Parley infrastructure consumed by F08 side runners, F08.5 tool outputs, F10 dossier projections, and later external review surfaces.

## Phase 0 Research

See [research.md](research.md). All technical unknowns are resolved without remaining clarification markers.

## Phase 1 Design

See:

- [data-model.md](data-model.md)
- [quickstart.md](quickstart.md)
- [contracts/privacy-ruleset.schema.yaml](contracts/privacy-ruleset.schema.yaml)
- [contracts/untrusted-input-envelope.schema.yaml](contracts/untrusted-input-envelope.schema.yaml)
- [contracts/filtered-projection.schema.yaml](contracts/filtered-projection.schema.yaml)
- [contracts/filter-decision.schema.yaml](contracts/filter-decision.schema.yaml)
- [contracts/counterparty-access-finding.schema.yaml](contracts/counterparty-access-finding.schema.yaml)

## Implementation Phases

1. **Governance and contracts**: classify F09 tables, add retention/invariant entries, validate JSON schemas.
2. **Schema and package setup**: add privacy filter tables, migration, and `@spyglass/privacy-filter` package skeleton.
3. **Ruleset publication path**: implement scoped publish/deprecate logic with immutable ruleset enforcement.
4. **Sentinel path**: implement untrusted input envelopes, nonce-bound sentinel validation, and injection refusal.
5. **Filter path**: implement deterministic redaction/refusal, filtered projections, F08.5 privacy-filter port, and fail-closed outcomes.
6. **CI guard path**: implement no-gateway-reachability and counterparty-access bypass guards.
7. **Review reads and closure**: implement scoped reads, staged run, runbook, `/speckit-analyze`, `/code-review`, `/security-review`, final verification.

## Risks

- **Model dependency sneaks into filter**: mitigated by package dependency policy and no-gateway-reachability guard.
- **Prompt injection escapes sentinel wrapper**: mitigated by nonce-bound sentinels and forged/mismatched sentinel tests.
- **Raw counterparty data bypasses filter**: mitigated by side-runner access-boundary guard.
- **Ruleset drift changes historical projections**: mitigated by immutable ruleset versions and projection evidence storing ruleset refs.
- **Filter over-redacts useful context**: mitigated by deterministic redaction summaries and ruleset version evolution.

## Post-Design Constitution Re-check

| Article | Result |
| --- | --- |
| §I.1 | Pass: counterparty views are filter-owned and bypass-guarded |
| §I.4 | Pass: deterministic rulesets minimize disclosed fields |
| §I.5.2 | Pass: review and counterparty access are scoped |
| §I.6 | Pass: invalid/missing data fails closed |
| §I.A.1 | Pass: sentinel tests cover prompt-injection boundaries |
| §II | Pass: rulesets and projections are machine-readable |
| §III.2 | Pass: contracts are schema-defined |
| §III.3 | Pass: rulesets are immutable and historically reviewable |

**Gate result**: Pass. No complexity exceptions required.

## Complexity Tracking

No constitution violations or complexity exceptions.
