# Data Model: F08 Parley Runner

## Parley Run

Logical execution record for one match-ticket attempt.

**Fields**

- `run_id`: UUID string.
- `match_ticket_id`: UUID string.
- `match_ticket_identifier`: human-readable match key.
- `attempt`: positive integer.
- `status`: one of `pending`, `seeker_turn`, `seeker_filtering`, `employer_turn`, `employer_filtering`, `round_complete`, `scoring`, `producing_dossier`, `complete`, `inconclusive`, `aborted`, `timed_out`, `tool_failure`, `dispatch_refused`.
- `round`: integer, starts at 0 and increments after employer filtering.
- `round_cap`: positive integer, effective cap.
- `seeker_contract_ref`: `{contract_id, version}`.
- `employer_contract_ref`: `{contract_id, version}`.
- `privacy_ruleset_ref`: `{ruleset_id, version}`.
- `harness_version`: string frozen at dispatch.
- `terminal_reason`: nullable reason code.
- `dossier_id`: nullable UUID string.
- `started_at`, `completed_at`: timestamps.

**Validation Rules**

- One active run per `match_ticket_id`.
- Duplicate claim with the same `run_id` is idempotent.
- Duplicate claim with a different active `run_id` is refused.
- Terminal runs cannot transition back to active states.

## Parley Function Definition

Typed metadata for each event-driven harness function.

**Fields**

- `name`: `dispatcher`, `coordinator`, `side_runner_seeker`, `side_runner_employer`, `privacy_filter`, `dossier_producer`, or `run_invalidator`.
- `trigger_events`: event names consumed by the function.
- `emits_events`: event names emitted by the function.
- `concurrency_key`: deterministic expression over event payload fields.
- `idempotency_key`: deterministic expression over run id, step kind, round, side, and input hash.
- `retry_profile`: named retry policy.

**Validation Rules**

- No function may declare a polling trigger.
- Coordinator concurrency is keyed by match ticket.
- Privacy filter and dossier producer concurrency are keyed by run id.
- Side runners are keyed by `(run_id, side)`.

## Negotiation Context

Ephemeral per-run, per-side context. Not persisted as a database object.

**Fields**

- `run_id`: UUID string.
- `side`: `seeker` or `employer`.
- `principal_view`: sanitized object for this side's principal.
- `counterparty_view`: privacy-filtered object for the other side.
- `prompt_history`: immutable array of side-local messages.
- `tool_call_log`: structured tool-call summaries.
- `rubric_scratch`: map of rubric dimensions to tentative scores/rationales.
- `released`: boolean.

**Validation Rules**

- Context key must include both `run_id` and `side`.
- Side runners receive only their own context.
- Counterparty view updates must identify a privacy projection ref.
- Terminal transition releases both contexts.

## Side Turn Output

Structured negotiation response for one side.

**Fields**

- `run_id`, `side`, `round`.
- `message_to_counterparty`: string.
- `internal_notes`: string.
- `done_signal`: boolean.
- `flag_proposals`: string array.
- `tool_results`: dispatcher result refs.
- `model_invocation_ref`: string.

**Validation Rules**

- `message_to_counterparty` must be present for negotiation turns.
- `internal_notes` never crosses the privacy filter.
- Unsupported tool results may continue the turn.

## Scoring Output

Structured side-scoring response.

**Fields**

- `run_id`, `side`.
- `dimension_scores`: array of `{dimension_id, score, rationale}`.
- `headline_rationale`: string.
- `flag_proposals`: string array.
- `model_holistic_score`: optional ignored value.

**Validation Rules**

- Every required rubric dimension must have a score for conclusive dossier production.
- Any model holistic score is ignored and audited.
- Weighted total is computed by the harness, not accepted from the model.

## Run Transition Event

Audit-quality transition evidence.

**Fields**

- `transition_id`: UUID string.
- `run_id`, `match_ticket_id`.
- `round`: integer.
- `side`: nullable `seeker` or `employer`.
- `from_state`, `to_state`.
- `reason_code`: stable reason code.
- `audit_event_id`: nullable audit ref.
- `created_at`: timestamp.

**Validation Rules**

- `from_state` must match current run status.
- Terminal transitions set `completed_at`.
- Transition ids are idempotent for `(run_id, round, side, from_state, to_state, reason_code)`.

## Dossier Request

Handoff from coordinator to dossier producer.

**Fields**

- `run_id`, `match_ticket_id`.
- `status`: `conclusive` or `inconclusive`.
- `contract_refs`.
- `privacy_ruleset_ref`.
- `harness_version`.
- `model_invocation_refs`.
- `rubric_breakdowns`.
- `rationales`.
- `reconciled_flags`.
- `inconclusive_flags`.
- `projections`.

**Validation Rules**

- Conclusive requests require both seeker and employer complete rubric breakdowns.
- Inconclusive requests require at least one flag.
- All four dossier audiences must be present for conclusive status.
