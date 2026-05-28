# Feature Specification: PTH11 Neon Test Harness Schema Persistence

**Feature Branch**: `036-product-harness-neon-result-store`
**Created**: 2026-05-28
**Status**: Implemented
**Input**: Product harness roadmap PTH11: replace/local-augment local file result storage with Neon-backed persistence in an isolated `test_harness` schema outside production.

## User Scenarios & Testing

### Primary User Story

As a Spyglass engineer operating preview, production replay, and canary harness runs, I need product-harness result snapshots to persist in Neon under an isolated `test_harness` schema so reports, later dashboards, and canary history can be queried without touching production application schemas.

### Acceptance Scenarios

1. **Given** a valid `ProductResultStoreSnapshot`, **When** the Neon result store saves it, **Then** the full snapshot and indexed run summary fields are written to `test_harness.product_result_runs`.
2. **Given** the same snapshot is written twice, **When** the Neon result store receives the duplicate write, **Then** the second write is accepted as idempotent without modifying the persisted row.
3. **Given** a run ID already exists with different snapshot content, **When** the Neon result store saves conflicting content, **Then** the write fails with a duplicate-conflict result-store error.
4. **Given** filters for mode, status, scenario, environment, git ref, and started-at bounds, **When** operators list Neon-backed runs, **Then** summaries are returned newest-first and limited without exposing secrets.
5. **Given** the store is configured without an explicit schema, **When** schema initialization runs, **Then** the store creates only the `test_harness` schema/table/indexes required for harness metadata.

### Edge Cases

- Invalid or secret-bearing snapshots are rejected before any SQL write is attempted.
- Unsafe schema names, production-like schema names, and untrusted SQL identifiers are rejected during store construction.
- JSONB snapshot reads are validated before returning data to callers.
- Large binary artifacts are not stored in Neon; only metadata, references, checksums, and summary counts are persisted.

## Requirements

### Functional Requirements

- **FR-001**: The harness MUST expose a Neon/Postgres-backed `ProductResultStore` implementation that targets an isolated `test_harness` schema by default.
- **FR-002**: The Neon store MUST persist the complete `ProductResultStoreSnapshot` as JSONB plus indexed summary columns for run ID, scenario, mode, status, environment label, git ref/sha, timestamps, and counts.
- **FR-003**: The Neon store MUST support idempotent duplicate writes for identical snapshot content and reject conflicting duplicate writes.
- **FR-004**: The Neon store MUST implement `getRun` and `listRuns` with the existing `ProductResultStore` contract and filters.
- **FR-005**: The Neon store MUST provide schema initialization SQL for `test_harness.product_result_runs` without relying on production application migrations.
- **FR-006**: The implementation MUST reject unsafe or production-like schema names.
- **FR-007**: The package MUST export the Neon store and SQL-client types without requiring local tests to open a network connection.

### Non-Functional Requirements

- **NFR-001**: Unit tests MUST be deterministic and use a fake SQL client rather than live Neon.
- **NFR-002**: Snapshot serialization MUST be stable enough to compare duplicate writes.
- **NFR-003**: SQL values MUST be parameterized; only validated schema/table identifiers may be interpolated.
- **NFR-004**: The feature MUST remain compatible with future durable object-storage artifacts by storing references instead of binary payloads.

## Success Criteria

- **SC-001**: Focused tests cover schema SQL, save/get/list behavior, filters, idempotency, conflict rejection, and schema guards.
- **SC-002**: `@spyglass/product-test-harness` exposes a Neon-backed result store API that can be supplied a Neon/Postgres query client.
- **SC-003**: Roadmap and Spec Kit artifacts identify PTH11 as the active implementation slice.
- **SC-004**: Existing local-file result-store behavior remains unchanged.
