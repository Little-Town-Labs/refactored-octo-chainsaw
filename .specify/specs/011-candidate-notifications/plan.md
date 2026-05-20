# Implementation Plan: F11 Candidate Notification Artifact System

**Branch**: `011-candidate-notifications` | **Date**: 2026-05-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `.specify/specs/011-candidate-notifications/spec.md`

## Summary

F11 adds Spyglass' candidate notification artifact spine: immutable notice template versions, structured candidate notice artifacts created from `dossier.produced` evidence, jurisdiction timing evidence, delivery readiness gates, channel-agnostic delivery commands, canonical audit evidence, and scoped review reads.

The technical approach extends the TypeScript monorepo with:

- New Drizzle schema/migration modules in `@spyglass/db`.
- A new `@spyglass/notifications` package for template publication, artifact creation, timing evidence, delivery gate checks, delivery command generation, review reads, and staged fixtures.
- F06-compatible jurisdiction policy refs and F10-compatible dossier refs without duplicating dossier content.
- JSON Schema contracts for notice templates, notification artifacts, gate evaluations, delivery commands, and timing evidence.

## Technical Context

**Language/Version**: TypeScript, Node 24, ESM.

**Primary Dependencies**: Existing Drizzle ORM, `@spyglass/db`, `@spyglass/auth`, `@spyglass/audit-log`, `@spyglass/dossiers`; Node `crypto` for canonical content hashing. No model invocation and no channel transport invocation.

**Storage**: PostgreSQL/Neon through Drizzle migrations. New F11 tables: `candidate_notice_template_versions`, `candidate_notification_artifacts`, `candidate_notification_gate_events`, and `candidate_notification_delivery_commands`.

**Testing**: Jest unit/integration tests, package type-check, ESLint, schema-lint, JSON Schema contract validation tests, canonical hash regression tests, delivery gate tests, scoped review tests, and staged dev quickstart run.

**Target Platform**: Existing Next.js/Vercel server-side monorepo with package-level domain logic and Drizzle-backed persistence.

**Project Type**: Monorepo package + database schema + server integration surface. F11 is backend/compliance infrastructure, not a user-facing page or channel sender.

**Performance Goals**: Seeded local artifact creation should complete under 100ms p95; delivery gate evaluation should complete under 50ms p95 for one match-ticket artifact set.

**Constraints**: Immutable template versions; deterministic content hashes; delivery gate fails closed; no raw transcript expansion; no channel sending; scoped review only; candidate recipient refs required before delivery command creation.

**Scale/Scope**: Initial candidate notice artifacts for one match ticket/run/dossier at a time, with active template and policy refs. F08 will call this package when `dossier.produced` exists; F16-F19 will consume delivery commands later.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | F11 compliance plan |
| --- | --- | --- |
| §I.A primitive 4 | Candidate notification artifacts are mandatory | F11 creates structured, timestamped, versioned artifacts tied to match tickets |
| §I.4 Privacy | Notices must not leak unnecessary data | Artifacts store content refs and safe dossier metadata, not raw transcript content |
| §I.5.2 Authorization | Need-to-know and least privilege | Scoped review reads deny unscoped access |
| §I.6 Defense in Depth | Missing evidence defaults to refuse | Delivery gate refuses missing/stale/not-yet-eligible notice evidence |
| §I.2 Integrity | Compliance evidence must be reconstructable | Immutable templates/artifacts, content hashes, and audit refs preserve notice evidence |
| §III.2 Agent semantics | Interfaces should be typed and machine-readable | JSON Schema contracts define notification artifact and command shapes |

**Gate result**: Pass. F11 implements the candidate notification primitive before F08 runtime delivery.

## Project Structure

### Documentation (this feature)

```text
.specify/specs/011-candidate-notifications/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── notice-template-version.schema.yaml
│   ├── candidate-notification-artifact.schema.yaml
│   ├── notice-timing-evidence.schema.yaml
│   ├── notification-gate-evaluation.schema.yaml
│   └── notification-delivery-command.schema.yaml
└── tasks.md
```

### Source Code (repository root)

```text
packages/db/
├── src/schema/candidate-notifications.ts
├── migrations/0013_f11_candidate_notifications.sql
└── migrations/meta/_journal.json

packages/notifications/
├── package.json
├── tsconfig.json
├── jest.config.js
├── eslint.config.js
├── src/
│   ├── index.ts
│   ├── types.ts
│   ├── canonicalize.ts
│   ├── templates.ts
│   ├── artifacts.ts
│   ├── timing.ts
│   ├── gate.ts
│   ├── delivery.ts
│   ├── review.ts
│   ├── repo.ts
│   ├── scopes.ts
│   └── __tests__/
└── scripts/
    └── f11-staged-dev-run.ts

docs/runbooks/
└── candidate-notifications.md
```

**Structure Decision**: Use a new `@spyglass/notifications` package. Candidate notification artifact logic will be consumed by F08 runner and future F16-F19 channel adapters without binding F11 to channel transport.

## Phase 0 Research

See [research.md](research.md). All technical unknowns are resolved without remaining clarification markers.

## Phase 1 Design

See:

- [data-model.md](data-model.md)
- [quickstart.md](quickstart.md)
- [contracts/notice-template-version.schema.yaml](contracts/notice-template-version.schema.yaml)
- [contracts/candidate-notification-artifact.schema.yaml](contracts/candidate-notification-artifact.schema.yaml)
- [contracts/notice-timing-evidence.schema.yaml](contracts/notice-timing-evidence.schema.yaml)
- [contracts/notification-gate-evaluation.schema.yaml](contracts/notification-gate-evaluation.schema.yaml)
- [contracts/notification-delivery-command.schema.yaml](contracts/notification-delivery-command.schema.yaml)

## Implementation Phases

1. **Governance and contracts**: classify F11 tables, add retention/invariant entries, validate JSON schemas.
2. **Schema and package setup**: add notification tables, migration, and `@spyglass/notifications` package skeleton.
3. **Template and artifact path**: implement immutable template publication, deterministic artifact creation, content hashes, and event refs.
4. **Timing and gate path**: implement timing evidence and fail-closed delivery gate reason codes.
5. **Delivery command path**: implement channel-agnostic deterministic command generation without sending messages.
6. **Review path**: implement scoped reads for templates, artifacts, gate events, and commands.
7. **Closure**: implement staged run, runbook, `/speckit-analyze`, `/code-review`, `/security-review`, final verification.

## Risks

- **Notice evidence drift**: mitigated by immutable template versions and artifact content hashes.
- **Premature delivery**: mitigated by fail-closed gate decisions and earliest eligible delivery timestamps.
- **Cross-side leakage**: mitigated by storing safe content refs and not expanding raw dossier/transcript content.
- **Jurisdiction ambiguity**: mitigated by explicit jurisdiction refs, policy refs, and stable refusal reason codes.
- **Channel coupling**: mitigated by delivery commands that do not invoke channel adapters.

## Post-Design Constitution Re-check

| Article | Result |
| --- | --- |
| §I.A primitive 4 | Pass: F11 creates structured candidate notification artifacts |
| §I.4 | Pass: artifacts store safe notice content refs, not raw transcript payloads |
| §I.5.2 | Pass: review reads are scoped |
| §I.6 | Pass: missing/stale/not-yet-eligible evidence refuses delivery |
| §I.2 | Pass: immutable templates, content hashes, and audit refs preserve evidence |
| §III.2 | Pass: notification artifacts and commands are schema-defined |

**Gate result**: Pass. No complexity exceptions required.

## Complexity Tracking

No constitution violations or complexity exceptions.
