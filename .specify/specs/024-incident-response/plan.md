# Implementation Plan: Incident Response + Breach Notification + Monitoring

**Branch**: `024-incident-response` | **Date**: 2026-05-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `.specify/specs/024-incident-response/spec.md`

## Summary

F24 establishes Spyglass' incident-response capability for Phase 0 readiness: typed monitoring-signal classification, durable incident lifecycle records, breach-notification deadline tracking, minimal evidence references, counsel/operator export packets, Sentry production configuration hardening, and runbook/tabletop evidence. The implementation will add a focused `@spyglass/incident-response` package, F24 Drizzle schema tables, monitoring contract fixtures, environment validation updates, and runbooks that connect existing audit-log, privacy-filter, auth, employer API/webhook, and credential-compromise evidence into one accountable response workflow.

## Technical Context

**Language/Version**: TypeScript strict, Node 24, ESM package output.

**Primary Dependencies**: Existing `@spyglass/db`, `@spyglass/audit-log`, `@spyglass/auth`, `@spyglass/shared`, Drizzle schema primitives, Zod schemas, Jest, Sentry DSN environment variable already reserved in `packages/shared/src/env.ts`.

**Storage**: Neon Postgres via Drizzle. Add F24 incident response tables for monitoring signals, incidents, incident timeline entries, evidence references, notification obligations, corrective actions, and tabletop exercises.

**Testing**: Jest package tests for signal classification, incident lifecycle transitions, breach deadline computation, evidence export, and environment validation; schema convention tests; workspace `pnpm` gates.

**Target Platform**: Vercel-hosted web/runtime and worker-adjacent TypeScript packages. Initial delivery is package/runbook/contract first; no operator UI is required for F24 closure.

**Project Type**: Brownfield monorepo package plus schema/docs integration.

**Performance Goals**: Signal classification is synchronous and deterministic; notification-deadline scans operate on bounded active incident sets; evidence packet export avoids large payload copies.

**Constraints**: Fail-safe severity for cross-side leakage and audit-chain failures; append-only timeline semantics; principal attribution for operator updates; minimal evidence references instead of duplicating sensitive personal data; no F25 alpha-consent surfaces; no automated legal conclusions.

**Scale/Scope**: One internal incident-response package, one schema module, one monitoring-signal contract, runbooks/tabletop docs, and focused tests/evidence for Stage 8 readiness.

## Constitution Check

| Article | Status | F24 posture |
| --- | --- | --- |
| I.1 Confidentiality | PASS | Cross-side leakage is hard-coded sev-1 and evidence references avoid copying extra personal data. |
| I.2 Integrity | PASS | Audit-log integrity failures are sev-1 signals; incident timelines are append-only and attributable. |
| I.3 Availability | PASS | Recovery runbooks and missed-deadline alerts are explicit operational artifacts. |
| I.4 Privacy | PASS | Evidence preservation uses minimal references and tracks personal-data breach determinations. |
| I.5 AAA | PASS | Operator timeline entries and incident actions are principal-attributed; no anonymous mutation surface is added. |
| I.6 Defense in Depth | PASS | Monitoring covers multiple layers and production-like Sentry config fails safe. |
| I.D Incident Response | PASS | Detection, response, recovery, post-incident review, breach clocks, and cross-side sev-1 handling are primary deliverables. |
| II Agent-Native | PASS | Monitoring-signal and incident contracts are typed machine-readable operational surfaces. |
| III Dual-Audience Surfaces | PASS | Internal contracts serve automation; runbooks and tabletop docs serve operators. |
| IV Separation of Concerns | PASS | F24 stays in operations/IR; F25 alpha posture, status pages, and final counsel sign-off are excluded. |

## Project Structure

### Documentation (this feature)

```text
.specify/specs/024-incident-response/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── monitoring-signal.schema.yaml
├── reviews/
│   ├── threat-model.md
│   ├── security-review.md
│   └── code-review.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/incident-response/
├── package.json
├── tsconfig.json
├── jest.config.js
├── eslint.config.js
└── src/
    ├── classifier.ts
    ├── deadlines.ts
    ├── evidence.ts
    ├── export.ts
    ├── incident.ts
    ├── index.ts
    ├── schemas.ts
    ├── tabletop.ts
    └── types.ts

packages/db/src/schema/
└── incident-response.ts

docs/runbooks/
├── incident-response.md
└── incident-response-tabletop.md

docs/architecture/
└── monitoring-signals.md
```

**Structure Decision**: F24 uses a package-first shape so monitoring classifiers, incident lifecycle rules, and breach-deadline calculations can be tested without a UI. Drizzle schema lives in `packages/db`, while human operating procedures live under `docs/runbooks`.

## Phase 0: Research

Completed in [research.md](./research.md).

## Phase 1: Design & Contracts

Completed artifacts:

- [data-model.md](./data-model.md)
- [contracts/monitoring-signal.schema.yaml](./contracts/monitoring-signal.schema.yaml)
- [quickstart.md](./quickstart.md)

## Constitution Check (Post-Design)

No constitutional or structural violations require complexity exceptions. F24 directly implements Article I.D and supports Stage 8 readiness; closure requires threat model, security review, tabletop evidence, environment validation evidence, and analyze pass before PR publication.

## Complexity Tracking

No violations.
