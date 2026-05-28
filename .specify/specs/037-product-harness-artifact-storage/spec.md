# Feature Specification: PTH12 Durable Artifact Storage

**Feature Branch**: `037-product-harness-artifact-storage`
**Created**: 2026-05-28
**Status**: Implemented
**Input**: Product harness roadmap PTH12: persist report, browser, trace, video, and transcript blobs outside GitHub artifact retention while storing metadata references in Neon.

## User Scenarios & Testing

### Primary User Story

As a Spyglass engineer operating preview, production replay, and canary harness runs, I need large product-harness artifacts to be stored in durable object storage while result-store snapshots retain safe metadata references, checksums, retention class, and redaction status.

### Acceptance Scenarios

1. **Given** a report, trace, screenshot, video, transcript, or log payload, **When** the harness stores it through the durable artifact store, **Then** it returns a `RunArtifact`-compatible reference with a durable URI, SHA-256 checksum, size, provider, retention class, and redaction metadata.
2. **Given** the same artifact payload is stored twice with the same identity, **When** duplicate persistence occurs, **Then** the second write is accepted as idempotent.
3. **Given** an existing artifact identity has different bytes, **When** the store attempts to overwrite it, **Then** the write fails with a duplicate-conflict error.
4. **Given** a payload marked as sensitive synthetic data, **When** it is stored without a redaction note, **Then** validation rejects it before any storage write.
5. **Given** local tests run without Vercel or object-storage credentials, **When** the artifact storage suite executes, **Then** it uses deterministic local storage and does not require network access.

### Edge Cases

- Empty payloads are rejected before write.
- Unsafe artifact identifiers or path traversal attempts are rejected.
- Stored metadata must not contain raw database URLs, credentials, or private payloads.
- Durable storage records metadata references only; result snapshots do not embed artifact bytes.

## Requirements

### Functional Requirements

- **FR-001**: The harness MUST expose typed durable artifact storage contracts for artifact identity, provider, content type, size, checksum, retention class, redaction status, and metadata.
- **FR-002**: The harness MUST provide a deterministic local-file artifact store implementation for offline tests and local development.
- **FR-003**: The local-file store MUST write artifact bytes atomically and emit `RunArtifact`-compatible references that can be embedded in result-store snapshots.
- **FR-004**: The artifact store MUST support idempotent duplicate writes and reject conflicting duplicate writes.
- **FR-005**: The artifact store MUST validate artifact IDs, run/scenario IDs, non-empty payloads, redaction notes, and safe metadata before persistence.
- **FR-006**: The package MUST expose helper functions to compute artifact checksums and convert stored artifact metadata to `RunArtifact` references.
- **FR-007**: The implementation MUST remain compatible with future Vercel Blob or equivalent object-storage adapters without adding live network requirements to unit tests.

### Non-Functional Requirements

- **NFR-001**: Unit tests MUST be deterministic and use only local filesystem storage.
- **NFR-002**: Artifact checksums MUST use SHA-256 and be stable for identical bytes.
- **NFR-003**: Stored references MUST avoid secret-shaped values and raw credential material.
- **NFR-004**: The storage abstraction MUST keep large payload bytes outside Neon result-store rows.

## Success Criteria

- **SC-001**: Focused tests cover local persistence, metadata references, checksum generation, idempotency, conflict rejection, validation, and result snapshot compatibility.
- **SC-002**: Public exports allow later canary workflows to supply durable artifact refs to the PTH11 Neon result store.
- **SC-003**: Roadmap and Spec Kit artifacts identify PTH12 as the active implementation slice.
- **SC-004**: Existing artifact validation and browser/report scenarios remain backward compatible.
