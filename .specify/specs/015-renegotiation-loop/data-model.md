# Data Model: Re-negotiation Loop

## Re-negotiation Request

Represents an explicit pushback event for a match ticket.

**Fields**:

- `request_id`: stable idempotency identity for the request event.
- `event_name`: must be `match_ticket.renegotiation_requested`.
- `event_version`: schema version, starting at `1`.
- `match_ticket_id`: canonical match-ticket identifier.
- `match_ticket_identifier`: external or human-readable match-ticket key.
- `requester_side`: `seeker` or `employer`.
- `requester_principal_id`: authenticated actor requesting pushback.
- `requester_scopes`: scopes used for authorization.
- `prior_run_id`: prior run being challenged or referenced.
- `prior_dossier_id`: optional prior dossier reference.
- `requested_attempt`: intended attempt number for the same match ticket.
- `reason_code`: requester-visible category for the pushback request.
- `requested_at`: event timestamp.

**Validation rules**:

- Requester must be authenticated and authorized for the match ticket.
- Requester side must be the side that cleared the prior asymmetric threshold.
- Request must not allocate a run if the ticket is closed, withdrawn, tombstoned, or blocked by legal hold.
- `(match_ticket_id, requested_attempt, request_id)` must be idempotent.

## Re-negotiation Decision

Records the policy decision made for a request.

**Fields**:

- `decision_id`
- `request_id`
- `decision`: `allow`, `deny`, or `idempotent_replay`.
- `reason_code`
- `match_ticket_id`
- `attempt`
- `run_id`: present only for allowed or replayed accepted decisions.
- `effective_round_cap`
- `cost_ceiling`
- `estimated_cost`
- `audit_event_ref`
- `notification_policy.non_cleared_side_notified`: always `false` for F15 pending/refused decisions.
- `decided_at`

**Reason codes**:

- `renegotiation_allowed`
- `duplicate_request`
- `unauthorized_requester`
- `requester_not_cleared_side`
- `match_ticket_not_found`
- `match_ticket_not_eligible`
- `prior_outcome_not_asymmetric`
- `round_cap_exhausted`
- `cost_ceiling_exceeded`
- `legal_hold_blocks_processing`
- `tombstone_blocks_processing`
- `active_run_exists`
- `missing_required_reference`

## Re-negotiation Attempt

Represents the bounded attempt record for a same-ticket fresh run.

**Fields**:

- `attempt_id`
- `match_ticket_id`
- `attempt`
- `run_id`
- `request_id`
- `requester_side`
- `status`: `accepted`, `dispatched`, `running`, `complete`, `inconclusive`, `refused`, or `terminated`.
- `effective_round_cap`
- `cost_ceiling`
- `cost_observed`
- `prior_run_id`
- `prior_dossier_id`
- `isolation_boundary`
- `created_at`
- `started_at`
- `completed_at`
- `terminal_reason`

**State transitions**:

```text
requested -> accepted -> dispatched -> running -> complete
requested -> refused
running -> terminated
running -> inconclusive
accepted -> terminated
```

No transition may mutate prior run or prior dossier records.

## Run Isolation Boundary

Proof that the fresh run did not inherit live state.

**Fields**:

- `prompt_history_entries`: must be `0` at run start.
- `tool_call_entries`: must be `0` at run start.
- `seeker_scratch_entries`: must be `0` at run start.
- `employer_scratch_entries`: must be `0` at run start.
- `prior_context_rehydrated`: must be `false`.
- `allowed_reference_types`: match-ticket facts, prior run id, prior dossier id, contract refs, rubric refs, prompt/model/runtime refs.

## Cost Ceiling Record

Captures configured and observed per-match spend controls.

**Fields**:

- `match_ticket_id`
- `attempt`
- `ceiling_amount`
- `estimated_cost`
- `observed_cost`
- `currency`
- `preflight_status`: `under_ceiling` or `blocked`.
- `runtime_status`: `under_ceiling`, `breached`, or `not_started`.
- `alarm_ref`

## Re-negotiation Alarm

Operator-visible alarm emitted for threshold or duplicate-allocation risks.

**Fields**:

- `alarm_id`
- `alarm_type`: `cost_ceiling_exceeded`, `round_cap_exhausted`, or `duplicate_run_allocation_attempt`.
- `severity`: `warning`, `high`, or `critical`.
- `match_ticket_id`
- `attempt`
- `run_id`
- `threshold`
- `observed`
- `audit_event_ref`
- `raised_at`
