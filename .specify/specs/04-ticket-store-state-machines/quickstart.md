# F04 Quickstart — Ticket store + state machines

**Spec:** v1.1 · **Plan:** v1.0 · **Date:** 2026-05-12

Scenarios that demonstrate F04 is in place. Each scenario is a manual
or scripted walkthrough; together they are the operator-run gate for
F04 closure.

---

## Scenario 1 — Submit a seeker intent (US-1)

**Pre:** F04 merged; F02 humans surface available (operator or seeker
session).

**Steps:**
1. As a Clerk-authenticated seeker, call `submitSeekerIntent` server
   action with role_family, comp_band, jurisdictions, work_mode.
2. Verify response payload contains `seeker_ticket_id` (UUIDv7) and
   `identifier` matching `ST-YYYY-NNNNN`.
3. Query the row: state should be `submitted`.
4. Query `audit_events_buffer` for matching `correlation_id`: one
   event `seeker_ticket.submitted` should be present with redacted
   payload (no raw PII).

**Pass criteria:**
- Row exists.
- Identifier shape valid.
- Audit event emitted with correct shape (validates against
  `transition-event.schema.yaml`).

---

## Scenario 2 — Open an employer requisition (US-2)

**Pre:** F04 merged; employer-admin Clerk session active in a Clerk
Org.

**Steps:**
1. Call `submitEmployerRequisition` server action with role_title,
   role_level, comp_band, jurisdictions, headcount_total.
2. Verify row created with state `submitted` and identifier
   `ER-YYYY-NNNNN`.
3. Verify `org_id` matches caller's Clerk Org's mirrored
   `organizations.org_id`.

**Pass criteria:** as Scenario 1.

---

## Scenario 3 — Create a match ticket atomically (US-3)

**Pre:** One seeker ticket in `matching`, one employer-req ticket in
`matching`.

**Steps:**
1. As the matcher service principal (with scope
   `tickets.match.advance`), call `createMatchTicket(seeker_id,
   employer_req_id)`.
2. Verify a single DB transaction:
   - `match_tickets` row inserted with state `created`, identifier
     `MT-YYYY-NNNNN`, `attempt = 1`.
   - Both source ticket states updated to `matching` (already
     `matching`; idempotent).
3. Verify 1 audit event: `match_ticket.created`.

**Pass criteria:** match row present + audit event shape valid.

---

## Scenario 4 — Idempotency on match creation (EC-3, FR-8)

**Pre:** A match ticket exists for (seeker_id, employer_req_id) pair.

**Steps:**
1. Call `createMatchTicket(seeker_id, employer_req_id)` a second time.
2. Expect `IdempotencyConflictError`. Response payload identifies the
   existing `match_ticket_id`.

**Pass criteria:** typed error returned; no duplicate row created.

---

## Scenario 5 — Operator transition with reason_code (US-4, EC-4)

**Pre:** A seeker ticket in `screening` is stuck (e.g., 7 days no
progression).

**Steps:**
1. Operator (`tickets.transition.operator` scope) calls
   `operatorTransition(seeker_id, 'closed', reason_code='stalled_screening')`.
2. Verify row state advances to `closed`.
3. Verify audit event `seeker_ticket.operator_transition` carries
   `reason_code='stalled_screening'` and `actor_principal_id` =
   operator's principal_id.

**Pre B (negative):** Operator omits `reason_code`.
**Expect:** `MissingReasonCodeError`; no mutation; no audit event.

**Pass criteria:** correct positive + negative behaviors.

---

## Scenario 6 — Seeker withdrawal during active negotiation (US-5, EC-1)

**Pre:** A match ticket in `negotiating` against a seeker ticket in
`matching`.

**Steps:**
1. Seeker calls `withdrawSeekerIntent(seeker_id)`.
2. Verify seeker ticket transitions to `withdrawn`.
3. Verify the linked match ticket transitions to `rejected` with
   `reason_code='source_withdrawn'`.
4. Verify two audit events emitted in the same correlation_id:
   `seeker_ticket.withdrawn` and `match_ticket.rejected`.

**Pass criteria:** both transitions complete atomically; both events
emitted; F08's harness receives the rejection signal (out-of-scope
for F04 test; verify via event payload).

---

## Scenario 7 — Parley harness advances a match (US-6)

**Pre:** A match ticket in `created`. Parley service principal exists
with scope `tickets.match.advance`.

**Steps:**
1. Parley calls `advanceMatch(match_id, to='negotiating')` —
   allocates `run_id`.
2. Verify state = `negotiating`, `round = 0`, `run_id` non-null.
3. Parley increments `round` up to `round_cap`. Each increment is
   exposed as a typed mutation (`advanceRound`) guarded by
   `tickets.match.advance`.
4. Parley calls `completeRun(match_id, dossier_id)` to transition to
   `delivered`.
5. Verify `delivered` requires non-null `dossier_id`; row reflects.
6. Verify 1 audit event per transition + per round increment.

**Pass criteria:** atomic transitions + correct invariant enforcement.

---

## Scenario 8 — Re-negotiation increments attempt (EC-7)

**Pre:** A match ticket in `expired` (round_cap exhausted).

**Steps:**
1. Service principal calls `renegotiate(match_id)`.
2. Verify single transaction:
   - `attempt` incremented.
   - `run_id` cleared (set to NULL).
   - `dossier_id` cleared (already NULL on `expired`).
   - `round` reset to 0.
   - state set to `negotiating`.
3. Verify audit event `match_ticket.renegotiated` carrying new
   `attempt` and new `run_id`.

**Pass criteria:** atomic; audit event present.

---

## Scenario 9 — Audit trail retrieval (US-7)

**Pre:** A ticket with 4+ historical transitions.

**Steps:**
1. As an auditor (operator with `tickets.audit.view` — out-of-scope
   for F04; reuse F02 audit-viewer permissions), query
   `audit_events_buffer` filtered by `payload.ticket_id`.
2. Verify rows returned in `created_at` order.
3. Verify zero PII in payloads (only `notes_present` boolean, never
   `notes`).

**Pass criteria:** chronological listing; redaction correct.

---

## Scenario 10 — Cross-side leakage prevention (NFR-9)

**Pre:** A seeker S1 and an employer-admin E1 each authenticated. A
match ticket M1 exists pairing them.

**Steps:**
1. As S1, call `fetchById('employer_req', E1's_requisition_id)`.
   Expect: `ScopeRequiredError` or filtered fields (jurisdiction +
   role family allowed by F09 projection; comp_band hidden).
2. As S1, call `fetchById('match', M1)`. Expect: filtered match
   view (seeker side fields visible; employer side hidden beyond
   F09 projection).
3. As E1, mirror — call `fetchById('seeker', S1's_ticket_id)` and
   expect filtered fields.

**Pass criteria:** no cross-side leakage. Service principals bypass
filtering for reads (with scope check).

---

## Scenario 11 — Year-rollover identifier sequence (EC-9 / R-3)

**Pre:** Inngest scheduler is running. Dev environment time can be
mocked.

**Steps:**
1. Wind dev clock to Dec 1, fire the rollover cron.
2. Verify three new sequences exist: `seeker_tickets_<NEXT>_seq`,
   `employer_req_tickets_<NEXT>_seq`, `match_tickets_<NEXT>_seq`.
3. Verify audit events `identifier_sequences.bootstrapped` (3).
4. Wind clock to Jan 1 next year. Submit a seeker intent.
5. Verify identifier shape `ST-<NEXT>-00001`.

**Pass criteria:** sequences pre-created; first ticket of new year
uses new year's sequence.

---

## Out-of-band (operator-run) gates for F04 closure

- **G-1.** Walk Scenarios 1–11 against a deployed preview.
- **G-2.** Run M-2 dev-run scenario (100 seekers + 100 employer-reqs +
  50 matches + 25 delivered). Capture per-transition latency
  histograms and confirm NFR-2/NFR-3 thresholds.
- **G-3.** Spec-kit gates: `/speckit-analyze` clean; `/code-review`
  clean (no CRITICAL/HIGH); back-check resolved.
