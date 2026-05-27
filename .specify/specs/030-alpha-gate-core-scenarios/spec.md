# Feature Specification: Deterministic Alpha Gate Core Scenarios

**Feature Branch**: `030-alpha-gate-core-scenarios`

**Created**: 2026-05-27

**Status**: Draft

**Input**: User description: "PTH05: Deterministic Alpha gate scenarios A1-A5"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Run Core Alpha Gate Scenarios (Priority: P1)

An engineer can run deterministic Alpha readiness scenarios A1-A5 without live models, Pi persona sessions, browsers, or webhook receivers.

**Why this priority**: Alpha readiness cannot be trusted until the core business gates are represented as repeatable pass/fail scenarios with seed and evidence references.

**Independent Test**: Execute A1-A5 locally and verify each scenario returns a passing harness result with stable scenario ids, seed records, assertions, and evidence refs.

**Acceptance Scenarios**:

1. **Given** the Alpha happy path scenario runs, **When** deterministic gate evaluation completes, **Then** the flow is allowed, a signed dossier marker is present, informational-only posture is preserved, audit evidence exists, and no forbidden audience data exposure is reported.
2. **Given** missing consent or withdrawn consent scenarios run, **When** deterministic gate evaluation completes, **Then** the flow blocks with stable reason codes, audit evidence exists, and no new dossier dispatch occurs.
3. **Given** human review or jurisdiction kill-switch scenarios run, **When** deterministic gate evaluation completes, **Then** progression blocks until the expected evidence exists, reviewer or operator attribution is queryable, failure artifacts remain non-PII, and audit evidence exists.

---

### User Story 2 - Persist Gate Evidence (Priority: P1)

An operator can inspect stored Alpha gate snapshots after the command exits.

**Why this priority**: Alpha gate decisions need durable evidence, seed ids, and assertion summaries for product and compliance review.

**Independent Test**: Run the sample gate suite into a local result store and reload every A1-A5 snapshot by run id.

**Acceptance Scenarios**:

1. **Given** A1-A5 run locally, **When** snapshots are persisted, **Then** each snapshot includes run result, seed records, observability assertions, and safe metadata.
2. **Given** the stored snapshots are reloaded, **When** a caller filters by gate mode, **Then** all five Alpha scenarios are queryable as passed runs.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST define deterministic Alpha gate scenario ids A1-A5 with stable titles, versions, and gate mode.
- **FR-002**: System MUST map A1 to an allowed happy path with signed dossier and informational-only posture assertions.
- **FR-003**: System MUST map A2 and A3 to blocked consent paths with stable reason codes and no new dossier dispatch.
- **FR-004**: System MUST map A4 to a human-review-required path with reviewer attribution and evidence refs.
- **FR-005**: System MUST map A5 to a jurisdiction kill-switch denial with non-PII failure artifact evidence.
- **FR-006**: System MUST reuse deterministic seed factories and produce seed records for every scenario.
- **FR-007**: System MUST persist local result-store snapshots for A1-A5 without requiring Neon credentials or external services.
- **FR-008**: System MUST expose Alpha gate scenario helpers and a sample runner through the product harness public API.
- **FR-009**: System MUST include tests covering A1-A5 outcomes, reason codes, persistence, and byte-stable replay.
- **FR-010**: System MUST keep raw credentials, production data, and private data exposure out of scenario output.

### Key Entities

- **Alpha Gate Scenario**: A deterministic ProductScenario for A1-A5.
- **Alpha Gate Outcome**: Business outcome, block reason, consent state, jurisdiction decision, human review posture, dossier status, privacy status, audit refs, and evidence refs.
- **Alpha Gate Suite Result**: Persisted local result-store snapshots for all core Alpha scenarios.

## Success Criteria *(mandatory)*

- **SC-001**: A1-A5 execute locally and pass without external services.
- **SC-002**: Re-running the suite with the same deterministic inputs produces stable run ids, seed records, reason codes, and assertion ids.
- **SC-003**: A2, A3, A4, and A5 fail closed at the simulated Alpha gate while still producing passing scenario results because the expected denial behavior occurred.
- **SC-004**: Stored snapshots can be queried by gate mode and return all five scenario summaries.

## Assumptions

- PTH05 builds on PTH04 seed factories.
- Browser journeys, real API/webhook calls, Pi personas, and observability canaries remain later PTH slices.
- Deterministic Alpha gate outcomes are explicit synthetic evidence, not a replacement for later live integration gates.
