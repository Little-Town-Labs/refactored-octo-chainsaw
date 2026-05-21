# Feature Specification: F08 Parley Runner

**Feature Branch**: `008-parley-runner`

**Created**: 2026-05-21

**Status**: Draft

**Input**: User description: "F08 Parley Runner. Stage 4 P0 full Parley harness runtime after F08.5, F09, F10, and F11 are merged. Follow Spec Kit process."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Dispatch a Match into a Bounded Parley Run (Priority: P1)

As the platform, I need a match-made event to start exactly one bounded Parley negotiation run, so every match ticket either reaches a signed dossier or a recorded terminal refusal without polling or duplicate in-flight runs.

**Why this priority**: F08 is the remaining Stage 4 P0 harness blocker. Without deterministic dispatch and coordination, the completed registries, dispatcher, privacy filter, dossier builder, and notification artifacts cannot be exercised end-to-end.

**Independent Test**: Given a match ticket with valid seeker/employer contract refs, published rubric bias evidence, a published tool surface, and a privacy ruleset ref, dispatch the match and verify one run is claimed, contract refs are frozen, effective round cap is resolved, and the coordinator reaches dossier production without polling.

**Acceptance Scenarios**:

1. **Given** a match-made event for a created match ticket, **When** dispatch preflight passes, **Then** one run is claimed and a negotiation dispatch event is emitted with frozen contract, rubric, tool-surface, privacy-ruleset, and harness refs.
2. **Given** duplicate dispatch events for the same match ticket and run, **When** the dispatcher handles them, **Then** idempotency returns the existing run without creating a second active run.
3. **Given** a contract or rubric dispatch gate refuses preflight, **When** dispatch is requested, **Then** the run terminates with a stable refusal reason and no match ticket advances to an active run.

---

### User Story 2 - Coordinate Side Turns Through Run-to-Completion (Priority: P1)

As the Parley coordinator, I need to drive seeker and employer turns under a strict run-state machine, so negotiations never pause for human input and always terminate under the configured round cap.

**Why this priority**: Run-to-completion and round-cap enforcement are Parley's central safety controls against indefinite automated negotiation.

**Independent Test**: Run deterministic side-agent fixtures through the coordinator and verify seeker-first alternation, min-across-sides round cap, both-sides-done short-circuiting, state transition audit events, and terminal dossier request.

**Acceptance Scenarios**:

1. **Given** both contracts specify round caps, **When** the run starts, **Then** the effective cap is the lower contract contribution bounded by the default cap of 3.
2. **Given** one side signals done, **When** the other side has not spoken in the current round, **Then** the coordinator still completes the other side's turn before deciding whether to score.
3. **Given** scoring cannot complete due to insufficient evidence or a recoverable failure, **When** the run terminates, **Then** an inconclusive dossier is requested with flags instead of pausing for human input.

---

### User Story 3 - Enforce Context and Tool Isolation (Priority: P1)

As a compliance and security reviewer, I need Parley contexts to isolate each run and each side while routing all counterparty access through the privacy filter and dispatcher, so prompt injection and tool bypasses cannot leak data across match boundaries.

**Why this priority**: Parley §9 isolation invariants and F08.5/F09 boundaries are production-gate requirements for Stage 4.

**Independent Test**: Create two runs for the same principal with adversarial free text in one run and verify the second run's context, prompt history, counterparty view, and scoring evidence remain unaffected; verify direct counterparty-data input to a side runner is rejected at type level.

**Acceptance Scenarios**:

1. **Given** two active runs for the same principal, **When** one run contains adversarial instructions, **Then** the other run cannot read or inherit that context.
2. **Given** a side runner needs counterparty information, **When** prompt assembly runs, **Then** it can only consume `counterparty_view` or `counterparty_filtered` dispatcher results.
3. **Given** the run reaches any terminal state, **When** cleanup runs, **Then** both per-side contexts are released and context release evidence is recorded.

---

### User Story 4 - Produce Signed Complete or Inconclusive Dossiers (Priority: P1)

As downstream review, notification, ATS, and A2A consumers, I need Parley to produce the canonical signed dossier for every complete or inconclusive terminal run, so all Stage 4 consumers receive one verifiable proof-of-work artifact.

**Why this priority**: Stage 4 completion requires an end-to-end synthetic match producing a signed valid dossier with seeker, employer, auditor, and A2A receiver projections.

**Independent Test**: Execute a synthetic match with deterministic side-agent fixtures and verify the produced dossier has both rubric breakdowns, deterministic weighted totals, four audience projections, version metadata, signature verification, and a `dossier.produced` handoff event.

**Acceptance Scenarios**:

1. **Given** both sides return full dimension scores, **When** dossier production runs, **Then** a conclusive signed dossier is persisted with all required audience projections.
2. **Given** one side has missing scores, a timeout, or tool failure evidence, **When** dossier production runs, **Then** an inconclusive dossier is persisted with at least one resolution flag.
3. **Given** a dossier is produced, **When** downstream events are emitted, **Then** notification artifact creation can consume `dossier.produced` without Parley knowing channel transport or ATS behavior.

### Edge Cases

- Duplicate `match_ticket.match_made` or renegotiation events arrive for the same match ticket.
- A contract is deprecated after dispatch but before the run completes.
- One side emits `done` while the other side still needs to speak.
- Both sides emit `done` in the same round before the default round cap.
- Tool calls are unsupported, exceed the per-turn cap, fail schema validation, or require privacy filtering.
- Privacy filtering refuses a projection or fails closed.
- Model output includes a holistic score that must be ignored.
- Scoring output omits a required rubric dimension.
- An invalidating match-ticket state change arrives mid-run.
- A process restart resumes with a different harness version.
- A re-negotiation uses the same match ticket but must start a fresh run context.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST expose six event-driven Parley functions: dispatcher, coordinator, seeker side runner, employer side runner, privacy filter worker, dossier producer, plus a run invalidation handler for invalidating match-ticket events.
- **FR-002**: System MUST consume match-made and renegotiation events and MUST NOT rely on polling to find runnable match tickets.
- **FR-003**: System MUST resolve and freeze seeker contract, employer contract, rubric refs, tool-surface refs, privacy-ruleset ref, model refs, and harness version at dispatch time.
- **FR-004**: System MUST refuse dispatch when required contract, tool-surface, privacy, or rubric bias-test evidence is unavailable, and MUST record a stable refusal reason.
- **FR-005**: System MUST claim at most one active run per match ticket and treat duplicate dispatch for the same run as idempotent recovery.
- **FR-006**: System MUST compute effective round cap as the minimum contract contribution bounded by the default cap of 3 unless configuration supplies a lower cap.
- **FR-007**: System MUST enforce seeker-first strict alternation for each round.
- **FR-008**: System MUST end negotiation and enter scoring when the effective round cap is reached or both sides signal done in the same round.
- **FR-009**: System MUST enforce run-to-completion: no harness tool or state may pause the run for human input mid-negotiation.
- **FR-010**: System MUST surface inability to score as an inconclusive dossier with flags rather than a paused run.
- **FR-011**: System MUST create per-run, per-side negotiation contexts with no filesystem workspaces and no context sharing across runs or sides.
- **FR-012**: System MUST route all cross-side content and counterparty-filtered tool output through the privacy filter before it enters a side runner's counterparty view.
- **FR-013**: System MUST ensure side-runner code invokes tools only through the tool dispatcher and continues turns on `tool_unsupported`.
- **FR-014**: System MUST scan advertised tool descriptors and refuse any tool whose semantics include asking a principal, waiting for human confirmation, or equivalent human-input pause behavior.
- **FR-015**: System MUST validate structured negotiation and scoring outputs and ignore any model-supplied holistic score.
- **FR-016**: System MUST compute rubric weighted totals deterministically from per-dimension scores and versioned rubric weights.
- **FR-017**: System MUST produce a conclusive dossier only when both sides supply complete rubric scores and all required audience projections are present.
- **FR-018**: System MUST produce a best-effort inconclusive dossier for scoring gaps, timeouts, and tool failures whenever enough evidence exists to persist one.
- **FR-019**: System MUST emit terminal run evidence and `dossier.produced` events for complete and inconclusive dossiers.
- **FR-020**: System MUST invalidate in-flight runs when match-ticket invalidating events arrive and prevent stale side-runner results from mutating terminal state.
- **FR-021**: System MUST record audit-quality evidence for dispatch, contract resolution, state transitions, context initialization/release, tool calls, privacy projections, scoring, dossier production, and terminal events.

### Key Entities *(include if feature involves data)*

- **Parley Run**: One execution for one match ticket and attempt, including run id, frozen refs, status, round, terminal reason, and dossier ref.
- **Negotiation Context**: Ephemeral per-run, per-side prompt history, principal view, counterparty view, tool-call log, and rubric scratch state.
- **Side Turn Output**: Structured negotiation message, internal notes, done signal, and flags emitted by one side for one round.
- **Scoring Output**: Per-dimension scores and rationale emitted by one side during scoring; deterministic total is computed by the harness.
- **Run Transition Event**: Audit-quality state transition record keyed by run, round, side, from-state, to-state, and reason.
- **Parley Function Definition**: Event-triggered function metadata, event schema, concurrency key, idempotency key, and retry posture for each harness function.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A synthetic match with valid dependencies reaches a signed valid dossier with seeker, employer, auditor, and A2A receiver projections.
- **SC-002**: Duplicate dispatch events for the same match produce one active run and one terminal dossier or refusal path.
- **SC-003**: Runs terminate no later than the effective round cap, with default cap 3 and lower contract contributions honored.
- **SC-004**: Missing rubric bias-test evidence refuses dispatch with `rubric_missing_bias_test` or the mapped contract-resolution reason.
- **SC-005**: Side-runner code cannot accept raw counterparty principal data in prompt assembly at type-check time.
- **SC-006**: Cross-run prompt-injection fixtures demonstrate no context inheritance across run ids.
- **SC-007**: Tool catalog scan refuses human-input or wait-for-confirmation tool semantics before dispatch.
- **SC-008**: Verification passes package tests, contract tests, type-check, lint, schema-lint, dispatcher import-boundary checks, privacy-filter no-gateway/sentinel tests, dossier signing verification, and an F08 staged quickstart run.

## Assumptions

- F07a supplies immutable agent contract versions and dispatch-time dependency resolution.
- F07b supplies rubric versions, deterministic scoring, and bias-test dispatch gating.
- F08.5 supplies tool surfaces, dispatcher enforcement, disclosure routing, and type-level dispatcher boundary tests.
- F09 supplies deterministic privacy filtering, sentinel wrapping, and no-gateway-reachability tests.
- F10 supplies dossier building, signing, projections, and verification helpers.
- F11 consumes `dossier.produced` events; F08 emits events but does not send candidate notices.
- Initial F08 implementation can use deterministic fixture side-agent drivers while preserving the public side-runner protocol needed for later real model integration.
