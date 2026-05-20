# Feature Specification: F06 Jurisdiction Policy Gates

**Feature Branch**: `006-jurisdiction-policy-gates`

**Created**: 2026-05-19

**Status**: Draft

**Input**: User description: "Start F06: jurisdiction tagging, policy gates, and geographic kill switches after F05."

## Overview

F06 establishes the compliance control layer that determines whether a ticket, match, or Parley run may proceed in a given jurisdiction. The feature must make jurisdiction decisions explicit, auditable, fail-safe, and operable without a deployment when a new law, counsel directive, or risk posture requires a same-day shutdown.

F06 depends on F04 ticket jurisdiction fields and F05 canonical evidence. It does not build the Parley runner, contract registry, rubric registry, privacy filter, dossier builder, or incident response program. It provides the jurisdiction policy facts and decisions those downstream features must consume.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Gate A Ticket Or Match By Jurisdiction (Priority: P1)

As the Spyglass platform, I need every jurisdiction-sensitive ticket and match workflow to receive an explicit allow/deny decision before it proceeds, so that regulated or unsupported geographies never continue by accident.

**Why this priority**: This is the core constitutional requirement for fail-safe jurisdiction handling. Missing or incorrect gates can route a hiring workflow into the wrong legal posture.

**Independent Test**: Submit ticket and match evaluation cases with supported, unsupported, disabled, and missing jurisdictions; verify each receives an explicit decision, reason code, and audit evidence.

**Acceptance Scenarios**:

1. **Given** a seeker ticket and employer requisition have known supported jurisdictions, **When** a match workflow requests a gate decision, **Then** the decision is `allow` and includes the active policy version.
2. **Given** any required jurisdiction is missing or unknown, **When** a gate decision is requested, **Then** the decision is `deny` with a fail-safe reason and no workflow proceeds silently.
3. **Given** a jurisdiction is configured as unsupported for the current launch posture, **When** a ticket or match requests a gate decision, **Then** the decision is `deny` with a structured reason suitable for a failure dossier.
4. **Given** a downstream feature receives a denied decision, **When** it records the outcome, **Then** the decision is attributable to the policy gate and includes a correlation id for audit review.

---

### User Story 2 - Flip Geographic Kill Switches Without Deploy (Priority: P1)

As an operator acting under counsel or compliance direction, I need to disable or re-enable jurisdictions without a deploy, so that Spyglass can respond the same day to new regulation, counsel review, or incident response.

**Why this priority**: Constitution §I.3 requires geographic kill switches to flip without a deploy. This capability protects launch posture and prevents risky workflows from continuing during legal or operational uncertainty.

**Independent Test**: Change a jurisdiction's operational status through the operator path and verify new gate decisions use the new status immediately while prior decisions remain auditable.

**Acceptance Scenarios**:

1. **Given** an operator has the required scope and a lawful operational reason, **When** they disable a jurisdiction, **Then** new gate decisions for that jurisdiction deny without requiring a code release.
2. **Given** a jurisdiction has been disabled, **When** an operator re-enables it with an approved reason, **Then** new gate decisions use the re-enabled status and record the policy version or revision.
3. **Given** an unscoped or unauthenticated actor attempts a kill-switch change, **When** the request is evaluated, **Then** it is denied and no jurisdiction status changes.
4. **Given** a kill-switch change is made, **When** evidence is reviewed later, **Then** the change has principal attribution, reason, timestamp, correlation id, and audit evidence.

---

### User Story 3 - Produce Structured Failure Evidence (Priority: P2)

As an operator, auditor, or downstream dossier process, I need denied jurisdiction decisions to produce a structured failure artifact, so that blocked workflows are explainable and auditable rather than silent skips.

**Why this priority**: A denied policy gate must be visible to operators and future dossier/failure-review flows. This supports Constitution §I.3 fail-safe defaults and forensic readiness.

**Independent Test**: Trigger denied decisions for missing, disabled, unsupported, and policy-conflict jurisdictions; verify each denial has a stable reason code, non-PII context, and evidence linkage.

**Acceptance Scenarios**:

1. **Given** a policy gate denies a workflow, **When** the denial is recorded, **Then** the failure artifact contains jurisdiction, decision, reason code, policy version, subject workflow reference, and correlation id.
2. **Given** a denial involves a ticket or match, **When** an operator reviews the evidence, **Then** the artifact references ticket or match identifiers without exposing raw personal data.
3. **Given** multiple gate checks occur under one workflow, **When** evidence is exported, **Then** the decisions can be grouped by correlation id and ordered by decision time.

---

### User Story 4 - Review Policy Posture And Decision History (Priority: P2)

As compliance staff or counsel, I need to review active jurisdiction posture and historical gate decisions, so that launch readiness, regulatory response, and audit packages can be verified without raw database access.

**Why this priority**: F06 becomes the compliance source for where the platform may operate. Reviewers need scoped visibility into policy posture and decisions before Phase 0 and Phase 1 use.

**Independent Test**: Query active policy posture and a bounded decision history as a scoped reviewer; verify unscoped access is denied and scoped results include only allowed evidence fields.

**Acceptance Scenarios**:

1. **Given** a scoped compliance reviewer requests active jurisdiction posture, **When** the review is generated, **Then** it lists jurisdiction status, active policy version, effective dates, and operational reason.
2. **Given** an unscoped principal requests policy or decision history, **When** authorization runs, **Then** access is denied by default.
3. **Given** a reviewer filters decisions by jurisdiction and date range, **When** results are returned, **Then** each result includes decision, reason code, policy version, principal attribution where applicable, and evidence reference.

### Edge Cases

- A ticket contains multiple jurisdictions and one is disabled.
- A match combines seeker and employer jurisdictions with conflicting policy outcomes.
- A jurisdiction is known but has no active policy version.
- A kill switch is flipped while a workflow is in progress.
- A jurisdiction is re-enabled after being disabled.
- A policy change is attempted with an empty or free-text-only reason.
- A gate decision is requested before the requester has a principal or correlation id.
- Historical decisions must remain reviewable after the active policy changes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST maintain a jurisdiction policy posture for every supported or explicitly unsupported jurisdiction relevant to launch.
- **FR-002**: System MUST evaluate ticket, match, and run-dispatch jurisdiction gates before jurisdiction-sensitive workflows proceed.
- **FR-003**: System MUST default to `deny` when jurisdiction data is missing, unknown, inactive, unsupported, disabled, or otherwise not covered by an active policy.
- **FR-004**: System MUST produce a structured gate decision for every evaluation, including decision, reason code, jurisdiction set, policy version, evaluated subject reference, and correlation id.
- **FR-005**: System MUST record canonical audit evidence for every gate decision and every kill-switch change.
- **FR-006**: System MUST support no-deploy jurisdiction kill switches that can disable or re-enable gate decisions for a jurisdiction.
- **FR-007**: System MUST restrict kill-switch changes to authenticated, scoped operator or compliance principals.
- **FR-008**: System MUST require a closed-list operational reason for every kill-switch change.
- **FR-009**: System MUST preserve historical gate decisions and kill-switch changes for later evidence review even when active policy posture changes.
- **FR-010**: System MUST provide structured failure artifacts for denied decisions without exposing raw personal data.
- **FR-011**: System MUST allow scoped reviewers to inspect active jurisdiction posture and bounded gate-decision history.
- **FR-012**: System MUST deny unscoped access to jurisdiction policy posture, gate-decision history, and kill-switch mutation paths by default.
- **FR-013**: System MUST support grouping related gate decisions by correlation id for downstream evidence export and incident review.
- **FR-014**: System MUST identify policy outcomes for multi-jurisdiction workflows and deny when any required jurisdiction blocks the workflow.
- **FR-015**: System MUST keep policy status, decision reason codes, and failure artifacts stable enough for F08 Parley runner, F10 dossier builder, and F24 incident response to consume.

### Key Entities *(include if feature involves data)*

- **Jurisdiction Policy**: The active compliance posture for one jurisdiction, including jurisdiction code, status, policy version, effective date range, operational reason, and reviewer metadata.
- **Policy Gate Decision**: The result of evaluating a workflow subject against jurisdiction policy, including decision, reason code, jurisdiction set, policy version, subject reference, correlation id, actor, and evidence reference.
- **Geographic Kill Switch**: An operator-controlled state change that disables or re-enables a jurisdiction without a deployment.
- **Failure Artifact**: A structured denial record for downstream workflows and reviews, containing non-PII context, reason code, policy version, subject reference, and evidence reference.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of jurisdiction-sensitive ticket, match, and run-dispatch evaluations return an explicit allow or deny decision.
- **SC-002**: 100% of missing, unknown, disabled, or unsupported jurisdiction cases deny by default in test scenarios.
- **SC-003**: A scoped operator can disable a jurisdiction and new gate decisions for that jurisdiction deny within one minute without a deployment.
- **SC-004**: 100% of kill-switch changes and gate decisions have audit evidence with principal attribution or a documented service principal, correlation id, and policy version.
- **SC-005**: Unscoped principals cannot read policy posture, read decision history, or mutate kill-switch state in authorization tests.
- **SC-006**: Denied gate decisions produce structured failure artifacts for all supported denial reason classes.
- **SC-007**: Historical gate decisions remain reviewable after at least one policy status change in the same jurisdiction.

## Assumptions

- F04 ticket and match records remain the source of ticket jurisdiction facts.
- F05 canonical audit and evidence primitives are available for gate decisions, kill-switch changes, and review packages.
- Phase 0 launch posture starts with a bounded set of allowed US jurisdictions and denies anything outside that set.
- Counsel owns the authoritative business/legal decision for each jurisdiction status; F06 stores and enforces that posture.
- Dossier content and candidate/employer-facing notification copy are outside F06 and will be handled by downstream features.
- A later F24 incident-response feature will consume F06 decision history for monitoring and breach/incident workflows.
