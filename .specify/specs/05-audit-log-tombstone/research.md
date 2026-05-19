# Research — F05 Audit Log + Transcript Store + Tombstone

## R-1 — Hash-chain storage shape

**Decision:** Store each canonical audit event with `previous_hash`, `event_hash`, `canonicalization_version`, `hash_algorithm`, and a chain namespace. Compute the hash over deterministic canonical JSON containing event identity, actor metadata, event name, payload/tombstone content hash, timestamp, previous hash, and namespace.

**Rationale:** The verifier needs stable, replayable inputs. Including version and algorithm supports future crypto agility without invalidating old rows.

**Alternatives considered:** Merkle tree only; rejected for v0 because sequential hash chain is simpler, meets Constitution §I.2, and maps to append-only event ordering. External ledger; rejected because it adds infrastructure before v0 needs it.

## R-2 — Replay and cutover from `audit_events_buffer`

**Decision:** Replay buffer rows into canonical audit storage using `source_table` + `source_event_id` uniqueness. Keep buffer rows during F05 cutover until verification and back-check complete.

**Rationale:** F02/F04 already rely on `audit_events_buffer`. Exactly-once source references prevent duplicate replay during retries and preserve traceability.

**Alternatives considered:** Destructive migration from buffer to canonical table; rejected because rollback and evidence comparison would be weaker. Leave buffer as the permanent log; rejected because it lacks hash-chain and tombstone semantics.

## R-3 — Transcript store boundary

**Decision:** Store canonical transcript turns separately from dossiers and audit events. Transcript records carry content hashes and metadata; audit events record that a transcript turn was appended or tombstoned.

**Rationale:** Parley separates the transcript store from dossiers. Dossiers are audience projections; transcripts are source-of-truth evidence with stricter access.

**Alternatives considered:** Store transcript body only inside audit events; rejected because transcript-specific ordering, side isolation, and projection workflows would become awkward. Store transcripts only in dossiers; rejected because dossiers are derived artifacts.

## R-4 — Tombstone implementation

**Decision:** Tombstone writes are the only canonical mutation path. The procedure records the original content hash, redaction timestamp, lawful basis, operator principal, subject reference, procedure version, and replacement content hash, then emits a tombstone audit event.

**Rationale:** This directly follows Constitution §I.4.3 while preserving chain verification and data-subject erasure boundaries.

**Alternatives considered:** Hard delete; forbidden by Constitution §I.2 except outside audit-relevant stores. Redact in place without tombstone; rejected because it loses evidence of what changed and why.

## R-5 — Package boundary

**Decision:** Prefer a dedicated `@spyglass/audit-log` package once implementation begins, with schema remaining in `@spyglass/db`.

**Rationale:** Hash-chain verification, replay, transcript append, export, and tombstone orchestration are cross-cutting enough to justify a package, similar to `@spyglass/tickets`.

**Alternatives considered:** Put all logic in `apps/web`; rejected because F08/F10/F24 will need non-UI access. Put everything in `@spyglass/db`; rejected because DB package should remain schema/data-access oriented.
