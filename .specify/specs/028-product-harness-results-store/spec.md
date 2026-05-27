# Feature Specification: Product Harness Results Store

**Feature Branch**: `028-product-harness-results-store`

**Created**: 2026-05-27

**Status**: Draft

**Input**: User description: "PTH03: Persistent result store + artifacts contract using slug 028-product-harness-results-store"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Persist Harness Run Evidence (Priority: P1)

An engineer runs a product harness scenario and needs the run, scenario, step, assertion, artifact, seed, and lifecycle evidence stored in a durable result contract so failures can be reviewed after the command exits.

**Why this priority**: Persistent evidence is the foundation for Alpha gate decisions, CI reporting, and later persona eval analysis.

**Independent Test**: A completed scenario result can be saved through the result store and loaded back with the same run status, scenario identity, step records, assertion records, artifact references, and safe metadata.

**Acceptance Scenarios**:

1. **Given** a valid scenario result with steps, assertions, artifacts, and lifecycle metadata, **When** the result is persisted, **Then** the stored snapshot can be read back by run id without losing required fields.
2. **Given** a result contains artifact references, **When** the result is persisted, **Then** each artifact is represented as a durable reference with type, URI, checksum when available, and redaction status.

---

### User Story 2 - Query Stored Runs for Gate Decisions (Priority: P1)

An operator or CI job needs to list recent harness runs by mode, status, scenario, or environment in order to identify the latest gate outcome and supporting evidence.

**Why this priority**: Alpha readiness needs a queryable run ledger, not only one-off report files.

**Independent Test**: Multiple stored results can be queried with filters for mode, status, scenario id, and environment label, returning the newest matching runs in deterministic order.

**Acceptance Scenarios**:

1. **Given** multiple gate and eval runs, **When** a caller lists only failed gate runs, **Then** only failed gate runs are returned newest first.
2. **Given** multiple scenarios in one store, **When** a caller filters by scenario id, **Then** unrelated scenario runs are excluded.

---

### User Story 3 - Reject Unsafe or Incomplete Evidence (Priority: P2)

A compliance reviewer needs confidence that stored harness output is complete, synthetic, and free of raw secrets before it becomes Alpha evidence.

**Why this priority**: The result store becomes a durable audit surface, so it must fail closed on missing required evidence or unsafe artifact metadata.

**Independent Test**: Attempts to persist invalid results or artifact references fail with actionable validation errors before any partial write is committed.

**Acceptance Scenarios**:

1. **Given** a result with an artifact marked as containing sensitive synthetic data but no redaction note, **When** persistence is attempted, **Then** validation fails and no run is stored.
2. **Given** a result with credential-bearing database URLs in metadata, **When** persistence is attempted, **Then** validation fails unless the value has been redacted by the lifecycle layer.

### Edge Cases

- Store implementations must not partially persist a run when validation fails.
- Duplicate run ids should be idempotent only when the stored payload is identical; conflicting payloads must be rejected.
- Missing optional artifact checksums are allowed, but required artifact identity, type, URI, and redaction status are not.
- Result metadata must remain safe for JSON report and Markdown report consumption.
- Query filters with no matches should return an empty list, not an error.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST define a durable result-store contract for saving and loading product harness run snapshots.
- **FR-002**: System MUST represent run, scenario, step, assertion, artifact, seed, agent invocation, browser artifact, webhook capture, and observability assertion evidence in the result-store data model, even when some categories are initially empty.
- **FR-003**: System MUST provide a local file result-store implementation suitable for development and CI without a live database.
- **FR-004**: System MUST validate result snapshots before persistence and reject incomplete or unsafe evidence.
- **FR-005**: System MUST reject raw credential-bearing database URLs and other known unsafe secret patterns in stored metadata and artifact references.
- **FR-006**: System MUST support querying stored runs by mode, status, scenario id, environment label, git ref, and time window.
- **FR-007**: System MUST preserve artifact references with stable ids, labels, types, URIs, redaction status, checksums when provided, and safe metadata.
- **FR-008**: System MUST support idempotent duplicate writes for identical run ids and reject conflicting duplicate writes.
- **FR-009**: System MUST expose the result-store contract through the product harness package public API.
- **FR-010**: System MUST include tests that prove persistence, querying, validation failure, duplicate handling, and artifact contract behavior.

### Key Entities *(include if feature involves data)*

- **Result Store Snapshot**: Durable representation of one harness run and its related evidence.
- **Run Record**: Top-level run metadata including id, mode, status, timestamps, git, environment, and summary.
- **Scenario Record**: Scenario identity and version associated with a run.
- **Step Record**: Ordered execution step with status, timing, evidence refs, metadata, and error summary.
- **Assertion Record**: Business or compliance assertion with severity, status, expected/actual text, and evidence refs.
- **Artifact Record**: Durable pointer to evidence such as JSON, Markdown, screenshot, video, trace, webhook capture, transcript, or log excerpt.
- **Seed Record**: Synthetic seed reference associated with a run or scenario.
- **Agent Invocation Record**: Future persona/agent execution evidence placeholder.
- **Webhook Capture Record**: Future webhook delivery evidence placeholder.
- **Observability Assertion Record**: Future monitoring/log/audit assertion evidence placeholder.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A saved result with at least two steps, two assertions, and two artifacts can be loaded back with all required fields intact.
- **SC-002**: Querying 25 stored run snapshots by status, mode, and scenario id returns the expected subset in newest-first order.
- **SC-003**: Invalid snapshots fail validation before persistence with an error that identifies the failing field category.
- **SC-004**: Duplicate identical writes are accepted without changing stored data, while conflicting duplicate writes are rejected.
- **SC-005**: The product harness package test suite covers the result-store contract and local file implementation without requiring external services.

## Assumptions

- PTH03 delivers the durable contract and local file implementation first; a live Neon-backed control database adapter can be added later behind the same interface.
- Existing PTH01/PTH02 run-result contracts remain the source shape for scenario execution results.
- Seed factories, browser runner, API/webhook gates, observability gates, and Pi persona evals will populate their specialized evidence categories in later roadmap slices.
- Stored data is synthetic test evidence only and must never include production user data.
