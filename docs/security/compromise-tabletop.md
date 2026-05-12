# Compromise Tabletop Drill

**Owner:** F02 (Identity & Auth), B7
**Spec ref:** spec.md FR-39; Quickstart Scenario 6
**Constitution:** v2.0.0 §I.D (forensic readiness), §V.3 (security review cadence)
**Cadence:** before every F02 release-candidate; on any change to the credential-lifecycle runbook; otherwise quarterly.

---

## Purpose

A scripted tabletop exercise that proves the runbook
(`credential-lifecycle.md`) maps to executable steps, audit events
fire as documented, and the operator team can perform the
response without ad-hoc decisions under pressure.

T065 requires the drill to be **executed and recorded**. This file
is the facilitator's script + the record-of-drill template. The
"Execution log" section is filled in during the drill.

---

## Before the drill

- [ ] Two operators available (initiator + approver — exercises
      the EC-3 path even if the drill itself doesn't require it).
- [ ] Dev environment provisioned with a Neon branch dedicated to
      the drill so destructive actions are isolated.
- [ ] At least one operator has read `credential-lifecycle.md` end
      to end within the last 30 days.
- [ ] Facilitator has the audit-event registry from
      `credential-lifecycle.md` §6 open for cross-checking.
- [ ] Slack / chat channel logged for timeline reconstruction.

---

## Drill scenario

**Premise:** at 14:00 the on-call operator (Operator A) receives a
PagerDuty alert: an agent credential `cred_abc123` was observed
in a public GitHub gist for ~7 minutes before being deleted. The
credential is for `run_id=run_xyz` (a live seeker run), scope set
includes `dossier.read`, and has 1h 12m remaining on its TTL.

**Goal:** revoke the credential, bound the blast radius, and
file the incident — all using only the documented runbook
surfaces (no manual SQL, no out-of-band Slack negotiations).

---

## Script (run linearly; record times + decisions)

### Phase 1 — Immediate containment (target: ≤5 min from alert)

1. Operator A opens `/operator/console/audit?principal_id=<run principal>`
   and scrolls back to the credential's `agent_credential.issued`
   event. Records: `correlation_id`, `kid`, `issued_at`,
   `expires_at`, `scope_set`.
2. Operator A opens
   `/operator/console/credentials/<principal_id>/revoke`.
3. Operator A selects reason `compromise_suspected`, leaves a
   note pointing at the gist URL, submits.
4. Operator A confirms the flash redirect lands at
   `/operator/console/credentials?flash=revoked&count=N` with
   N ≥ 1.

**Record:** time-to-revoke (T1 = step 3 submit - alert), N, the
audit-event `correlation_id` from step 1.

### Phase 2 — Blast-radius bounding (target: ≤15 min)

5. Operator A opens
   `/operator/console/audit?correlation_id=<from step 1>` and
   lists every event under the same correlation. Counts tool
   calls the credential authorized; notes any cross-principal
   actions.
6. Operator A reviews other credentials for the same `principal_id`
   in the last 24h via the credentials list filter
   `?principal_id=<id>&status=active`. Decides whether any
   sibling credentials should also be revoked.
7. If the issuance audit traces back to an operator, Operator A
   reviews that operator's other recent issuances (B6 audit
   viewer supports `?principal_id=<operator_id>`).

**Record:** affected-tool-calls count, decision on sibling
credentials, decision on operator-account review.

### Phase 3 — Two-operator gate exercise (target: ≤30 min)

This is the EC-3 path even though the original incident does not
require it. The drill exercises it to prove the gate works.

8. Operator A initiates sign-out for *their own simulated test
   operator account* (NOT a production operator). The page is at
   `/operator/console/credentials/<test_operator_id>/sign-out`.
9. Operator A submits → confirms the response includes a
   `pending_approval` banner with an `approval_id` and 15-minute
   expiry.
10. Operator A sends the approval URL to Operator B via the
    chat channel.
11. Operator B opens the URL, reviews, submits.
12. Verify the audit log shows:
    - `human_sessions.revoke_all_initiated` by Operator A
    - `human_sessions.revoked_all` with `two_operator_gated: true`,
      `initiated_by: A`, `approved_by: B`

**Record:** time-to-second-operator-approval (T3 = step 11 submit
- step 9 submit), audit-event correlation_id.

### Phase 4 — Self-approval rejection (target: ≤1 min)

Defense-in-depth verification.

13. Operator A initiates a second sign-out against a different
    test operator account.
14. Operator A opens the approval URL themselves (does NOT hand
    off to Operator B).
15. Operator A submits.
16. Verify: the page renders the `form_invalid` (or `forbidden`)
    banner; the audit log shows
    `human_sessions.revoke_all_denied` with `reason: self_approval`.
    The session is NOT revoked.

**Record:** banner kind shown, audit-event payload, time-from-
attempt-to-rejection (should be sub-second).

### Phase 5 — Signing-key force-retire exercise (target: ≤15 min)

Exercises §4.3 of `credential-lifecycle.md` in the dedicated
drill branch only (do not perform in production).

17. Generate a new EdDSA keypair via the helper script (per §4.1).
18. Insert into the drill branch's `signing_keys` with
    `activated_at=NULL`.
19. Run the rotation: activate new, force-retire old with
    `verify_until = now()`.
20. Verify:
    - `signing_keys_active_per_purpose_idx` allows the swap
      atomically (no two active rows for the same purpose at
      any moment).
    - New credentials issued post-step-19 sign under the new `kid`.
    - Existing credentials under the old `kid` are revoked via
      revocations-list inserts (Phase 1 propagation cadence
      applies).
21. Confirm JWKS endpoint reflects the new key within one cache
    refresh.

**Record:** times for activate / retire / first-new-credential
under the new `kid`.

### Phase 6 — Post-drill (target: ≤24 hours)

22. Facilitator files the drill record (this document, completed).
23. Compare measured times against the runbook's stated targets
    (see "Pass criteria" below). Note any miss as a follow-up.
24. Update `credential-lifecycle.md` if any step in this drill
    revealed a gap. Increment its "Last reviewed" date.

---

## Pass criteria

The drill passes when all of:

- T1 (alert → revoke submit) ≤ 5 minutes.
- T3 (first operator initiate → second operator execute) ≤ 15 minutes.
- Phase 4 self-approval rejected with the documented
  `human_sessions.revoke_all_denied{reason: self_approval}` event.
- Phase 5 signing-key swap completes without any window where two
  rows are simultaneously active for the same purpose.
- Every state-changing action in phases 1-5 produced a structured
  audit event matching the registry in
  `credential-lifecycle.md` §6.
- No step required a manual SQL edit or an out-of-runbook
  workaround. If any step did, the runbook is wrong — fix it
  before the next drill.

---

## Execution log (filled in during drill)

**Drill date:** _____________
**Facilitator:** _____________
**Operator A:** _____________
**Operator B:** _____________
**Neon branch:** _____________
**Spyglass HEAD:** _____________

### Times

| Metric | Target | Observed | Notes |
|---|---|---|---|
| T1: alert → revoke submit (Phase 1) | ≤ 5 min | | |
| Phase 2 review completion | ≤ 15 min from alert | | |
| T3: 1st → 2nd operator approve (Phase 3) | ≤ 15 min | | |
| Phase 4 self-approval rejection | sub-second | | |
| Phase 5 key swap completion | ≤ 15 min | | |

### Audit events captured

For each event, record `name`, `correlation_id`, `principal_id`,
and the relevant payload fields (reason, approval_id, kid, etc.).

| Phase | Event name | Correlation ID | Principal ID | Notes |
|---|---|---|---|---|
| 1 | agent_credential.issued (looked up) | | | (pre-existing) |
| 1 | agent_credential.revoked | | | |
| 3 | human_sessions.revoke_all_initiated | | | |
| 3 | human_sessions.revoked_all (two_operator_gated=true) | | | |
| 4 | human_sessions.revoke_all_denied (reason=self_approval) | | | |
| 5 | (signing-key rotation does not currently emit an audit event — see follow-up) | | | |

### Findings

Surprises, runbook gaps, tool problems, suggested improvements:

1. _____________
2. _____________
3. _____________

### Follow-up actions

| Action | Owner | Due |
|---|---|---|
| | | |
| | | |

---

## Notes for the facilitator

- The drill is **explicitly destructive** in the dedicated Neon
  branch. Confirm `DATABASE_URL` points at the drill branch
  before Phase 1 step 3 (revoke is final).
- The 7-minute exposure window in the premise is arbitrary —
  feel free to vary it (longer = more affected calls in Phase 2;
  shorter = stricter time pressure on Phase 1) to keep operators
  fresh across repeat drills.
- If a runbook step references a console URL the operator can't
  find quickly, that's a finding: the surface needs better
  signposting from the audit viewer.
- The Phase 5 expectation that signing-key rotation lacks an
  audit event is a known gap (logged below as a follow-up). The
  drill records it explicitly so it isn't forgotten.

---

## Known gaps (carry across drills until closed)

| Gap | First identified | Status |
|---|---|---|
| Signing-key rotation emits no audit event today. Add `signing_key.activated` / `signing_key.retired` to the registry and emit from §4.1-4.3 of `credential-lifecycle.md`. | 2026-05-11 (initial drill scaffold) | Open |
| Service-credential revocation has no operator UI yet (revoke is currently a backend-only script). B6 only ships agent-credential revocation. | 2026-05-11 | Open (planned for post-B6 slice) |
| Compromise drill itself emits no marker event into the audit log, so post-drill audit-log archaeology can't distinguish drill events from real events. Consider a `drill.started` / `drill.ended` event keyed by a per-drill correlation id. | 2026-05-11 | Open |

---

## Change log

| Date | Author | Change |
|---|---|---|
| 2026-05-11 | F02 implementation team | Initial scaffold for B7 (T065). Drill not yet executed — execution log empty pending first run. |
