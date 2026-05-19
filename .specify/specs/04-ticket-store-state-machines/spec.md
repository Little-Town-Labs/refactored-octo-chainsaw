# Feature Specification — F04 Ticket Store + State Machines

**Feature ID:** F04
**Slug:** `04-ticket-store-state-machines`
**Branch:** `04-ticket-store-state-machines`
**Stage:** 2 — Ticket Spine
**Priority:** P0 (Critical)
**Complexity:** L (4–6 weeks)
**Status:** Draft v1.1 (clarifications CL-1, CL-2, CL-3 resolved 2026-05-12)
**Created:** 2026-05-12
**Owner:** Gary
**Constitution refs:** v2.0.0 §I.2 (Integrity — state versioned, transitions
audited), §I.4.1 (data minimization — only fields needed for matching),
§I.4.2 (Retention — per-class horizons), §I.5.1 (Authentication — every
mutation has a principal), §I.5.2 (Authorization — least privilege on
state transitions), §I.5.3 (Accountability — every transition attributable),
§I.6 (Defense in Depth), §I.A.1 (jurisdiction tagging on every ticket),
§II (Agent-Native — agents read these tickets, never write them)
**Roadmap:** `.specify/roadmap.md` v1.2.0 (F04), refreshed by F03's
v1.3.0 entry already on `main`
**PRD:** `PRD.md` §3 (users + intents), §4 (privacy filter consumes these
tickets), §6 (v0 scope — tickets are user-facing), §11.5 ("data spine is the
first spec"), §13 (Parley §13 audit-log + transcript)
**Parley input:** `/mnt/f/parley/SPEC.md` §4.1.1 (Match Ticket entity),
§4.1.4 (Negotiation Run), §4.2 (Stable Identifiers), §7 (Run State Machine).
**These are inputs to F04, not restated.**
**Depends on:** F01 (monorepo, Drizzle, Neon), F02 (Principal model + audit
sink + audit_events_buffer), F03 (data-classification register, retention
policy, schema conventions, schema-lint)
**Blocks:** F05 (audit log + transcript store — consumes F04's transition
events), F06 (jurisdiction gates — reads ticket.jurisdiction), F08 (Parley
runner — reads match_tickets, writes round counter), F09 (privacy filter —
reads seeker + employer tickets), F10 (dossier — references match_ticket),
every later feature that mutates ticket state

---

## 1. Overview

F04 builds the **persistence layer and transition-control logic** for
Spyglass's three ticket kinds. It is the data spine PRD §11.5 calls the
"first spec." Every later feature that creates, advances, or completes a
match writes through F04.

F04 does **not**:
- Run the Parley harness (F08 owns that).
- Apply the privacy filter (F09 owns that).
- Produce the dossier (F10 owns that).
- Append to the hash-chained audit log (F05 owns that — F04 emits
  events into F02's interim `audit_events_buffer` sink until F05 cuts
  over per CL-3).

F04 **does**:
- Define the three ticket-kind tables (FR-1).
- Define each kind's state machine and the allowed transition graph (FR-2).
- Enforce that every mutation passes through a typed transition validator
  with a verified principal (FR-3, FR-4).
- Emit a transition-event row for every state change (FR-5).
- Conform to F03's schema conventions, retention policy, and
  data-classification register (FR-13).

### 1.1 Why this feature exists

- **Constitution §I.2** requires that state transitions be versioned and
  auditable. F04 produces both the row and the event.
- **Constitution §II** ("Agent-Native Architecture") commits to agents
  *reading* the canonical ticket — not inventing or mutating it. F04 is
  where that canonical ticket lives.
- **PRD §11.5** names this the "first spec" — the spine every later
  feature joins back to.
- **Parley alignment.** Parley SPEC §4.1.1 names the match-ticket fields
  the harness will consume; F04 is the producer. Parley SPEC §7 names
  the run-state machine; F04's match-ticket state machine extends one
  transition into Parley (`matching → negotiating`) and consumes one
  transition out (`completed → delivered`).
- **F02 reachability.** F02 already issues agent credentials keyed on
  `run_id + side + contract_id`. F04 produces the row whose lifecycle
  generates that `run_id` (each match ticket entering negotiation
  spawns a `run_id`).

### 1.2 Scope

**In scope:**
- Three ticket-kind tables: `seeker_tickets`, `employer_req_tickets`,
  `match_tickets`.
- Per-kind state machines (FR-2):
  - **Seeker** (FR-2.1): `draft → submitted → screening → matching → matched | closed | withdrawn`
  - **Employer-req** (FR-2.2): `draft → submitted → open → matching → filled | closed | withdrawn`
  - **Match** (FR-2.3): `created → negotiating → delivered → accepted | rejected | expired`
- Typed transition validators (FR-3): no implicit transitions; every
  state change goes through a validator that checks (a) the current
  state, (b) the requested next state, (c) the caller's principal +
  scope, (d) any state-specific invariants (e.g., a match ticket can
  enter `negotiating` only when both source tickets are still in
  `matching`).
- Server actions / tRPC procedures for the supported mutations (FR-4)
  guarded by `withPrincipal` per F02 NFR-11.
- Transition event emission to F02's `audit_events_buffer` (FR-5) with
  payload shape that F05's hash-chained log will adopt unchanged.
- Jurisdiction tagging (FR-6) on every seeker + employer-req ticket
  per Constitution §I.A.1. Match tickets inherit jurisdictions from
  their source tickets and record the decision locus.
- Conformance to F03 schema conventions (FR-13):
  - register entries for all 3 new tables × ~50 cols
  - retention horizons declared per class
  - integrity-invariant catalog entries
  - schema-lint passes clean
- Read-side query primitives for downstream features (FR-9): list
  tickets by tier, by jurisdiction, by state; fetch a single ticket;
  resolve a match ticket's full join graph.

**Out of scope (deferred):**
- **Source-ticket discovery / authoring UI.** F20 owns the seeker
  onboarding flow; F22 owns the employer console. F04 ships only the
  data-layer primitives + state transitions; the UIs are downstream.
- **Matching algorithm.** F11 (or similar) decides which seeker pairs
  with which employer-req. F04 records the *result* (creates the
  match_ticket row); it does not compute the match.
- **Parley harness wiring.** F08 owns the runner. F04 exposes the
  `matching → negotiating` and `delivered ← completed` transitions
  Parley will call; the harness itself is not in F04.
- **Dossier production.** F10 owns the dossier. F04's `match_tickets`
  carries a nullable `dossier_id` FK as the join target; the dossier
  table and its lifecycle are F10.
- **Hash-chained audit log.** F05 ships it. F04 emits to F02's interim
  `audit_events_buffer` with the payload shape F05 will adopt.
- **Notification dispatch.** F13/F14 own seeker + employer
  notifications keyed on F04's transition events.
- **Re-negotiation policy.** Parley §4.1.4 allows `attempt >= 2`; F04
  records the field but does not implement the policy that fires a
  new run.

### 1.3 Relationship to F02 and F03

F04 is the first feature that **adds new tables under F03's umbrella**.
That umbrella is the test:
- Every new table appears in `docs/data-governance/data-classification.yaml`.
- Every new data class (or reuse of existing) has a retention horizon
  in `docs/data-governance/retention-policy.md`.
- The CI gate `schema-conventions (F03 FR-6)` MUST pass on every PR
  in this branch.

F02 contribution:
- Every mutating action carries a `Principal` and writes to
  `audit_events_buffer` with payload-redaction (the F02 T069/MEDIUM-3
  pattern).
- `withPrincipal` wraps every server action / tRPC procedure
  (F02 NFR-11 / principal-coverage CI gate).

---

## 2. User stories

### User Story 1: A seeker submits an intent ticket
**As a** seeker
**I want** my submitted intent (role family, comp band, jurisdictions, work mode) recorded as a single durable ticket
**So that** the matching pipeline has a stable artifact to reference and I can withdraw or amend it later.

**Acceptance Criteria:**
- [ ] Submitting an intent creates one `seeker_tickets` row with state `submitted`.
- [ ] All required intent fields are persisted (role family, comp band, jurisdictions, work mode) and accept-list validated.
- [ ] The ticket carries a stable id and a human-readable identifier (`ST-YYYY-NNNNN`).
- [ ] The row is bound to the submitting seeker's `principal_id`.
- [ ] A `seeker_ticket.submitted` event is emitted to the audit sink.

**Priority:** High

### User Story 2: An employer-admin opens a requisition
**As an** employer-admin
**I want** to open a requisition that captures the role spec, comp band, jurisdictions, headcount, and required attributes
**So that** the matching pipeline can pair seekers against my spec without re-typing it.

**Acceptance Criteria:**
- [ ] Opening a requisition creates one `employer_req_tickets` row with state `submitted`.
- [ ] The row is bound to the calling employer-admin's `principal_id` AND to the parent `org_id` (Clerk Organization).
- [ ] Required fields are validated (role title, level, comp band, jurisdictions, headcount).
- [ ] Identifier shape is `ER-YYYY-NNNNN`.
- [ ] A `employer_req_ticket.submitted` event is emitted to the audit sink.

**Priority:** High

### User Story 3: A match ticket is created when a pair is identified
**As a** Spyglass platform service
**I want** to create a match ticket pairing one seeker ticket with one employer-req ticket
**So that** Parley's harness has a runnable record (with a stable `run_id`) and both source tickets advance their state to `matching`.

**Acceptance Criteria:**
- [ ] Creating a match ticket atomically: (a) inserts a row in `match_tickets` (state `created`), (b) transitions the source seeker to `matching`, (c) transitions the source employer-req to `matching`, OR fails as a unit.
- [ ] The match ticket's identifier is `MT-YYYY-NNNNN` per Parley SPEC §4.1.1.
- [ ] Re-entering matching with an already-paired source ticket fails with a documented typed error.
- [ ] A `match_ticket.created` event is emitted with both source ticket IDs in the payload.

**Priority:** High

### User Story 4: An operator advances or closes a ticket
**As an** operator (Clerk operator org member, AAL2)
**I want** to manually advance or close a stuck ticket
**So that** I can recover from incidents where automated transitions failed without bypassing the audit trail.

**Acceptance Criteria:**
- [ ] Operator transitions require the `tickets.transition.operator` scope.
- [ ] Each operator-initiated transition records the operator's `principal_id` AND a `reason_code` from a fixed list.
- [ ] Transitions still pass through the same validator as automated transitions — no operator backdoor.
- [ ] A `<kind>_ticket.operator_transition` event is emitted with `actor_principal_id`, `reason_code`, and the old/new state.

**Priority:** High

### User Story 5: A seeker withdraws their intent
**As a** seeker
**I want** to withdraw my submitted intent at any non-terminal state
**So that** Spyglass stops matching me and I can re-submit later if I change my mind.

**Acceptance Criteria:**
- [ ] A `withdrawn` terminal transition is permitted from any non-terminal seeker state.
- [ ] Withdrawing a seeker ticket currently in `matching` does NOT auto-close the linked match_ticket; the match_ticket transitions to `rejected` with reason `source_withdrawn`.
- [ ] Audit event names the action distinctly: `seeker_ticket.withdrawn`.
- [ ] Re-submitting requires a fresh ticket (new id, new identifier); withdrawn rows are not reused.

**Priority:** Medium

### User Story 6: Parley reads a match ticket and updates round/state
**As the** Parley harness (a service principal)
**I want** to read a match_ticket's full join graph (source tickets + contract refs + privacy ruleset ref) and advance its state through `negotiating → delivered`
**So that** I produce a dossier without writing principal-side data.

**Acceptance Criteria:**
- [ ] Parley service principal has the `tickets.match.advance` scope.
- [ ] `match_tickets.round` is monotonically non-decreasing within a run; bounded by `round_cap`.
- [ ] Parley cannot mutate `seeker_tickets` or `employer_req_tickets` directly (Constitution §II — agents *read* the canonical ticket).
- [ ] `delivered` requires a non-null `dossier_id` (FK to F10's table; F04 ships the column).

**Priority:** High

### User Story 7: An auditor inspects a ticket's full transition history
**As an** auditor or counsel reviewer
**I want** to retrieve every transition event for a given ticket with timestamp, actor, and old/new state
**So that** I can reconstruct the ticket's lifecycle without joining against application logs.

**Acceptance Criteria:**
- [ ] All transition events live in F02's `audit_events_buffer` (and eventually F05's hash-chained log) with a `ticket_id` field in the payload.
- [ ] A single query retrieves every event for a given ticket ordered by `created_at`.
- [ ] Payload redaction (per F02 T069/MEDIUM-3) is applied — no PII in event payloads beyond what the data-classification register permits.

**Priority:** Medium

---

## 3. Functional requirements

### FR-1 — Three ticket-kind tables
The repository SHALL define three new tables: `seeker_tickets`,
`employer_req_tickets`, `match_tickets`. Each SHALL conform to F03's
conventions (UUIDv7 primary key, `created_at`/`updated_at` timestamps,
text-PK only with documented carve-out, FK behavior explicit).

### FR-2 — Per-kind state machines
Each kind SHALL declare a closed enum of legal states and a closed graph
of legal transitions. **No implicit transitions** — every legal
transition is named in the spec and the implementation.

#### FR-2.1 Seeker states
`draft, submitted, screening, matching, matched, closed, withdrawn`
- `draft → submitted` (seeker authors completes form)
- `submitted → screening` (automated intake check)
- `screening → matching` (intake passes; ticket is eligible to match)
- `matching → matched` (a match_ticket was created against this ticket)
- `matching → withdrawn` (seeker chose to withdraw)
- `matching → closed` (operator close; e.g., timeout)
- `screening → closed` (intake check failed)
- `submitted → withdrawn` (seeker withdraws before screening)

#### FR-2.2 Employer-req states
`draft, submitted, open, matching, filled, closed, withdrawn`
- `draft → submitted` (admin authors completes requisition)
- `submitted → open` (automated intake check; requisition is eligible)
- `open → matching` (a match_ticket was created against this ticket)
- `matching → matching` (another match_ticket created — multi-headcount; partial fill)
- `matching → filled` (all headcount slots produced an `accepted` match)
- `matching → closed` (operator close; e.g., requisition canceled)
- `open → closed` (closed before any match)
- `submitted → withdrawn` (admin withdraws before screening)

#### FR-2.3 Match states
`created, negotiating, delivered, accepted, rejected, expired`
- `created → negotiating` (Parley harness picks up the ticket and starts a run; produces `run_id`)
- `negotiating → delivered` (Parley completes; dossier_id is set)
- `delivered → accepted` (downstream consumer applies its threshold policy and signals acceptance — F11/F12)
- `delivered → rejected` (downstream consumer signals rejection)
- `negotiating → expired` (round_cap exhausted, no dossier)
- `created → rejected` (pre-negotiation rejection; e.g., source ticket withdrawn)

### FR-3 — Typed transition validators
Every transition SHALL pass through a typed validator that asserts:
- the current state matches the caller's claim,
- the requested next state is in the legal graph for the current state,
- the caller's principal has the scope required for that transition,
- any state-specific invariants hold (e.g., `delivered` requires non-null `dossier_id`; `negotiating` requires non-null `run_id`).

Validator rejection SHALL produce a typed error class (per F02's
pattern in `packages/auth/`), not a generic exception, so the tRPC /
server-action layer can map to a structured HTTP/error code.

### FR-4 — Authenticated mutations
Every mutating action SHALL be wrapped in `withPrincipal` (per F02
NFR-11). Anonymous transitions are forbidden. Service-principal-only
transitions (Parley advancing `created → negotiating`) SHALL require
the `tickets.match.advance` scope; operator-only transitions SHALL
require `tickets.transition.operator`.

### FR-5 — Transition event emission
Every state transition SHALL emit one row to F02's `audit_events_buffer`
with:
- `event_name`: `<kind>_ticket.<transition_name>` (e.g., `seeker_ticket.withdrawn`, `match_ticket.created`)
- `principal_id`: the caller's principal_id
- `correlation_id`: a request-scoped id propagating into downstream events
- `payload`: `{ ticket_id, ticket_identifier, from_state, to_state, reason_code?, … }`

Payload SHALL be redacted per F02 T069/MEDIUM-3 (notes → notes_present
boolean; no raw PII).

### FR-6 — Jurisdiction tagging
Every `seeker_tickets` and `employer_req_tickets` row SHALL carry one or
more jurisdiction codes (ISO-3166-2 for US states; equivalent for
non-US). `match_tickets` SHALL record the **decision locus** (the
jurisdiction whose rules govern the negotiation) as a separate column,
derived from the source tickets at creation time. (Constitution §I.A.1.)

### FR-7 — Identifier shape
- `seeker_tickets.identifier` ::= `ST-YYYY-NNNNN`
- `employer_req_tickets.identifier` ::= `ER-YYYY-NNNNN`
- `match_tickets.identifier` ::= `MT-YYYY-NNNNN` (per Parley SPEC §4.1.1)
- `YYYY` is the 4-digit Gregorian year of issuance; `NNNNN` is a
  monotonic per-year sequence.
- Identifiers SHALL be unique within their table. (PK is still UUIDv7.)

### FR-8 — Idempotency on match creation
Creating a `match_tickets` row for the same (seeker_ticket_id,
employer_req_ticket_id) pair more than once SHALL fail with a typed
conflict error. Re-negotiation is modeled per Parley SPEC §4.1.4 via
`attempt`, not via duplicate match rows.

### FR-9 — Read primitives
The repository SHALL expose query primitives for:
- List tickets by `principal_id` (seeker self-service).
- List tickets by `org_id` (employer-admin).
- List tickets by state (operator dashboards).
- List tickets by jurisdiction (compliance / policy gates).
- Fetch a single ticket by id or identifier.
- Resolve a match ticket's full join graph (source tickets + contract refs + privacy ruleset ref).

Each query primitive SHALL be guardable by scope so downstream features
can constrain what each tier sees.

### FR-10 — Re-negotiation hook
`match_tickets.attempt` (integer, ≥1) SHALL be present. F04 does not
fire the re-negotiation; it records the field so F08 / a future feature
can decide policy.

### FR-11 — Round bookkeeping
`match_tickets.round` SHALL be a non-decreasing integer bounded by
`match_tickets.round_cap`. Only the Parley service principal (with
`tickets.match.advance`) may mutate `round`. The CHECK constraint
SHALL enforce `0 <= round <= round_cap`.

### FR-12 — Soft-delete via `disabled_at`
Per F03 §2 (no `deleted_at`), withdrawn / closed tickets are NOT
deleted. Terminal-state rows live indefinitely subject to F03's
retention policy.

### FR-13 — F03 conformance
F04 SHALL extend `docs/data-governance/data-classification.yaml` with
entries for all three new tables (every column classified), extend
`docs/data-governance/retention-policy.md` with horizons for any new
data classes introduced (or reuse existing classes where applicable),
and extend `docs/data-governance/integrity-invariants.md` with every
invariant the new tables carry. The CI gate `schema-conventions (F03
FR-6)` SHALL be green on the F04 branch before merge.

### FR-14 — Documented transition graph artifact
A single artifact (Mermaid state diagrams per kind, kept in this
spec's directory) SHALL render the three state machines. The artifact
is the authoritative reference for reviewers; the implementation's
typed validators SHALL match it.

---

## 4. Non-functional requirements

### NFR-1 — Transition correctness (test coverage)
Every named transition in FR-2 SHALL have at least one passing unit
test exercising it AND at least one test that asserts every illegal
transition from each state is rejected (negative-coverage testing).

### NFR-2 — Read-path performance
The fetch-single-ticket-by-id query SHALL return in <50ms at the 90th
percentile under nominal load (10k tickets per kind). The list-by-state
query SHALL return in <200ms for any single page (default page size 50,
≤500 max) at the 90th percentile.

### NFR-3 — Write-path performance
Match-ticket-creation (atomic across 3 tables) SHALL complete in <500ms
at the 90th percentile.

### NFR-4 — Audit emission no-loss
Audit emission to F02's sink SHALL be in-transaction with the state
change (same DB transaction OR a documented outbox pattern). A failed
audit emission SHALL fail the state change. (Constitution §I.5.3 —
accountability is non-negotiable.)

### NFR-5 — Type-system enforcement
The state-machine and transition graph SHALL be expressible in the
type system such that an illegal transition is a compile-time error in
TypeScript, not only a runtime error. (Tests still cover the runtime
path for principals + invariants.)

### NFR-6 — Jurisdiction enforcement
Operations on a ticket SHALL be authorized against the caller's
jurisdiction policy gate (F06 — out of scope for F04, but F04's
tables MUST carry the jurisdiction column from day one so F06 can
join on it).

### NFR-7 — Retention policy declared
Every new column F04 introduces SHALL be classified in F03's register,
and every new data class introduced SHALL have a retention horizon
declared in F03's policy artifact. (Constitution §I.4.2; F03 FR-1, FR-2.)

### NFR-8 — Schema-lint clean
The F03 schema-lint (`pnpm schema:lint`) SHALL exit clean on every PR
in the F04 branch. New skip-comments require a paired justification
in the PR description per F03 schema-conventions §9.

### NFR-9 — No leakage cross-side
A seeker MUST NOT read employer-req fields beyond the projected
fields the privacy filter (F09) authorizes; an employer-admin MUST NOT
read seeker fields beyond the projected fields. F04's read primitives
SHALL enforce this by *not exposing* the unfiltered cross-side fields
to a non-service principal. (Constitution §I.1 — non-bypassable
privacy filter; F09 owns the projection rules; F04 owns the
isolation.)

### NFR-10 — Documentation under .specify
Every state-machine diagram, every transition table, and every
example of an audit payload SHALL be checked into the F04 spec
directory or referenced from there. No transition semantics live in
PR descriptions or chat alone.

---

## 5. Edge cases

### EC-1 — Source ticket withdrawn during active negotiation
A seeker withdraws their `seeker_tickets` row while a `match_tickets`
row is in state `negotiating`. F04 SHALL: (a) transition the
`seeker_tickets` to `withdrawn`; (b) signal the active match to
transition to `rejected` with `reason_code: source_withdrawn`; (c)
emit both events; (d) NOT silently cancel Parley's in-flight run —
F08 owns the cancellation; F04 emits the signal Parley consumes.

### EC-2 — Employer-req partial fill across multiple matches
A requisition with headcount ≥ 2 produces multiple `match_tickets`
over time. The employer-req SHALL remain in `matching` until every
slot has produced an `accepted` match; only then transitions to
`filled`. Spec §FR-2.2's `matching → matching` self-loop is the
documented mechanism.

### EC-3 — Match-ticket idempotency under concurrent creation
Two services try to create a match for the same (seeker_id,
employer_req_id) pair simultaneously. The unique constraint SHALL
reject the second; the typed conflict error SHALL surface the
existing `match_ticket_id` so the caller can join the existing run.

### EC-4 — Operator transition without reason_code
An operator attempts a `*.operator_transition` without supplying a
`reason_code` from the closed list. The validator SHALL reject with a
typed error; no row is mutated; no audit event is emitted.

### EC-5 — Audit emission fails after row mutation
If the audit-event insert fails after the row update has succeeded in
the same transaction, the entire transaction SHALL roll back
(NFR-4). The caller sees a typed error and may retry. (Alternative:
documented outbox pattern with eventual consistency; if chosen, must
be named in the plan.)

### EC-6 — Round counter ceiling reached
A match in `negotiating` hits `round = round_cap`. F04's validator
SHALL forbid `round += 1` past `round_cap`. Parley (F08) is
responsible for transitioning the match to `expired` when the cap is
hit without a dossier. F04's job is to make the invariant un-violable.

### EC-7 — Re-negotiation creates a new run, not a new match
Parley §4.1.4 allows `attempt ≥ 2`. F04 SHALL bump `match_tickets.attempt`
on re-negotiation, allocate a fresh `run_id`, and transition the
match back to `negotiating` from `delivered` or `expired`. The seeker
+ employer-req tickets are NOT cloned; the match row is reused. Audit
event `match_ticket.renegotiated` SHALL fire with the new `run_id` +
new `attempt`.

### EC-8 — Jurisdiction-of-record changes
A seeker amends their ticket to add or remove a jurisdiction while
in `matching`. F04 SHALL: (a) allow the amendment only via a typed
mutation that records old + new in the audit event; (b) if the
amendment changes the *decision-locus* jurisdiction of a paired
match_ticket, transition the match to `rejected` with
`reason_code: jurisdiction_changed`. F06 (policy gates) downstream
decides whether to allow the new jurisdiction.

### EC-9 — Identifier collision under concurrent sequence allocation
Two services try to insert tickets whose identifiers would collide
(same year, same sequence). The unique constraint on `identifier`
SHALL reject the second; the validator SHALL retry with the next
sequence value. The sequence allocator's behavior is named in the
plan.

---

## 6. Success metrics

- **M-1.** All 22 named transitions across the three kinds (8 seeker
  + 8 employer-req + 6 match — see FR-2) are exercised by passing
  unit tests, and an equal number of negative tests asserts illegal
  transitions are rejected. (Mechanical check: enumerate transitions
  in code; cross-check test names.)
- **M-2.** A staged dev run creates 100 seeker + 100 employer-req
  tickets, pairs them into 50 match_tickets, advances 25 through
  `delivered`, and asserts every transition emitted a correctly-shaped
  audit event with payload redaction applied. Zero PII leakage in
  payloads.
- **M-3.** Schema-lint (`pnpm schema:lint`) clean on every PR in the
  F04 branch. (F03 NFR-2; F04 NFR-8.)
- **M-4.** `pnpm -r run test` green on PR head — 384 F02/F03 tests
  + F04's new test suite, all passing.
- **M-5.** Read-single-by-id and list-by-state benchmarks pass NFR-2
  thresholds on a seeded dev DB (10k rows / kind).
- **M-6.** F03 register, retention policy, and invariant catalog
  amended with F04's new tables, classes, and constraints. (M-2..M-4
  from F03 still satisfied after F04's amendments.)

---

## 7. Dependencies & assumptions

### Depends on
- **F01** for the monorepo, Drizzle-Kit pipeline, Neon, Inngest, CI.
- **F02** for the Principal model, audit-events-buffer sink, audit
  payload redaction pattern, `withPrincipal` HOF, principal-coverage
  CI gate.
- **F03** for schema conventions, register, retention policy,
  invariant catalog, and the schema-lint CI gate.

### Assumes
- Parley SPEC's match-ticket field set (§4.1.1) and run-state machine
  (§7) remain stable for F04's authoring window. (Parley SPEC is
  versioned; any breaking change re-opens F04 design.)
- F06 (policy gates) and F09 (privacy filter) will join on the
  jurisdiction column + the principal-side ticket projection F04
  defines. F04 ships the columns; F06/F09 ship the gates.
- F10 (dossier) will provide a `dossiers` table whose `dossier_id` PK
  F04's `match_tickets.dossier_id` FK references. Until F10 lands,
  F04's column is nullable; `delivered` transitions are blocked
  pending the F10 row.
- F05 (audit log) will read the same payload shape F04 writes to
  `audit_events_buffer`; the cutover is a no-op rename of the sink
  target.

### Blocks
- F05 — needs F04's transition event payload shape.
- F06 — needs `tickets.jurisdiction` column.
- F08 — needs match_tickets to exist + `tickets.match.advance` scope.
- F09 — needs seeker/employer field separation to apply privacy filter.
- F10 — needs `match_tickets.dossier_id` FK target.
- F11/F12 — needs `delivered → accepted/rejected` transition path.
- F13/F14 — needs audit-event names to subscribe to.

---

## 8. Clarifications

All three clarifications were resolved on 2026-05-12 via `/speckit-clarify`.
The recommended option was accepted in each case. The resolutions are
binding on the rest of the spec, the plan, and downstream implementation.

### CL-1 — RESOLVED — State-machine implementation pattern

**Decision:** **Typed validator pattern.**

- TypeScript discriminated unions encode the allowed transitions per
  kind. A single `assertTransition(from, to, principal, invariants)`
  function is the runtime gate; the type system makes illegal
  transitions a compile-time error (NFR-5).
- No new runtime dependency. Matches F02's typed-error +
  HOF-guard pattern (RoleRequiredError, ScopeRequiredError,
  withPrincipal).
- The Mermaid state diagrams (FR-14) are the authoritative
  reviewable artifact; the typed transition graph in code is
  expected to match them line-for-line.

**Implication for FR-3:** Validator rejection produces typed errors
(`IllegalTransitionError`, `MissingScopeError`, `InvariantViolationError`,
`MissingReasonCodeError`) named in the plan; tRPC / server-action
layer maps them to structured responses.

### CL-2 — RESOLVED — Dossier FK target before F10

**Decision:** **Nullable column, no FK constraint until F10.**

- F04 ships `match_tickets.dossier_id uuid` as **nullable**, **without
  a FK constraint**.
- The `delivered` transition is gated by an application-level
  invariant: `assertTransition` requires `dossier_id IS NOT NULL`
  before allowing `negotiating → delivered`.
- F10's migration adds the FK constraint (`REFERENCES dossiers(dossier_id)`)
  at the time the `dossiers` table is created. F10's migration is
  additive and runs after F04's.
- Schema-lint rule R5 (FK on-update/on-delete behavior) is warn-only
  in v1, so the missing-FK state does not break the CI gate.

**Implication for FR-3, FR-12:** Transition invariant on `delivered`
SHALL include `dossier_id IS NOT NULL`. EC-7 (re-negotiation) clears
`dossier_id` and `run_id` before transitioning back to `negotiating`.

### CL-3 — RESOLVED — Identifier sequence allocator

**Decision:** **PostgreSQL sequence per kind per year.**

- Three sequences exist at any time, one per kind for the current
  year: `seeker_tickets_<YYYY>_seq`, `employer_req_tickets_<YYYY>_seq`,
  `match_tickets_<YYYY>_seq`.
- Identifier composition (server-side, via Drizzle / raw SQL):
  `<prefix>-<YYYY>-` + zero-padded 5-digit `nextval(...)`.
- Annual rollover: an Inngest cron job at `00:00:00 UTC` on January 1
  creates the next year's three sequences. The job is idempotent
  (`CREATE SEQUENCE IF NOT EXISTS`) so a re-run is safe.
- Sequence allocation is atomic via PostgreSQL's `nextval()`; no
  application-side locking required.

**Implication for FR-7:** Plan §X (allocator) describes the cron job,
the migration that bootstraps the *initial* year's sequences, and
the audit event emitted on each rollover (`identifier_sequences.rolled_over`).
EC-9 (collision) becomes practically unreachable; the unique constraint
on `identifier` remains as defense-in-depth.

---

## 9. Constitutional alignment

| Article | Requirement | F04 contribution |
|---|---|---|
| §I.2 Integrity | State transitions versioned and auditable | FR-2 + FR-5 + Mermaid artifact (FR-14) |
| §I.4.1 Data minimization | Only fields needed for matching | Scope §1.2 limits ticket columns to matching-relevant fields |
| §I.4.2 Retention | Per-class horizons declared | FR-13 + NFR-7 (extends F03's policy) |
| §I.5.1 Authentication | Every mutation authenticated | FR-4 (`withPrincipal` on every action) |
| §I.5.2 Authorization | Least-privilege scopes | FR-4 (`tickets.match.advance`, `tickets.transition.operator`) |
| §I.5.3 Accountability | Every action attributable | FR-5 + EC-4 (operator transitions require reason_code) |
| §I.6 DiD | Multiple layers reject illegal transitions | FR-3 (typed validator) + FR-11 (CHECK on `round`) + NFR-5 (type-system) + NFR-8 (schema-lint) |
| §I.A.1 Jurisdiction | Captured at ticket creation | FR-6 + EC-8 |
| §II Agent-Native | Agents read the canonical ticket, never invent it | Scope §1.2 (out: harness wiring) + FR-9 (read primitives) + USR-6 |

**No constitutional exceptions requested.**

---

## 10. Open questions deferred to /speckit-clarify

None remain at v1.1. CL-1, CL-2, CL-3 are all resolved (see §8). The
next phase is `/speckit-plan`.
