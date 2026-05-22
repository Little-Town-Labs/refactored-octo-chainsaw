# Feature Specification: Re-negotiation Loop

**Feature Branch**: `015-renegotiation-loop`

**Created**: 2026-05-22

**Status**: Draft

**Input**: User description: "F15 Re-negotiation Loop: when one side clears and pushes back on the other side's no, create a controlled fresh Parley run with a fresh `run_id`, no state inheritance, explicit `match_ticket.renegotiation_requested` trigger, round caps, per-match cost ceiling, alarms, and auditability."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Start a Fresh Re-negotiation Run (Priority: P1)

A cleared side can request re-negotiation after an asymmetric match outcome, and the platform starts a new isolated negotiation run for the same match ticket instead of retrying or resuming the prior run.

**Why this priority**: This is the core product behavior from PRD §4.7 and the Stage 5 gate: re-negotiation must produce a fresh `run_id` with no state inheritance.

**Independent Test**: Can be tested by submitting a valid re-negotiation request for a match ticket with an eligible asymmetric outcome and verifying a new run is created with a new `run_id`, incremented attempt, no copied run context, and audit evidence tying the request to the new run.

**Acceptance Scenarios**:

1. **Given** a match ticket whose prior run produced an asymmetric outcome and the cleared side requests re-negotiation, **When** the request is accepted, **Then** the system records a `match_ticket.renegotiation_requested` event and creates a new run with a `run_id` distinct from all prior runs for that match ticket.
2. **Given** a valid re-negotiation request, **When** the new run starts, **Then** the run starts with empty prompt history, empty tool-call log, empty side scratch state, and only allowed immutable references to the match ticket, contracts, rubrics, prompt/model versions, and prior dossier identifiers.
3. **Given** the new run completes, **When** the dossier is produced, **Then** the dossier identifies the fresh run attempt and does not mutate or replace prior dossier records.

---

### User Story 2 - Refuse Unsafe or Ineligible Re-negotiation (Priority: P2)

The platform refuses re-negotiation requests that could create runaway loops, transparent retries, stale-state reuse, or unauthorized pushback.

**Why this priority**: The PRD calls out infinite or expensive re-negotiation as a risk, and Parley isolation requires no hidden continuation of failed runs.

**Independent Test**: Can be tested by submitting requests for closed, already-maxed, unauthorized, duplicate, or non-asymmetric match tickets and verifying no new run is created and a fail-closed reason is recorded.

**Acceptance Scenarios**:

1. **Given** a match ticket has reached the configured round cap, **When** another re-negotiation request arrives, **Then** the system refuses the request, records the refusal reason, and creates no new run.
2. **Given** a request comes from a side that did not clear the prior threshold or is not authorized for the match ticket, **When** the request is evaluated, **Then** the system refuses it and emits audit evidence without notifying the non-cleared counterparty by default.
3. **Given** duplicate re-negotiation request events arrive for the same match ticket and attempt, **When** they are processed, **Then** at most one new run is created and later duplicates resolve to the same refusal or idempotency outcome.

---

### User Story 3 - Enforce Cost and Round Controls (Priority: P3)

Operators can rely on explicit caps so re-negotiation cannot become an unbounded cost or abuse path.

**Why this priority**: Cost/abuse controls are the constitutional and PRD risk driver for F15.

**Independent Test**: Can be tested by simulating re-negotiation attempts whose projected cost or actual accumulated cost exceeds the match ceiling and verifying refusal, termination, and alarm behavior.

**Acceptance Scenarios**:

1. **Given** both sides' active contracts declare round caps, **When** a re-negotiation is evaluated, **Then** the effective cap is the minimum of both declared caps and the platform default cap.
2. **Given** a request would exceed the per-match cost ceiling, **When** the request is evaluated, **Then** no run starts, the refusal is auditable, and an operator-visible threshold alarm is emitted.
3. **Given** an in-progress re-negotiation crosses the cost ceiling, **When** the breach is detected, **Then** the run terminates safely, no further advocate turns are dispatched, and the match ticket records a bounded termination outcome.

---

### Edge Cases

- Duplicate `match_ticket.renegotiation_requested` events arrive due to event replay or delivery retry.
- A re-negotiation request arrives after the match ticket was closed, withdrawn, tombstoned, or placed on legal hold.
- A prior run has an inconclusive dossier rather than a clean asymmetric outcome.
- Both sides submit pushback requests for the same match ticket close together.
- One side's contract allows fewer re-negotiation rounds than the other side's contract.
- The cost ceiling is reached before any new advocate turn can be dispatched.
- A privacy-filter refusal prevents additional disclosure during re-negotiation.
- The prior run's prompt, tool, transcript, or scratch state is unavailable, redacted, or tombstoned.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept re-negotiation only from an explicit `match_ticket.renegotiation_requested` event or equivalent audited operator action that records the same event semantics.
- **FR-002**: System MUST create a fresh `run_id` for every accepted re-negotiation and MUST NOT reuse, resume, or mutate a prior run.
- **FR-003**: System MUST keep re-negotiation on the same match ticket while incrementing or otherwise recording the attempt sequence for that match ticket.
- **FR-004**: System MUST start each re-negotiation with no inherited prompt history, tool-call log, model scratch state, rubric scratch state, or side-specific negotiation context.
- **FR-005**: System MAY reference prior run identifiers, prior dossier identifiers, and match-ticket facts only as immutable audited inputs; these references MUST NOT recreate prior conversational state.
- **FR-006**: System MUST allow re-negotiation only after an asymmetric outcome where exactly one side cleared the applicable threshold and the cleared side is the requester.
- **FR-007**: System MUST refuse requests from unauthorized principals, non-cleared sides, closed match tickets, withdrawn parent tickets, tombstoned data, legal holds that block new processing, or match tickets without an eligible prior outcome.
- **FR-008**: System MUST enforce a hard per-match re-negotiation round cap. The effective cap MUST be the minimum of both sides' active contract caps and the platform default cap of 3.
- **FR-009**: System MUST enforce a per-match cost ceiling before starting a new run and while a re-negotiation run is active.
- **FR-010**: System MUST emit an operator-visible alarm when a request or active run breaches the per-match cost ceiling.
- **FR-011**: System MUST make duplicate request handling idempotent so replayed or duplicated events cannot create multiple runs for the same match ticket and attempt.
- **FR-012**: System MUST record audit evidence for every accepted request, refused request, fresh run allocation, cap evaluation, cost-ceiling decision, and termination caused by cap or cost controls.
- **FR-013**: System MUST preserve the non-cleared side's default silence posture: a refused or pending re-negotiation request MUST NOT notify the non-cleared side per-event unless a later feature explicitly opts that side into feedback.
- **FR-014**: System MUST route any additional disclosure or reframing through the existing privacy-filter and tool-dispatch boundaries.
- **FR-015**: System MUST terminate safely when privacy filtering, tool dispatch, advocate invocation, or dossier production fails during re-negotiation; termination MUST NOT roll back or overwrite prior run evidence.
- **FR-016**: System MUST expose re-negotiation outcomes in a way later channel and employer surface features can present without direct access to hidden run state.
- **FR-017**: System MUST treat F15 as orchestration over existing advocate behavior; seeker-side advocate logic remains F13 and employer-side advocate logic remains F14.

### Key Entities *(include if feature involves data)*

- **Re-negotiation Request**: An explicit pushback event for a match ticket, including requester side, requesting principal, prior run reference, reason/category, attempt target, request time, and idempotency identity.
- **Re-negotiation Attempt**: The bounded attempt record for a match ticket, including attempt number, fresh `run_id`, requester side, effective round cap, cost ceiling, status, and termination reason if any.
- **Run Isolation Boundary**: The policy boundary proving a fresh run has no inherited prompt history, tool-call log, side scratch state, or prior negotiation context.
- **Cost Ceiling Record**: The configured and observed per-match cost data used to allow, refuse, alarm, or terminate re-negotiation.
- **Re-negotiation Audit Event**: Immutable evidence of request, refusal, run allocation, cap/cost decision, alarm, and termination.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For 100% of accepted re-negotiation requests in test scenarios, the new run has a `run_id` distinct from all prior runs for the same match ticket.
- **SC-002**: Isolation tests demonstrate 0 inherited prompt-history entries, tool-call entries, and side scratch-state entries across re-negotiation boundaries.
- **SC-003**: Duplicate-event tests create no more than one run for the same match ticket and attempt.
- **SC-004**: Round-cap tests refuse any attempt beyond the effective cap and record the cap decision in audit evidence.
- **SC-005**: Cost-ceiling tests refuse or terminate over-budget re-negotiations and emit an operator-visible alarm in every breach case.
- **SC-006**: Unauthorized, non-cleared-side, closed-ticket, tombstoned, and legal-hold cases all fail closed without allocating a new run.
- **SC-007**: A quickstart run demonstrates one successful fresh-run re-negotiation and at least three refusal paths: cap reached, unauthorized requester, and cost ceiling reached.

## Assumptions

- F08 already provides the event-driven Parley runner and can consume match-made and re-negotiation-style events.
- F13 and F14 already provide the seeker and employer advocate baselines; F15 orchestrates them and does not alter their side-specific decision logic.
- F04 match ticket state can record attempt metadata or be extended in planning if the existing shape is insufficient.
- F05 audit and transcript primitives remain the source of immutable evidence and must not be bypassed.
- F09 privacy filtering remains mandatory for any additional disclosure used during re-negotiation.
- F12 model/prompt/runtime manifest controls remain the source of signed AI supply-chain references for new runs.
- The default re-negotiation cap is 3 unless a stricter side contract applies.
- Phase 0 validates whether the default cap of 3 is empirically appropriate; F15 enforces the cap but does not settle that product research question.
