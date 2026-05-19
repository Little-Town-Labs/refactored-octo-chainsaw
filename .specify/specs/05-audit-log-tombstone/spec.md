# Feature Specification — F05 Audit Log + Transcript Store + Tombstone

**Feature ID:** F05
**Slug:** `05-audit-log-tombstone`
**Branch:** `05-audit-log-tombstone`
**Stage:** 2 — Ticket Spine
**Priority:** P0 (Critical)
**Complexity:** L (4-6 weeks)
**Status:** Draft v0.1
**Created:** 2026-05-19
**Owner:** Gary
**Constitution refs:** v2.0.0 §I.2 (hash-chained append-only audit), §I.4.2 (retention), §I.4.3 (redaction by tombstone), §I.5.3 (accountability and non-repudiation), §I.6 (secure-by-default), §I.D (forensic readiness)
**Roadmap:** `.specify/roadmap.md` v1.4.0 (F05)
**Depends on:** F02 (`audit_events_buffer`, audit sink shape), F03 (data-classification register, retention policy, schema conventions), F04 (ticket transition event schema and ticket lifecycle events)
**Blocks:** F06, F07a, F07b, F08, F10, F24, and every feature that relies on canonical audit or transcript evidence

---

## Overview

F05 replaces the pre-F05 audit buffer with the canonical evidence spine for Spyglass: a hash-chained audit log, a canonical transcript store for Parley negotiation turns, and a redaction-by-tombstone procedure that preserves audit integrity while honoring data-subject erasure rights.

F05 is not a user-facing workflow. Its users are operators, auditors, counsel, downstream harness features, and incident responders who need verifiable evidence of what happened, who did it, under which versioned context, and how data-subject erasure was handled.

F05 does **not** build the Parley runner, privacy filter, dossier builder, notification system, or jurisdiction gates. It stores the evidence those features will write and read.

## User Scenarios & Testing

### User Story 1: Canonical audit ingestion (Priority: P1)

As the Spyglass platform, I need every privileged action and ticket transition to land in an append-only, hash-chained audit log so that platform state changes remain attributable and tamper-evident.

**Why this priority:** This closes the pre-F05 buffer gap and satisfies Constitution §I.2 and §I.5.3 for all downstream features.

**Independent Test:** Insert a sequence of F02 and F04 audit events, verify every row links to the previous row hash, and verify a deliberate row mutation breaks chain verification.

**Acceptance Scenarios:**

1. **Given** events exist in `audit_events_buffer`, **When** F05 cutover/replay runs, **Then** each event appears once in the canonical audit log with stable event id, source buffer reference, previous hash, current hash, and actor metadata.
2. **Given** a new ticket transition event is emitted after cutover, **When** it is written to the canonical audit log, **Then** the event payload matches the F04 v1 schema and the chain verifier reports a valid chain.
3. **Given** an audit row is modified after insertion, **When** the verifier scans the chain, **Then** verification fails with the first invalid event id and expected/actual hash details.

### User Story 2: Canonical transcript storage (Priority: P1)

As the Parley harness, I need every negotiation turn stored in a canonical transcript separate from dossiers so that downstream dossiers, audits, and incident reviews can reference source-of-truth negotiation evidence.

**Why this priority:** Parley §13 separates transcripts from dossiers. F08 and F10 cannot be complete without a durable transcript source.

**Independent Test:** Append synthetic negotiation turns for both sides of one run, verify ordering, side isolation metadata, model/tool metadata, and transcript-to-audit linkage.

**Acceptance Scenarios:**

1. **Given** a match run emits a seeker-side turn, **When** the transcript turn is stored, **Then** the stored record includes match id, run id, side, turn index, contract/rubric refs, content hashes, and an audit event link.
2. **Given** the same `(run_id, side, turn_index)` is submitted twice, **When** the second write occurs, **Then** storage rejects it as an idempotency conflict without modifying the original turn.
3. **Given** a transcript is queried by a principal without audit or harness scope, **When** the query runs, **Then** access is denied by default.

### User Story 3: Redaction by tombstone (Priority: P1)

As a privacy operator, I need a versioned tombstone procedure for erasure requests so that personal data can be purged while preserving verifiable evidence that an event existed.

**Why this priority:** Constitution §I.4.3 permits audit-log mutation only through redaction by tombstone.

**Independent Test:** Execute a tombstone request against audit and transcript records containing personal data, then verify payload/body content is purged, tombstones contain the required cryptographic evidence, and the chain remains valid.

**Acceptance Scenarios:**

1. **Given** an eligible audit event contains personal data, **When** an authorized operator executes tombstoning with lawful basis and subject reference, **Then** the personal data is removed, a tombstone replaces it, and the tombstone itself is audited.
2. **Given** a transcript turn is tombstoned, **When** the transcript is queried later, **Then** callers see tombstone metadata and no original personal data.
3. **Given** a tombstone request lacks lawful basis or operator authorization, **When** execution is attempted, **Then** no data changes and a denial event is recorded.

### User Story 4: Evidence review and export (Priority: P2)

As an operator or auditor, I need scoped read and export primitives for audit chains and transcripts so that incidents, counsel reviews, and regulatory evidence packages can be assembled without raw database access.

**Why this priority:** The canonical stores are only useful if authorized reviewers can verify and inspect them safely.

**Independent Test:** Query by match id, principal id, correlation id, run id, and date range using scoped principals; verify denied access for unscoped callers and deterministic export manifests.

**Acceptance Scenarios:**

1. **Given** an authorized audit reader supplies a match id, **When** the audit package is generated, **Then** it includes matching audit events, transcript turn references, chain verification status, and tombstone markers.
2. **Given** an unscoped human principal requests an export, **When** authorization runs, **Then** the request is denied and no raw evidence is returned.

### Edge Cases

- Replay of `audit_events_buffer` is retried after partial failure.
- The previous hash anchor is missing or chain verification fails during cutover.
- Transcript turns arrive out of order.
- Transcript content exceeds the configured payload limit.
- Tombstone is requested for an event already tombstoned.
- Tombstone is requested for legal-hold records.
- A subject-erasure request targets data referenced by multiple audit events and transcript turns.
- Chain verification must work across deployment boundaries and restarts.

## Requirements

### Functional Requirements

- **FR-001:** System MUST provide a canonical append-only audit log for structured events emitted by F02, F04, and downstream features.
- **FR-002:** System MUST hash-chain audit entries using deterministic canonical serialization over event metadata, payload/tombstone content hash, previous hash, and chain namespace.
- **FR-003:** System MUST reject direct mutation or deletion of canonical audit entries outside the tombstone procedure.
- **FR-004:** System MUST replay existing `audit_events_buffer` rows into the canonical audit log exactly once and preserve source row references for traceability.
- **FR-005:** System MUST preserve F04 `spyglass/ticket-transition-event.v1` payload compatibility for ticket transition events.
- **FR-006:** System MUST provide a verifier that reports valid/invalid chain status and the first invalid event when verification fails.
- **FR-007:** System MUST store canonical transcript turns separately from dossiers, keyed by match ticket, run id, side, and turn index.
- **FR-008:** System MUST enforce idempotency for transcript turns by `(run_id, side, turn_index)`.
- **FR-009:** System MUST link transcript writes to audit events so transcript evidence can be included in audit packages.
- **FR-010:** System MUST enforce read access through scoped principals; raw audit/transcript reads default to deny.
- **FR-011:** System MUST provide redaction-by-tombstone for audit and transcript records, including original hash, redaction timestamp, lawful basis, operator principal, and procedure version.
- **FR-012:** System MUST audit every tombstone attempt, whether successful or denied.
- **FR-013:** System MUST prevent tombstone execution when required lawful-basis, subject, operator, or legal-hold checks fail.
- **FR-014:** System MUST update F03 retention-policy tombstone placeholders to point at the F05 canonical procedure.
- **FR-015:** System MUST provide deterministic export packages for scoped audit/counsel review.

### Non-Functional Requirements

- **NFR-001:** Chain verification for 10,000 audit entries MUST complete in under 30 seconds in the seeded dev environment.
- **NFR-002:** Canonical audit writes MUST remain transactional with the domain mutation for ticket transitions.
- **NFR-003:** Transcript append p90 latency MUST stay under 200ms in the seeded dev environment.
- **NFR-004:** Tombstone execution MUST be atomic across the target record, tombstone metadata, and tombstone audit event.
- **NFR-005:** No canonical store may log raw secrets or unsanitized oversized payloads.
- **NFR-006:** `/security-review` is mandatory before implementation closure.

### Key Entities

- **Audit Event:** Canonical structured evidence row for an attributable action or system event.
- **Audit Chain Namespace:** Logical chain partition used to keep chain verification deterministic across event classes.
- **Transcript Turn:** Canonical record of one Parley negotiation turn.
- **Tombstone:** Cryptographically-bound replacement for redacted personal data.
- **Tombstone Request:** Authorized erasure operation with subject, lawful basis, target set, operator, and procedure version.
- **Evidence Export:** Deterministic package of audit and transcript evidence for a scoped review purpose.

## Success Criteria

- **SC-001:** Replay migrates all existing buffer events exactly once in a seeded dev database.
- **SC-002:** Deliberate mutation of any canonical audit event causes chain verification to fail at the mutated row.
- **SC-003:** Transcript writes reject duplicate `(run_id, side, turn_index)` attempts without data loss.
- **SC-004:** Tombstoning removes personal data from selected audit/transcript records while preserving a valid chain and visible tombstone evidence.
- **SC-005:** Unscoped principals cannot read raw audit events, transcript turns, or evidence exports.
- **SC-006:** F03 retention-policy placeholders no longer point to "pending F05" after this feature closes.

## Assumptions

- F05 will extend the existing PostgreSQL/Drizzle data layer and will not introduce a separate log database for v0.
- F05 will keep F02/F04 structured event shapes stable and add canonical storage around them.
- Counsel sign-off is required before Phase 2 operational use of tombstoning, but code and dev-environment tests ship in F05.
- Backup erasure and downstream employer-side erasure obligations remain outside this feature except for documenting handoff boundaries.
