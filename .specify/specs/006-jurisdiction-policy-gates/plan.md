# Implementation Plan: F06 Jurisdiction Policy Gates

**Branch**: `006-jurisdiction-policy-gates` | **Date**: 2026-05-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `.specify/specs/006-jurisdiction-policy-gates/spec.md`

## Summary

F06 adds Spyglass' jurisdiction compliance control layer: a versioned jurisdiction posture store, fail-safe policy gate evaluator, no-deploy geographic kill switches, structured failure artifacts, scoped review reads, and canonical audit evidence for every gate decision and kill-switch change.

The technical approach extends the existing TypeScript monorepo with:

- New Drizzle schema/migration modules in `@spyglass/db`.
- A new `@spyglass/policy-gates` package for pure evaluator logic, scoped mutations/reads, and Drizzle adapters.
- F05 `@spyglass/audit-log` integration for canonical gate and kill-switch evidence.
- F04 ticket jurisdiction fields as source facts for seeker, employer, and match gate inputs.
- JSON Schema contracts for gate decisions, kill-switch changes, and failure artifacts.

## Technical Context

**Language/Version**: TypeScript, Node 24, ESM.

**Primary Dependencies**: Existing Drizzle ORM, `@spyglass/db`, `@spyglass/auth`, `@spyglass/tickets`, `@spyglass/audit-log`; `zod` may be used for package-local input validation if needed.

**Storage**: PostgreSQL/Neon through Drizzle migrations. New F06 tables: `jurisdiction_policies`, `jurisdiction_gate_decisions`, and `jurisdiction_kill_switch_events`.

**Testing**: Jest unit/integration tests, package type-check, ESLint, schema-lint, contract schema validation tests, and a staged dev quickstart run.

**Target Platform**: Existing Next.js/Vercel server-side monorepo with package-level domain logic and Drizzle-backed persistence.

**Project Type**: Monorepo package + database schema + server integration surface. F06 is backend/compliance infrastructure, not a user-facing page by itself.

**Performance Goals**: Gate evaluation should complete under 50ms p95 in seeded local package tests; kill-switch changes should affect new decisions within one minute without deployment; decision-history reads should be bounded and paginated.

**Constraints**: Fail-safe deny for missing/unknown/inactive/disabled jurisdictions; no raw personal data in failure artifacts; every privileged mutation attributable to a principal; no-deploy kill switches; all gate decisions and kill-switch changes audited through F05.

**Scale/Scope**: Phase 0/Phase 1 bounded US-jurisdiction launch posture, with the schema and reason codes stable enough for F08, F10, and F24 to consume.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | F06 compliance plan |
| --- | --- | --- |
| §I.3 Availability | Geographic kill switches flip without deploy; policy-gate failure produces structured failure dossier | Store active posture in DB, expose scoped mutation path, return structured failure artifacts for denials |
| §I.5 AAA | Privileged actions attributable to identified principals | Kill-switch changes require scoped principals and canonical audit events |
| §I.6 Secure by default | Fail-safe defaults; access defaults deny | Missing/unknown/inactive/disabled jurisdiction returns deny; unscoped reads/mutations fail |
| §I.A primitives 1,2,5 | Jurisdiction tagging, per-jurisdiction gates, geographic kill switches | Consume F04 jurisdiction facts, evaluate before downstream transitions/dispatch, persist kill-switch events |
| §I.D Forensic readiness | Incident evidence preserved | Gate decisions and kill-switch changes have audit links and bounded review/export paths |
| §IV.A Test-first discipline | Critical behavior proven by tests | Gate evaluator, authorization, mutation, and failure artifact tests start RED |

**Gate result**: Pass. F06 directly implements the jurisdiction and kill-switch constitutional controls. Mandatory `/security-review` remains required before closure per roadmap.

## Project Structure

### Documentation (this feature)

```text
.specify/specs/006-jurisdiction-policy-gates/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── failure-artifact.schema.yaml
│   ├── gate-decision.schema.yaml
│   └── kill-switch-event.schema.yaml
└── tasks.md
```

### Source Code (repository root)

```text
packages/db/
├── src/schema/jurisdiction-policy.ts
├── migrations/0007_f06_jurisdiction_policy_gates.sql
└── migrations/meta/_journal.json

packages/policy-gates/
├── package.json
├── tsconfig.json
├── jest.config.js
├── eslint.config.js
├── src/
│   ├── index.ts
│   ├── evaluator.ts
│   ├── kill-switch.ts
│   ├── repo.ts
│   ├── review.ts
│   └── __tests__/
└── scripts/
    └── f06-staged-dev-run.ts

docs/runbooks/
└── jurisdiction-policy-gates.md

docs/data-governance/
├── data-classification.yaml
├── integrity-invariants.md
└── retention-policy.md
```

**Structure Decision**: Use a new `@spyglass/policy-gates` package. The domain is substantial enough to merit its own package, and keeping it separate prevents gate logic from being buried inside F04 ticket repositories or F08 runner code. Schemas remain in `@spyglass/db`; audit evidence remains in `@spyglass/audit-log`.

## Phase 0 Research

See [research.md](research.md). All technical unknowns are resolved without remaining clarification markers.

## Phase 1 Design

See:

- [data-model.md](data-model.md)
- [quickstart.md](quickstart.md)
- [contracts/gate-decision.schema.yaml](contracts/gate-decision.schema.yaml)
- [contracts/kill-switch-event.schema.yaml](contracts/kill-switch-event.schema.yaml)
- [contracts/failure-artifact.schema.yaml](contracts/failure-artifact.schema.yaml)

## Implementation Phases

1. **Governance and contracts**: classify F06 tables, add retention/invariant entries, validate JSON schemas.
2. **Schema and package setup**: add jurisdiction policy tables, migration, and `@spyglass/policy-gates` package skeleton.
3. **Gate evaluator**: implement deterministic allow/deny logic and structured failure artifacts.
4. **Kill-switch mutation path**: implement scoped operator mutation, closed-list reasons, and audit evidence.
5. **Review reads**: implement scoped posture and bounded decision-history reads.
6. **Integration adapters**: expose F04/F08/F10-compatible seams and F05 canonical audit linkage.
7. **Quickstart, reviews, closure**: staged run, runbook, `/speckit-analyze`, `/code-review`, `/security-review`, final verification.

## Risks

- **Mis-tagged or missing jurisdiction silently proceeds**: mitigated by fail-safe deny and tests for missing/unknown values.
- **Kill switch update lacks legal traceability**: mitigated by closed-list reason, principal attribution, and canonical audit event.
- **Policy history becomes unreviewable after posture changes**: mitigated by immutable decision rows and separate kill-switch event rows.
- **F08/F10 consume unstable denial semantics**: mitigated by schema contracts and stable reason-code enums.

## Post-Design Constitution Re-check

| Article | Result |
| --- | --- |
| §I.3 | Pass: kill switches are DB-backed and no-deploy; denials produce structured artifacts |
| §I.5 | Pass: privileged mutations require scoped principal and canonical audit |
| §I.6 | Pass: default-deny semantics are encoded as requirements, data model states, and quickstart scenarios |
| §I.A | Pass: F06 implements jurisdiction tagging consumption, policy gates, and kill switches |
| §I.D | Pass: decisions and switches are retained as reviewable evidence |

**Gate result**: Pass. No complexity exceptions required.

## Complexity Tracking

No constitution violations or complexity exceptions.
