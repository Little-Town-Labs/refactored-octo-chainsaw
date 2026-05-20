# Implementation Plan: F10 Dossier Builder + Signer

**Branch**: `010-dossier-builder-signer` | **Date**: 2026-05-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `.specify/specs/010-dossier-builder-signer/spec.md`

## Summary

F10 adds Spyglass' deterministic dossier artifact layer: dossier assembly from run evidence, pre-computed per-audience projections, per-side rubric breakdowns, reconciled flags, inconclusive dossier support, deterministic canonical signing, verification helpers, canonical audit evidence, and scoped review reads.

The technical approach extends the TypeScript monorepo with:

- New Drizzle schema/migration modules in `@spyglass/db`.
- A new `@spyglass/dossiers` package for canonical dossier assembly, projection storage, signing, verification, review reads, and staged fixtures.
- F05 `@spyglass/audit-log` integration for dossier build/sign/verify evidence.
- F07b and F09-compatible type surfaces for rubric breakdowns and privacy projection refs without making the runner depend on delivery-time filtering.
- JSON Schema contracts for dossier artifacts, projections, signatures, verification results, and inconclusive flags.

## Technical Context

**Language/Version**: TypeScript, Node 24, ESM.

**Primary Dependencies**: Existing Drizzle ORM, `@spyglass/db`, `@spyglass/auth`, `@spyglass/audit-log`, `@spyglass/privacy-filter`; Node `crypto` for Ed25519 signing/verification in package tests. No model invocation.

**Storage**: PostgreSQL/Neon through Drizzle migrations. New F10 tables: `dossier_artifacts`, `dossier_projections`, `dossier_signatures`, and `dossier_verification_events`.

**Testing**: Jest unit/integration tests, package type-check, ESLint, schema-lint, contract schema validation tests, canonicalization regression tests, signing/verification tamper tests, scoped review tests, and staged dev quickstart run.

**Target Platform**: Existing Next.js/Vercel server-side monorepo with package-level domain logic and Drizzle-backed persistence.

**Project Type**: Monorepo package + database schema + server integration surface. F10 is backend/compliance infrastructure, not a user-facing page.

**Performance Goals**: Normal seeded local dossier builds should complete under 100ms p95; verification should complete under 50ms p95 for current dossier-sized payloads.

**Constraints**: Deterministic canonicalization; signing excludes only signature object; no delivery-time projection derivation; unscoped review denied; missing required projections fail closed unless explicitly inconclusive.

**Scale/Scope**: Initial dossier artifacts for one Parley run at a time with four stored audience projections and per-side rubric breakdowns. F08 will call this package after runner evidence exists.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | F10 compliance plan |
| --- | --- | --- |
| §I.2 Integrity | Dossiers must be tamper-evident | Canonical content hash and signature cover all dossier fields except signature |
| §I.4 Privacy | Audience projections must minimize disclosure | Projections are pre-computed from F09-filtered inputs and stored per audience |
| §I.5.2 Authorization | Need-to-know and least privilege | Scoped review reads deny unscoped dossier evidence access |
| §I.6 Defense in Depth | Secure defaults and structured failure | Missing projection/signature errors fail closed or produce explicit inconclusive flags |
| §I.C Cryptographic | Approved signing and crypto agility | Signing abstraction records algorithm, key id, canonicalization version, and verification reason codes |
| §II Agent-Native | Agents need typed artifacts | Dossier contracts are machine-readable and versioned |
| §III.2 Agent semantics | Interfaces should be typed and machine-readable | JSON Schema contracts define dossier, projection, signature, and verification shapes |

**Gate result**: Pass. F10 implements the signed terminal artifact before F08 runtime delivery.

## Project Structure

### Documentation (this feature)

```text
.specify/specs/010-dossier-builder-signer/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── dossier-artifact.schema.yaml
│   ├── dossier-projection.schema.yaml
│   ├── dossier-signature.schema.yaml
│   ├── verification-result.schema.yaml
│   └── inconclusive-flag.schema.yaml
└── tasks.md
```

### Source Code (repository root)

```text
packages/db/
├── src/schema/dossiers.ts
├── migrations/0012_f10_dossier_builder_signer.sql
└── migrations/meta/_journal.json

packages/dossiers/
├── package.json
├── tsconfig.json
├── jest.config.js
├── eslint.config.js
├── src/
│   ├── index.ts
│   ├── types.ts
│   ├── canonicalize.ts
│   ├── build.ts
│   ├── projections.ts
│   ├── signing.ts
│   ├── verify.ts
│   ├── review.ts
│   ├── repo.ts
│   ├── scopes.ts
│   └── __tests__/
└── scripts/
    └── f10-staged-dev-run.ts

docs/runbooks/
└── dossier-builder-signer.md
```

**Structure Decision**: Use a new `@spyglass/dossiers` package. Dossier assembly, canonical signing, verification, and review reads are shared Parley infrastructure consumed by F08 runner, F11 notifications, F21 web delivery, and F23 employer APIs.

## Phase 0 Research

See [research.md](research.md). All technical unknowns are resolved without remaining clarification markers.

## Phase 1 Design

See:

- [data-model.md](data-model.md)
- [quickstart.md](quickstart.md)
- [contracts/dossier-artifact.schema.yaml](contracts/dossier-artifact.schema.yaml)
- [contracts/dossier-projection.schema.yaml](contracts/dossier-projection.schema.yaml)
- [contracts/dossier-signature.schema.yaml](contracts/dossier-signature.schema.yaml)
- [contracts/verification-result.schema.yaml](contracts/verification-result.schema.yaml)
- [contracts/inconclusive-flag.schema.yaml](contracts/inconclusive-flag.schema.yaml)

## Implementation Phases

1. **Governance and contracts**: classify F10 tables, add retention/invariant entries, validate JSON schemas.
2. **Schema and package setup**: add dossier tables, migration, and `@spyglass/dossiers` package skeleton.
3. **Canonical assembly path**: implement deterministic canonicalization, projection validation, and dossier build logic.
4. **Signing path**: implement signing, canonical signature exclusion, tamper detection, and verification reason codes.
5. **Inconclusive path**: implement structured flags and failure-dossier assembly.
6. **Review path**: implement scoped reads for dossier metadata, projections, signatures, and verification outcomes.
7. **Closure**: implement staged run, runbook, `/speckit-analyze`, `/code-review`, `/security-review`, final verification.

## Risks

- **Projection leakage**: mitigated by storing only F09-filtered projections and never deriving projections at delivery time.
- **Canonicalization drift**: mitigated by regression tests that reorder object keys and compare hashes.
- **Signature coverage gaps**: mitigated by tamper tests on signed fields and explicit signature-object exclusion.
- **Inconclusive ambiguity**: mitigated by closed-list flags and required resolution guidance.
- **Signing-key compromise**: mitigated initially by key id/algorithm evidence and future HSM/KMS integration through signing abstraction.

## Post-Design Constitution Re-check

| Article | Result |
| --- | --- |
| §I.2 | Pass: signature and content hash make dossier tamper-evident |
| §I.4 | Pass: projections are audience-bound and pre-computed |
| §I.5.2 | Pass: review reads are scoped |
| §I.6 | Pass: missing evidence fails closed or produces explicit inconclusive dossier |
| §I.C | Pass: signing metadata supports verification and crypto agility |
| §II | Pass: dossier artifacts are typed machine-readable outputs |
| §III.2 | Pass: contracts are schema-defined |

**Gate result**: Pass. No complexity exceptions required.

## Complexity Tracking

No constitution violations or complexity exceptions.
