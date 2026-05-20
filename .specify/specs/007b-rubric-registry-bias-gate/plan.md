# Implementation Plan: F07b Rubric Registry + Bias-Test Dispatch Gate

**Branch**: `007b-rubric-registry-bias-gate` | **Date**: 2026-05-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `.specify/specs/007b-rubric-registry-bias-gate/spec.md`

## Summary

F07b adds Spyglass' versioned Rubric Registry and dispatch-time bias-test gate: immutable `(rubric_id, version)` definitions, completed `bias_test_ref` enforcement, deterministic weighted scoring, model-holistic-score regression auditing, provenance/audit evidence, and scoped review reads.

The technical approach extends the existing TypeScript monorepo with:

- New Drizzle schema/migration modules in `@spyglass/db`.
- A new `@spyglass/rubrics` package for pure rubric validation, publication, bias-test artifact registration, dispatch gating, deterministic scoring, review reads, and Drizzle adapters.
- F05 `@spyglass/audit-log` integration for canonical rubric publication, bias-test registration, dispatch denial, and model-score-regression evidence.
- F07a `@spyglass/agent-contracts` integration through rubric ref validation while keeping contracts and rubric bodies independently versioned.
- Initial JSON Schema contracts for rubric versions, bias-test artifacts, dispatch gate results, and weighted score results.

## Technical Context

**Language/Version**: TypeScript, Node 24, ESM.

**Primary Dependencies**: Existing Drizzle ORM, `@spyglass/db`, `@spyglass/auth`, `@spyglass/audit-log`, `@spyglass/agent-contracts`; `zod` may be used for package-local validation.

**Storage**: PostgreSQL/Neon through Drizzle migrations. New F07b tables: `rubric_versions`, `rubric_events`, `bias_test_artifacts`, and `rubric_dispatch_gate_events`.

**Testing**: Jest unit/integration tests, package type-check, ESLint, schema-lint, contract schema validation tests, deterministic scoring tests, and a staged dev quickstart run.

**Target Platform**: Existing Next.js/Vercel server-side monorepo with package-level domain logic and Drizzle-backed persistence.

**Project Type**: Monorepo package + database schema + server integration surface. F07b is backend/compliance infrastructure, not a user-facing page.

**Performance Goals**: Rubric resolution and bias-test gate evaluation should complete under 50ms p95 in seeded local package tests; deterministic score aggregation should be pure and allocation-light for normal Parley dimension counts.

**Constraints**: Immutable `(rubric_id, version)` records; dispatch fails closed for missing/deprecated/unpublished/invalid rubrics and missing/incomplete/stale/mismatched bias-test evidence; prompt templates must not carry scoring weights or guidance; final weighted totals are harness-computed, never model-selected.

**Scale/Scope**: Phase 0/Phase 1 launch rubric set for seeker and employer scoring, with reason codes stable enough for F08, F10, F12, and future bias-audit evidence export.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | F07b compliance plan |
| --- | --- | --- |
| §I.2 Integrity | Rubrics, prompts, and scores are versioned; dossiers record exact rubric version and per-dimension scores | Immutable rubric versions, deterministic scoring, and preserved weighted-score metadata |
| §I.A primitive 3 | Bias-audit-ready dossier shape is mandatory | Dispatch gate requires completed bias-test evidence before production scoring |
| §I.A.1 AI standards | Support NIST AI RMF and related conformity evidence | Bias-test artifacts bind methodology, rubric hash, jurisdiction coverage, and audit evidence |
| §I.A.2 Bias audit cadence | Material rubric changes require bias audit | New rubric versions cannot dispatch without completed artifact tied to their content hash |
| §I.5 AAA | Privileged actions attributable to identified principals | Publication, deprecation, artifact registration, and scoped reads require principals/scopes |
| §I.6 Secure by default | Missing data defaults to refuse | Missing or invalid rubric/bias evidence denies dispatch with stable reason codes |
| §II Agent-Native | Agents need explicit machine-readable policy artifacts | Rubrics and gate results are typed, versioned, and dispatch-facing |
| §III.3 Contract evolution | Versioned surfaces must be immutable and reviewable | `(rubric_id, version)` cannot be overwritten; deprecation preserves historical reads |

**Gate result**: Pass. F07b implements the rubric/bias-test primitive required by the roadmap and constitution. Mandatory `/security-review` remains required before closure per roadmap.

## Project Structure

### Documentation (this feature)

```text
.specify/specs/007b-rubric-registry-bias-gate/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── bias-test-artifact.schema.yaml
│   ├── rubric-dispatch-gate.schema.yaml
│   ├── rubric-version.schema.yaml
│   └── weighted-score-result.schema.yaml
└── tasks.md
```

### Source Code (repository root)

```text
packages/db/
├── src/schema/rubrics.ts
├── migrations/0009_f07b_rubric_registry_bias_gate.sql
└── migrations/meta/_journal.json

packages/rubrics/
├── package.json
├── tsconfig.json
├── jest.config.js
├── src/
│   ├── index.ts
│   ├── types.ts
│   ├── validation.ts
│   ├── publish.ts
│   ├── bias-test.ts
│   ├── dispatch-gate.ts
│   ├── scoring.ts
│   ├── review.ts
│   ├── repo.ts
│   └── __tests__/
└── scripts/
    └── f07b-staged-dev-run.ts

docs/runbooks/
└── rubric-registry-bias-gate.md
```

**Structure Decision**: Use a new `@spyglass/rubrics` package. Rubrics are compliance policy artifacts consumed by Parley, contracts, audit, and future dossier generation; keeping the domain separate avoids embedding scoring policy inside F07a contracts or the F08 runner.

## Phase 0 Research

See [research.md](research.md). All technical unknowns are resolved without remaining clarification markers.

## Phase 1 Design

See:

- [data-model.md](data-model.md)
- [quickstart.md](quickstart.md)
- [contracts/rubric-version.schema.yaml](contracts/rubric-version.schema.yaml)
- [contracts/bias-test-artifact.schema.yaml](contracts/bias-test-artifact.schema.yaml)
- [contracts/rubric-dispatch-gate.schema.yaml](contracts/rubric-dispatch-gate.schema.yaml)
- [contracts/weighted-score-result.schema.yaml](contracts/weighted-score-result.schema.yaml)

## Implementation Phases

1. **Governance and contracts**: classify F07b tables, add retention/invariant entries, validate JSON schemas.
2. **Schema and package setup**: add rubric/bias-test tables, migration, and `@spyglass/rubrics` package skeleton.
3. **Rubric publication path**: implement scoped publish/deprecate logic with immutable write enforcement and canonical audit evidence.
4. **Bias-test evidence path**: implement artifact registration, status validation, rubric-hash binding, and jurisdiction coverage checks.
5. **Dispatch gate and scoring**: implement fail-closed gate evaluation, deterministic weighted scoring, and holistic-score regression audit signals.
6. **Review reads**: implement scoped rubric version, bias-test artifact, and dispatch-denial history reads.
7. **Quickstart, reviews, closure**: staged run, runbook, `/speckit-analyze`, `/code-review`, `/security-review`, final verification.

## Risks

- **Dispatch proceeds without valid bias evidence**: mitigated by fail-closed gate checks and CI coverage for each missing/incomplete/stale/mismatched artifact state.
- **Rubric version mutated after dispatch**: mitigated by unique immutable rows, content hash checks, and mutation rejection tests.
- **Prompt carries hidden scoring policy**: mitigated by validation and tests that reject prompt-embedded weights or scoring guidance in rubric-bound artifacts.
- **Model holistic score affects final outcome**: mitigated by pure deterministic aggregation and audit-only handling of model holistic scores.
- **F07a/F07b ownership blurred**: mitigated by contracts pinning rubric refs only; rubric bodies, weights, and bias artifacts remain F07b.

## Post-Design Constitution Re-check

| Article | Result |
| --- | --- |
| §I.2 | Pass: rubric versions, per-dimension scores, and weighted totals are versioned and reconstructable |
| §I.A | Pass: bias-audit-ready rubric evidence is a dispatch gate, not an after-the-fact report |
| §I.A.1 | Pass: bias-test artifacts retain methodology and coverage evidence for AI governance review |
| §I.A.2 | Pass: material rubric changes require a new version and completed artifact before dispatch |
| §I.5 | Pass: privileged mutations and scoped reads require principal attribution |
| §I.6 | Pass: missing evidence defaults to dispatch refusal |
| §II | Pass: dispatch-facing schemas are machine-readable and reason-coded |
| §III.3 | Pass: rubric versions are immutable and historically reviewable |

**Gate result**: Pass. No complexity exceptions required.

## Complexity Tracking

No constitution violations or complexity exceptions.
