# Parley Re-negotiation Runbook

## Scope

F15 governs controlled re-negotiation after an asymmetric Parley outcome. It is
an orchestration policy in `@spyglass/parley`, not seeker advocate logic,
employer advocate logic, UI feedback, or channel notification behavior.

## Operating Rules

- Accept only explicit `match_ticket.renegotiation_requested` events or audited
  operator actions with identical event semantics.
- Allocate a fresh `run_id` for every accepted request. Never resume, retry, or
  mutate a prior Parley run.
- Keep the same match ticket and increment the attempt sequence.
- Start every accepted run with zero prompt-history entries, zero tool-call
  entries, zero seeker scratch entries, zero employer scratch entries, and no
  prior context rehydration.
- Treat prior run ids and dossier ids as immutable references only.
- Allow requests only from the side that cleared the prior asymmetric threshold.
- Fail closed for unauthorized principals, non-cleared sides, closed or
  withdrawn tickets, tombstones, legal holds, missing prior refs, and
  non-asymmetric prior outcomes.
- Enforce the effective round cap as the minimum of seeker contract cap,
  employer contract cap, and the platform default cap of 3.
- Enforce per-match cost ceilings before dispatch and during active runs.
- Emit alarm records for cost ceiling breaches and duplicate allocation risks.
- Preserve the non-cleared side's silence posture for refused and pending
  requests unless a later feature explicitly opts into feedback.

## Triage

- `renegotiation_allowed`: verify the run id differs from every prior run id and
  the isolation boundary counters are all zero.
- `duplicate_request`: inspect the original request id and confirm no second run
  allocation occurred.
- `unauthorized_requester`: verify principal scopes include
  `match_ticket:renegotiate` and that the principal is authorized for the match.
- `requester_not_cleared_side`: confirm the prior asymmetric outcome and side
  threshold evidence.
- `prior_outcome_not_asymmetric`: inspect the prior dossier outcome; both-clear,
  no-clear, and inconclusive outcomes are not eligible for F15.
- `round_cap_exhausted`: compare current attempt and requested attempt against
  the effective cap.
- `cost_ceiling_exceeded`: compare estimated or observed cost against the
  per-match ceiling and verify an alarm record exists.
- `legal_hold_blocks_processing` and `tombstone_blocks_processing`: do not retry
  until the governing hold or erasure state is resolved by the proper owner.
- `active_run_exists`: verify whether a distinct request attempted to allocate a
  run while another run was active for the same match ticket.

## Review Evidence

Reviewers should expect:

- request, decision, attempt, isolation, cost, and alarm records,
- audit evidence for accepted, refused, replayed, allocation, alarm, and
  termination paths,
- fresh `run_id` allocation for accepted requests,
- immutable prior run and dossier references,
- zero inherited context counters,
- non-cleared-side notification policy set to false,
- staged dev-run evidence for accepted, duplicate, cap, unauthorized, cost
  preflight, and runtime cost breach scenarios.
