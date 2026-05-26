# Implementation Plan: Phase 0 Alpha Posture Infrastructure

**Branch**: `025-phase-0-alpha-posture` | **Date**: 2026-05-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `.specify/specs/025-phase-0-alpha-posture/spec.md`

## Summary

F25 locks Spyglass into Phase 0 private-alpha posture: explicit seeker/employer alpha consent, informational-only dossier posture metadata, human-review approval before outreach, and counsel-review evidence checks before phase transition. The implementation adds a package-first `@spyglass/alpha-posture` module, F25 schema tables, runbook/docs, and tests that can be wired into seeker, employer, dossier, notification, and policy-gate surfaces.

## Technical Context

**Language/Version**: TypeScript strict, Node 24, ESM package output.

**Primary Dependencies**: Existing `@spyglass/db`, `@spyglass/dossiers`, `@spyglass/notifications`, `@spyglass/policy-gates`, `@spyglass/shared`, Drizzle schema primitives, Zod, Jest.

**Storage**: Neon Postgres via Drizzle. Add F25 alpha consent records, alpha human-review decisions, alpha posture gate decisions, and counsel evidence references.

**Testing**: Jest package tests for consent, dossier posture, human-review gate, counsel evidence, and schema conventions; workspace type-check/lint/build.

**Target Platform**: Vercel-hosted web/runtime and package consumers. Initial implementation is package/runbook/schema first.

**Project Type**: Brownfield monorepo package plus schema/docs integration.

**Performance Goals**: Gate evaluation is deterministic and synchronous over explicit inputs; no network dependency for posture decisions.

**Constraints**: Fail closed on missing consent, missing alpha dossier posture, missing human review, or missing counsel evidence; no public marketing launch; no production hiring decision support.

**Scale/Scope**: One internal package, one schema module, runbooks, Spec Kit artifacts, focused tests/evidence for Stage 8 readiness.

## Constitution Check

| Article | Status | F25 posture |
| --- | --- | --- |
| I.B.1 Phase 0 | PASS | Enforces explicit consent, informational-only outputs, and no production hiring decisions. |
| I.1 Confidentiality | PASS | No extra sensitive data collection; consent/evidence references are minimal. |
| I.2 Integrity | PASS | Human review and counsel evidence decisions are attributable and auditable. |
| I.4 Privacy | PASS | Phase 0 consent is distinct from demographic consent and can be withdrawn. |
| I.5 AAA | PASS | Reviewer and evidence actions are principal-attributed. |
| V.2 Governance | PASS | Phase transition readiness fails closed without signed dated counsel evidence. |
| IV Separation of Concerns | PASS | F25 does not implement public marketing, production hiring, or Phase 1 jurisdiction launch. |

## Project Structure

### Documentation (this feature)

```text
.specify/specs/025-phase-0-alpha-posture/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── alpha-posture.schema.yaml
├── reviews/
│   ├── threat-model.md
│   ├── security-review.md
│   └── code-review.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/alpha-posture/
├── package.json
├── tsconfig.json
├── jest.config.js
├── eslint.config.js
└── src/
    ├── consent.ts
    ├── counsel.ts
    ├── dossier.ts
    ├── gate.ts
    ├── index.ts
    ├── schemas.ts
    └── types.ts

packages/db/src/schema/
└── alpha-posture.ts

docs/runbooks/
└── phase-0-alpha-posture.md
```

**Structure Decision**: F25 uses a package-first shape so every consuming surface can share one fail-closed alpha posture decision path.

## Phase 0: Research

Completed in [research.md](./research.md).

## Phase 1: Design & Contracts

Completed artifacts:

- [data-model.md](./data-model.md)
- [contracts/alpha-posture.schema.yaml](./contracts/alpha-posture.schema.yaml)
- [quickstart.md](./quickstart.md)

## Constitution Check (Post-Design)

No constitutional or structural violations require complexity exceptions. F25 directly implements Constitution §I.B.1 and §V.2; closure requires threat model, security review, counsel evidence runbook, quickstart evidence, and analyze pass before PR publication.

## Complexity Tracking

No violations.
