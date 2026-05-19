# Implementation Plan — F05 Audit Log + Transcript Store + Tombstone

**Feature ID:** F05
**Branch:** `05-audit-log-tombstone`
**Plan version:** v0.1 (2026-05-19)
**Owner:** Gary
**Spec:** `.specify/specs/05-audit-log-tombstone/spec.md`
**Constitution:** v2.0.0
**Stack baseline:** Next.js 16 App Router + Drizzle ORM + PostgreSQL/Neon + pnpm/Turborepo, extending the existing `@spyglass/db`, `@spyglass/auth`, and `@spyglass/tickets` boundaries.

---

## 1. Executive summary

F05 closes the audit-buffer gap by introducing canonical append-only audit storage, canonical Parley transcript storage, and the redaction-by-tombstone procedure required by Constitution §I.4.3.

The implementation should add no new runtime service. It extends `@spyglass/db` with canonical audit/transcript tables, adds a domain package for audit-log operations if shared logic is substantial, and wires web/server surfaces through existing principal and scope patterns. Existing F02/F04 emitters must either write directly to the canonical log after cutover or be replayed from `audit_events_buffer` with exactly-once semantics.

## 2. Constitutional gates

| Article | Requirement | F05 compliance plan |
|---|---|---|
| §I.2 Integrity | Audit log hash-chained and append-only | Canonical audit table stores previous hash/current hash and verifier tests mutation detection |
| §I.4.2 Retention | Per-class horizons enforced | Update F03 retention placeholders and classify new records |
| §I.4.3 Tombstone | Only permitted audit mutation | Tombstone procedure is versioned, scoped, audited, and atomic |
| §I.5.3 Accountability | Every privileged action attributable | Tombstone and export actions require principal and correlation id |
| §I.6 Secure by default | Deny by default | Raw audit/transcript reads require explicit scopes |
| §I.D Forensic readiness | Incident evidence preserved | Evidence export includes chain verification status and tombstone markers |
| §IV.A Test-first | Critical behavior proven by tests | Chain verifier, replay, transcript idempotency, and tombstone behavior start with RED tests |

**Gate result:** Pass, with mandatory `/security-review` before closure.

## 3. Technical context

- **Language/Version:** TypeScript, Node 24, ESM.
- **Primary dependencies:** Existing Drizzle ORM, `@spyglass/db`, `@spyglass/auth`, `@spyglass/tickets`; use Node crypto primitives for hashing unless a project-approved crypto wrapper already exists.
- **Storage:** PostgreSQL/Neon via Drizzle migrations.
- **Testing:** Jest unit/integration tests, schema-lint, principal-coverage, focused seeded dev runs.
- **Target platform:** Existing Next.js/Vercel + server-side packages.
- **Project type:** Monorepo packages plus web/server integration.
- **Performance goals:** 10k-entry chain verification under 30s; transcript append p90 under 200ms in seeded dev.
- **Constraints:** Append-only by default; tombstone mutation path is the only exception; no raw cross-side transcript reads without scope.
- **Scale/scope:** v0 audit/transcript volume, optimized for correctness and verifiability before query analytics.

## 4. Phase 0 research decisions

See `research.md`.

## 5. Phase 1 design

See `data-model.md`, `contracts/`, and `quickstart.md`.

## 6. Project structure

```text
packages/db/
├── src/schema/audit-log.ts
├── src/schema/transcript-store.ts
├── migrations/0006_f05_audit_log_tombstone.sql
└── scripts/f05-audit-replay.ts

packages/audit-log/
├── src/hash-chain.ts
├── src/replay.ts
├── src/transcripts.ts
├── src/tombstone.ts
├── src/export.ts
└── src/__tests__/

apps/web/src/audit/
├── actions/
└── __tests__/

docs/data-governance/
├── data-classification.yaml
├── retention-policy.md
└── integrity-invariants.md

docs/runbooks/
└── audit-log-tombstone.md
```

**Structure decision:** Use a new `@spyglass/audit-log` package if the chain verifier, replay, transcript, export, and tombstone code exceed a narrow DB helper. Keep schemas and migrations in `@spyglass/db`, matching F02/F04 boundaries.

## 7. Implementation phases

1. **B1 Governance and contracts:** data-classification, retention, invariant updates, schema contracts.
2. **B2 Canonical audit schema and hash chain:** table, migration, canonical serializer, verifier.
3. **B3 Replay/cutover from buffer:** exactly-once replay and failure recovery.
4. **B4 Transcript store:** schema, append/read primitives, idempotency, audit linkage.
5. **B5 Tombstone procedure:** authorized target resolution, atomic redaction, tombstone audit event.
6. **B6 Evidence reads/export:** scoped query and deterministic package manifest.
7. **B7 Quickstart, performance, reviews:** seeded dev run, docs, `/speckit-analyze`, `/code-review`, `/security-review`.

## 8. Risks

- Tombstone implementation could break chain verification if the hash material is not carefully separated into original hash, redacted content hash, and tombstone hash.
- Replay could duplicate buffer events without a source reference uniqueness invariant.
- Transcript store could accidentally become a dossier substitute; access controls must keep it stricter than dossier projections.
- F02 fallback-to-console events without `principal_id` remain outside canonical DB replay unless a future authenticated event bridge is created.

## 9. Open follow-ups

- Confirm final scope names during implementation. Draft names: `audit.read`, `audit.export`, `audit.tombstone.execute`, `transcript.read`, `transcript.append`.
- Decide whether `@spyglass/audit-log` is created in B2 or kept as package-internal DB helpers after the first tests are written.
