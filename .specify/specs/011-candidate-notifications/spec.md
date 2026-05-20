# Feature Specification: F11 Candidate Notification Artifact System

**Feature Branch**: `011-candidate-notifications`

**Created**: 2026-05-20

**Status**: Draft

**Input**: User description: "F11 Candidate Notification Artifact System. Stage 4 P0 candidate notification artifacts consume dossier.produced events, satisfy Parley primitive 4, and record structured, timestamped, versioned transparency artifacts tied to match tickets before moving to the full F08 Parley runner."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create Candidate Notice Artifacts (Priority: P1)

As the Parley harness, I need to create a structured candidate notification artifact from a produced dossier, so regulated transparency evidence exists before any candidate-facing or employer-facing delivery proceeds.

**Why this priority**: Candidate notification artifacts are Parley primitive 4 and are a Stage 4 P0 compliance blocker. The platform cannot safely deliver AEDT outcomes without timestamped notice evidence tied to the match ticket.

**Independent Test**: Given a produced dossier event with match ticket refs, jurisdiction refs, candidate refs, policy refs, and dossier refs, build a notification artifact and verify it stores version metadata, notice category, required timing evidence, content refs, and audit refs.

**Acceptance Scenarios**:

1. **Given** a `dossier.produced` event with a conclusive signed dossier, **When** the notification artifact builder runs, **Then** it stores a candidate notice artifact linked to the match ticket, run, dossier, candidate, jurisdiction set, template version, policy version, content hash, and audit event.
2. **Given** an inconclusive dossier event, **When** the notification artifact builder runs, **Then** it stores a notice artifact that clearly marks the outcome as inconclusive and includes a notice reason without exposing counterparty-private content.
3. **Given** required notice inputs are missing, **When** artifact creation is requested, **Then** creation fails closed with a stable reason code and no deliverable notice artifact is marked ready.

---

### User Story 2 - Enforce Notice Timing and Delivery Gates (Priority: P1)

As compliance policy, I need notification artifacts to encode timing windows and delivery readiness, so NYC 10-business-day notice, Illinois AI interview notice, EU AI Act transparency notice, and other jurisdiction policies can be enforced before delivery.

**Why this priority**: The artifact system is not just a message store; it is the evidence spine for jurisdictional notice obligations and must block delivery when required notice evidence is absent or stale.

**Independent Test**: Evaluate seeded notification artifacts against jurisdiction notice policies and verify delivery is allowed only when required artifacts exist, are current, and satisfy the configured timing window.

**Acceptance Scenarios**:

1. **Given** a jurisdiction requires advance notice, **When** the candidate notice artifact is created, **Then** it records required notice-by and eligible-delivery-at timestamps in business-day-aware evidence fields.
2. **Given** a delivery gate checks a match ticket without a required candidate notice artifact, **When** the gate evaluates delivery readiness, **Then** it refuses delivery with a stable reason code.
3. **Given** a notification artifact is superseded by a newer template or policy version before delivery, **When** the gate evaluates readiness, **Then** it refuses delivery until the active notice version is present.

---

### User Story 3 - Preserve Notice Content Versions and Audit Evidence (Priority: P2)

As counsel or compliance staff, I need immutable notice template versions and artifact review reads, so I can reconstruct what the candidate was supposed to receive, why, when, and under which law or policy.

**Why this priority**: Candidate notice obligations vary by jurisdiction and change over time; reviewable immutable template and policy evidence is required for counsel review and incident response.

**Independent Test**: Publish a notice template version, create artifacts against it, supersede the template, and verify prior artifacts remain immutable and scoped review reads reconstruct template refs, artifact content hash, timing evidence, and gate outcomes.

**Acceptance Scenarios**:

1. **Given** a notice template version is published, **When** a notification artifact is created, **Then** the artifact pins that exact template id/version and policy ref.
2. **Given** a template is superseded, **When** an existing artifact is reviewed, **Then** the stored artifact remains unchanged and still references its original template version.
3. **Given** a scoped reviewer requests notice evidence, **When** review reads run, **Then** they return templates, artifacts, gate outcomes, timing evidence, reason codes, and audit refs while denying unscoped access.

---

### User Story 4 - Emit Delivery Commands Without Sending Messages (Priority: P3)

As downstream channel infrastructure, I need notification artifacts to expose delivery command payloads, so F16/F17/F18/F19 channel adapters can send candidate notices later without F11 owning channel transport.

**Why this priority**: F11 must produce durable compliance artifacts and delivery intent, but actual Telegram, email, web, or API delivery belongs to later channel features.

**Independent Test**: Request a delivery command from a ready artifact and verify it includes the artifact ref, channel-agnostic content refs, recipient refs, idempotency key, and delivery requirements without invoking any channel adapter.

**Acceptance Scenarios**:

1. **Given** a candidate notice artifact is delivery-ready, **When** a delivery command is requested, **Then** the command contains recipient, artifact, content hash, idempotency key, and required delivery window metadata.
2. **Given** an artifact is not delivery-ready, **When** a delivery command is requested, **Then** command creation is refused with the gate reason.
3. **Given** a delivery command is generated twice for the same artifact and channel intent, **When** both commands are compared, **Then** the idempotency key is stable.

### Edge Cases

- A dossier is produced for a jurisdiction that has no active notice policy.
- A match ticket spans multiple jurisdictions with conflicting notice windows.
- A candidate notice template is retired after artifact creation but before delivery.
- A notice artifact is requested for an inconclusive dossier.
- Required candidate contact or recipient reference is missing.
- The delivery gate is evaluated before the earliest eligible delivery time.
- A candidate notice artifact is rebuilt from identical inputs.
- An unscoped actor attempts to read notice content or gate evidence.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST create candidate notification artifacts from `dossier.produced` evidence and tie each artifact to match ticket, run, dossier, candidate, jurisdiction refs, and audit refs.
- **FR-002**: System MUST support candidate notice categories for advance AEDT notice, outcome transparency notice, inconclusive outcome notice, and policy/update notice.
- **FR-003**: System MUST store immutable notice template versions with template id, version, status, jurisdiction scope, notice category, required content refs, and effective timestamps.
- **FR-004**: System MUST pin each notification artifact to an exact notice template version and jurisdiction policy ref.
- **FR-005**: System MUST compute deterministic content hashes for notification artifacts from canonical artifact content.
- **FR-006**: System MUST record notice timing evidence, including produced timestamp, required notice-by timestamp when applicable, earliest eligible delivery timestamp when applicable, and timing basis.
- **FR-007**: System MUST refuse delivery readiness when a required notification artifact is missing, stale, retired, not yet eligible, invalid, or lacks required recipient refs.
- **FR-008**: System MUST return stable reason codes for delivery gate allowed/refused decisions.
- **FR-009**: System MUST record delivery gate evaluations as immutable evidence tied to the artifact and match ticket.
- **FR-010**: System MUST emit channel-agnostic delivery command payloads only for artifacts that pass the delivery gate.
- **FR-011**: System MUST make delivery command idempotency keys deterministic for the same artifact, recipient, category, and channel intent.
- **FR-012**: System MUST support inconclusive dossier notices without exposing counterparty-private content.
- **FR-013**: System MUST provide scoped review reads for notice templates, artifacts, delivery gate outcomes, and delivery commands while denying unscoped reads by default.
- **FR-014**: System MUST emit canonical audit evidence for template publication, artifact creation, gate evaluation, and delivery command creation.
- **FR-015**: System MUST keep F11 boundaries clear: F08 owns orchestration/event production, F10 owns dossier content/signing, F16-F19 own channel transport, and F23 owns employer webhook delivery.

### Key Entities *(include if feature involves data)*

- **Notice Template Version**: Immutable versioned content policy for a candidate notice category and jurisdiction scope.
- **Candidate Notification Artifact**: Structured notice evidence tied to match ticket, run, dossier, candidate, template version, policy version, timing evidence, content refs, content hash, status, and audit refs.
- **Notice Timing Evidence**: Produced, required-by, eligible-at, business-day basis, and policy basis fields used to enforce notice windows.
- **Delivery Gate Evaluation**: Immutable allowed/refused decision with stable reason code and refs to artifact, match ticket, template, policy, and audit event.
- **Notification Delivery Command**: Channel-agnostic delivery intent containing artifact ref, recipient ref, category, content hash, idempotency key, and delivery window metadata.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Rebuilding a notification artifact from identical dossier and notice inputs produces the same canonical content hash.
- **SC-002**: Delivery readiness is refused when any required candidate notification artifact is missing, stale, invalid, or not yet eligible.
- **SC-003**: Delivery readiness is allowed when the active required artifact exists and satisfies jurisdiction timing evidence.
- **SC-004**: Superseding a notice template does not mutate artifacts created under earlier template versions.
- **SC-005**: Scoped review reads reconstruct template, artifact, timing, gate, delivery-command, and audit evidence without expanding raw dossier or transcript content.
- **SC-006**: Delivery command generation is deterministic and idempotent for the same artifact and channel intent.
- **SC-007**: Initial package verification passes unit tests, contract tests, type-check, lint, schema-lint, and an F11 staged quickstart run.

## Assumptions

- F10 supplies signed dossier refs and safe dossier metadata; F11 does not duplicate dossier content or recompute dossier projections.
- F06 supplies jurisdiction policy refs and active/blocked jurisdiction posture; F11 stores the policy refs used for notice decisions.
- Initial business-day calculations can use injected calendar evidence for tests; full jurisdiction holiday calendars may be expanded later.
- F11 produces artifacts and delivery commands only. Actual channel sending is deferred to F16-F19.
- Candidate recipient references are platform-controlled identifiers; raw contact addresses are not required for the first F11 package surface.
