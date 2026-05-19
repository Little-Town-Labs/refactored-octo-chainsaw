# Runbook — Ticket Lifecycle

**Owner:** F04 (Ticket store + state machines) · **Version:** 1.0 · **Date:** 2026-05-19

This runbook covers operational handling for F04 ticket state machines:
seeker tickets, employer requisitions, and match tickets. It is written
for operators diagnosing stuck workflows, applying manual transitions,
handling cancellations, and validating audit evidence.

Related code:

- State catalog: `packages/tickets/src/transitions.ts`
- Repositories: `packages/tickets/src/repo/`
- Server actions: `apps/web/src/tickets/actions/`
- Ticket procedures: `apps/web/src/server/tickets.ts`
- B8 evidence: `.specify/specs/04-ticket-store-state-machines/quickstart-run-2026-05-19.md`

## 1. State Machines

| Kind | Identifier | States |
| --- | --- | --- |
| Seeker ticket | `ST-YYYY-NNNNN` | `draft`, `submitted`, `screening`, `matching`, `matched`, `closed`, `withdrawn` |
| Employer requisition | `ER-YYYY-NNNNN` | `draft`, `submitted`, `open`, `matching`, `filled`, `closed`, `withdrawn` |
| Match ticket | `MT-YYYY-NNNNN` | `created`, `negotiating`, `delivered`, `accepted`, `rejected`, `expired` |

Terminal states:

- Seeker: `matched`, `closed`, `withdrawn`
- Employer requisition: `filled`, `closed`, `withdrawn`
- Match: `accepted`, `rejected`

## 2. First Checks

When a ticket appears stuck, collect these facts before changing state:

```sql
SELECT *
FROM seeker_tickets
WHERE identifier = '<ST-YYYY-NNNNN>';

SELECT *
FROM employer_req_tickets
WHERE identifier = '<ER-YYYY-NNNNN>';

SELECT *
FROM match_tickets
WHERE identifier = '<MT-YYYY-NNNNN>';
```

Then inspect audit history:

```sql
SELECT created_at, event_name, principal_kind, role_or_scope, correlation_id, payload
FROM audit_events_buffer
WHERE payload->>'ticket_identifier' = '<IDENTIFIER>'
ORDER BY created_at;
```

Expected properties:

- Every state mutation has an audit event.
- Multi-event workflows share one `correlation_id`.
- Audit payloads contain ticket metadata and state names, not raw notes
  or external IdP identifiers.

## 3. Stuck Seeker Tickets

Common stuck states:

- `submitted`: intake has not moved the ticket to `screening`.
- `screening`: screening did not progress to `matching`.
- `matching`: matching has stalled or source was withdrawn.

Allowed operational actions:

- Let the normal workflow continue if the upstream processor is merely
  delayed.
- Close from `screening` or `matching` with an operator transition and a
  closed-list `reason_code`.
- Withdraw only through the seeker-initiated withdrawal path when the
  seeker requests cancellation.

Operator closure must use `tickets.transition.operator` and one of the
closed reason codes in `OPERATOR_REASON_CODES`, for example `stale`,
`policy`, `duplicate`, or `compliance_hold`.

Audit expectation:

- `seeker_ticket.operator_transition`
- `payload.reason_code`
- `payload.actor_principal_id`

## 4. Stuck Employer Requisitions

Common stuck states:

- `submitted`: requisition has not opened.
- `open`: requisition has not entered matching.
- `matching`: match acceptance or closure did not complete.

Allowed operational actions:

- Progress normal workflow if the business-side processor can retry.
- Close from `open` or `matching` with an operator transition and a
  closed-list `reason_code`.
- Do not manually increment `headcount_filled`; use the accepted-match
  path so the state and audit event stay coupled.

Audit expectation:

- `employer_req_ticket.operator_transition` for manual closure
- `employer_req_ticket.filled` or `employer_req_ticket.matching` for
  accepted-match headcount updates

## 5. Match Tickets

Match tickets are service-principal controlled through
`tickets.match.advance`.

Operational checks:

```sql
SELECT match_ticket_id, identifier, state, round, round_cap, run_id, dossier_id, attempt
FROM match_tickets
WHERE identifier = '<MT-YYYY-NNNNN>';
```

Important invariants:

- `negotiating -> delivered` requires a non-null `dossier_id`.
- `renegotiate` increments `attempt`, resets `round` to `0`, clears
  `dossier_id`, assigns a new `run_id`, and sets state to
  `negotiating`.
- Duplicate `(seeker_ticket_id, employer_req_ticket_id, attempt)` match
  creation is rejected as an idempotency conflict.

If a match is stuck in `negotiating`, first verify the Parley run state.
If Parley can retry, retry the service procedure. If the run cap is
exhausted, transition to `expired` or use `renegotiate` according to the
product decision.

## 6. Cancellation And Amendment Cascades

Seeker withdrawal during active negotiation:

1. `withdrawSeekerIntent` moves the seeker ticket to `withdrawn`.
2. If a linked match is `negotiating`, it moves to `rejected`.
3. The match rejection uses `reason_code='source_withdrawn'`.
4. Both audit events share one `correlation_id`.

Jurisdiction-changing amendments:

1. `amendSeekerIntent` or `amendEmployerRequisition` emits
   `*_ticket.amended`.
2. The amendment payload includes `patched_fields` and
   `prior_values_present`, not raw prior values.
3. If a linked `negotiating` match's `decision_locus_jurisdiction` is no
   longer present, the match moves to `rejected`.
4. The match rejection uses `reason_code='jurisdiction_changed'`.

## 7. Manual SQL Safety

Manual SQL updates to ticket states are discouraged. If an emergency
requires SQL, use this rule:

- State update and audit insert must be in the same transaction.
- The audit event must use the same `correlation_id` for all related
  changes.
- The event payload must match
  `.specify/specs/04-ticket-store-state-machines/contracts/transition-event.schema.yaml`.

Preferred rollback pattern:

```sql
BEGIN;
-- inspect
-- mutate
-- insert audit event
-- verify
ROLLBACK;
```

Only use `COMMIT` after a peer has reviewed the exact mutation and
audit event.

## 8. Verification Commands

Local gates for lifecycle changes:

```bash
pnpm --filter @spyglass/tickets test
pnpm --filter @spyglass/tickets type-check
pnpm --filter @spyglass/web test
pnpm --filter @spyglass/web type-check
pnpm tickets:coverage
bash scripts/check-principal-coverage.sh
```

B8 staged evidence:

```bash
pnpm --filter @spyglass/db dev-run:f04
```

The staged run writes
`.specify/specs/04-ticket-store-state-machines/quickstart-run-<date>.md`
and rolls back all inserted rows.

