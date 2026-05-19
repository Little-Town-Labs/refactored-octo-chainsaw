# Tasks — F04 Ticket Store + State Machines

**Spec:** v1.1 · **Plan:** v1.0 · **Tasks:** v1.0 (2026-05-12)
**Owner:** Gary

Tasks decompose plan §5 (B1–B9) into ordered, dependency-aware work
items. TDD enforced on B3 (transition validator) and B5 (repo + audit
emission): implementation tasks blocked by their corresponding test
tasks (Article IV.A).

Status legend: 🟡 Ready · 🔴 Blocked · 🟢 In Progress · ✅ Complete · ⏸ Deferred

---

## Phase B1 — Skeleton + governance amendments (4h)

### T001 — Create `@spyglass/tickets` package skeleton
**Status:** ✅ Complete · **Effort:** 1h · **Blocked by:** none
**Story:** all · **FR/NFR:** plan §3 R-4
**Description.** Create `packages/tickets/` with `package.json`,
`tsconfig.json`, `jest.config.js`, `eslint.config.js`, mirroring
`packages/auth/` conventions (workspace package, ESM, type: "module").
Add `@spyglass/tickets` to root pnpm workspace. Create `src/index.ts`
with one placeholder export.

**Acceptance:**
- [x] Package builds (`pnpm --filter @spyglass/tickets build`).
- [x] Type-check clean.
- [x] No new deps beyond `drizzle-orm` + `@spyglass/auth` + `@spyglass/db`.

### T002 — Amend F03 register with F04 new classes + tables
**Status:** ✅ Complete · **Effort:** 1.5h
**Story:** US-1..US-7 · **FR/NFR:** FR-12, FR-13, NFR-7, NFR-8, M-3, M-6
**Description.** Edit `docs/data-governance/data-classification.yaml`:
add `ticket_intent` and `ticket_match` data classes; add table
entries for `seeker_tickets`, `employer_req_tickets`, `match_tickets`
following plan §4.1 column lists (~50 cols total). Validate against
JSON-Schema contract.

**Acceptance:**
- [x] `pnpm schema:lint` exits clean.
- [x] Column counts match plan §4.1.
- [x] Lawful basis recorded per personal-data column.

### T003 — Amend F03 retention policy + invariant catalog
**Status:** ✅ Complete · **Effort:** 1h
**Parallel with:** T004 (after T002 lands)
**Story:** auditor / counsel · **FR/NFR:** FR-13, NFR-7
**Description.** Edit `docs/data-governance/retention-policy.md`:
add `### 1.7 ticket_intent` and `### 1.8 ticket_match` sections with
horizons + lawful basis. Edit
`docs/data-governance/integrity-invariants.md`: add 3 new table
sections enumerating all CHECK/UNIQUE/PARTIAL/FK invariants per
plan §4.1 and data-model §3.

**Acceptance:**
- [x] All 6 register classes covered in policy (cross-check via M-3 mechanical script).
- [x] All planned invariants enumerated (~30+ rows across 3 tables).

### T004 — Scaffold new CI gate placeholders (red)
**Status:** ✅ Complete · **Effort:** 0.5h
**Parallel with:** T003
**Story:** US-5 · **FR/NFR:** plan §4.7
**Description.** Create `scripts/check-tickets-state-machine.sh`
returning non-zero (placeholder body; turns green in T011). Add a
new job `tickets-state-machine-coverage` to `.github/workflows/ci.yml`
running it. Add root `pnpm tickets:coverage` script.

**Acceptance:**
- [x] Script + CI job present; job currently fails (RED until T011).

---

## Phase B2 — Schema + migrations (8h)

### T005 — Author `seeker_tickets` schema module
**Status:** ✅ Complete · **Effort:** 1.5h
**Parallel with:** T006, T007
**Story:** US-1 · **FR/NFR:** FR-1, FR-2.1, FR-6, FR-7
**Description.** New `packages/db/src/schema/seeker-tickets.ts`
matching plan §4.1 columns + CHECK constraints (state enum,
work_mode enum, currency CHECK, comp_band ordering, jurisdictions
non-empty array, identifier regex). Add partial index on `state`
for hot states, sort index on `created_at DESC`.

**Acceptance:**
- [x] File compiles in `@spyglass/db`.
- [x] `pnpm schema:lint` clean on the new file.
- [x] Register entry matches column-for-column.

### T006 — Author `employer_req_tickets` schema module
**Status:** ✅ Complete · **Effort:** 1.5h
**Parallel with:** T005, T007
**Story:** US-2 · **FR/NFR:** FR-1, FR-2.2, FR-6, FR-7
**Description.** Same pattern for `employer_req_tickets`. Additional
CHECK on `headcount_filled <= headcount_total`. FK to `organizations`.

**Acceptance:** as T005.

### T007 — Author `match_tickets` schema module
**Status:** ✅ Complete · **Effort:** 2h
**Story:** US-3, US-6, US-7 · **FR/NFR:** FR-1, FR-2.3, FR-8, FR-11
**Description.** Match-ticket schema per plan §4.1. UNIQUE
`(seeker_ticket_id, employer_req_ticket_id, attempt)` for
idempotency (FR-8). CHECK `round <= round_cap`. `dossier_id`
nullable column **without FK** per CL-2. Partial index on `state`
hot path.

**Acceptance:**
- [x] All CHECK invariants present (8+).
- [x] Idempotency UNIQUE present.
- [x] No FK on `dossier_id` (warn-only R5 acceptable per CL-2).

### T008 — Generate migration `0005_f04_ticket_store.sql` + identifier sequences
**Status:** ✅ Complete · **Effort:** 2h
**Story:** US-1..US-7 · **FR/NFR:** FR-1, FR-7
**Description.** Run `pnpm db:generate` to materialize the migration.
Hand-edit to append `CREATE SEQUENCE` statements for 2026 (current
year) per kind. Add per-file regression test under
`packages/db/__tests__/` that asserts the migration applies cleanly
against a fresh schema.

**Acceptance:**
- [x] Migration applies cleanly.
- [x] Three 2026 sequences exist post-apply.
- [x] `pnpm schema:lint` still clean.

### T009 — Register entry for `identifier_sequences` audit table (if needed)
**Status:** ✅ Complete · **Effort:** 0.5h
**Description.** F04 doesn't add a `identifier_sequences` table —
PostgreSQL native sequences don't need one. Confirm and document in
data-model §6 that the audit event `identifier_sequences.bootstrapped`
emits a payload with `sequence_name` + `year` rather than a row.

**Acceptance:**
- [x] data-model.md §6 updated; no new register entry required.

---

## Phase B3 — States + transitions (TDD) (12h)

**TDD enforced:** T011 (impl) blocked by T010 (tests).

### T010 — Write transition-validator tests (RED)
**Status:** ✅ Complete · **Effort:** 4h
**Story:** US-1..US-6 · **FR/NFR:** FR-2, FR-3, NFR-1, M-1
**Delegate suggestion:** tdd-guide
**Description.** Author `packages/tickets/src/__tests__/transitions.test.ts`
with:
- One positive test per named transition (8 seeker + 9 employer-req
  + 9 match = 26 positive tests).
- One negative test per (state, illegal-state) pair (cartesian product
  minus legal pairs ≈ 100+ negative tests; can be table-driven).
- Scope-rejection tests: operator transitions without
  `tickets.transition.operator` → MissingScopeError.
- Invariant tests: `delivered` without `dossier_id` →
  InvariantViolationError.

**Acceptance:**
- [x] Test file compiles but every test FAILS (RED — validator doesn't exist).

### T011 — Implement `states.ts`, `transitions.ts`, `errors.ts`
**Status:** ✅ Complete · **Effort:** 4h
**Story:** US-1..US-6 · **FR/NFR:** FR-2, FR-3, NFR-5
**Description.** Implement plan §3 R-1 typed validator pattern:
- `states.ts`: 3 state-enum union types.
- `transitions.ts`: 3 transition-map discriminated unions + a single
  `assertTransition` function. Compile-time enforcement on illegal
  pairs.
- `errors.ts`: `IllegalTransitionError`, `MissingScopeError`,
  `InvariantViolationError`, `MissingReasonCodeError`,
  `IdempotencyConflictError`.

**Acceptance:**
- [x] All T010 tests pass (GREEN).
- [x] TypeScript compiler rejects an illegal `from`/`to` pair at
      compile time (smoke test in CI).

### T012 — Update state-machine coverage gate (was placeholder)
**Status:** ✅ Complete · **Effort:** 1.5h
**Story:** US-5 · **FR/NFR:** plan §4.7 Gate A, M-1
**Description.** Replace placeholder `scripts/check-tickets-state-machine.sh`
with a real implementation that:
1. Parses the transition maps from `packages/tickets/src/transitions.ts`.
2. Parses test names from `packages/tickets/src/__tests__/transitions.test.ts`.
3. Asserts every named transition has ≥1 positive test.
4. Asserts every illegal pair has ≥1 negative test.

**Acceptance:**
- [x] Script exits 0 against post-T011 state.
- [x] Deliberate test deletion makes it fail (smoke test).
- [x] CI job `tickets-state-machine-coverage` green.

### T013 — Mermaid state-diagram cross-reference test
**Status:** ✅ Complete · **Effort:** 1h
**Story:** US-7 · **FR/NFR:** FR-14
**Description.** Author a small Jest test that parses
`data-model.md` Mermaid blocks and cross-checks edges against
`transitions.ts` map (same count, same labels). Catches drift between
the human-reviewable artifact and the implementation.

**Acceptance:**
- [x] Test passes.
- [x] Deliberate Mermaid edit makes it fail (smoke test).

### T014 — Audit-event payload-schema test harness
**Status:** ✅ Complete · **Effort:** 1.5h
**Story:** US-7 · **FR/NFR:** FR-5, NFR-4
**Description.** Author a Jest helper
`packages/tickets/src/__tests__/audit-shape.helper.ts` that validates
any emitted payload against
`.specify/specs/04-ticket-store-state-machines/contracts/transition-event.schema.yaml`
using `ajv`. Used by B5 tests; ships RED here (no emitter yet).

**Acceptance:**
- [x] Helper compiles + exports `assertValidTransitionEvent(event)`.
- [x] `ajv` added as a devDependency.

---

## Phase B4 — Identifier allocator (6h)

### T015 — `nextIdentifier(kind)` tests (RED)
**Status:** ✅ Complete · **Effort:** 1h
**Delegate suggestion:** tdd-guide
**Description.** Tests for `packages/tickets/src/identifiers.ts`:
- Returns properly-shaped `ST-/ER-/MT-YYYY-NNNNN`.
- Year matches current UTC year.
- Sequence increments monotonically across calls.
- Throws if next year's sequence doesn't exist.

**Acceptance:**
- [x] Tests compile, FAIL.

### T016 — Implement `nextIdentifier(kind)`
**Status:** ✅ Complete · **Effort:** 1.5h
**Description.** Implement via raw SQL `SELECT nextval('<kind>_<year>_seq')`,
0-pad to 5 digits, return `<prefix>-<year>-<padded>`. Surface a
typed error `SequenceNotFoundError` when the year's sequence is
missing.

**Acceptance:**
- [x] T015 tests pass.

### T017 — Annual-rollover Inngest function + tests
**Status:** ✅ Complete · **Effort:** 2.5h
**Story:** EC-9 · **FR/NFR:** plan §3 R-3
**Description.** Inngest cron at `0 0 1 12 *` UTC creates next
year's three sequences (`CREATE SEQUENCE IF NOT EXISTS`). Emits
`identifier_sequences.bootstrapped` audit events. Tests use a stub
clock + a transactional rollback to verify idempotency.

**Acceptance:**
- [x] Re-running the cron is a no-op (idempotent).
- [x] Emits 3 audit events on first successful run.

### T018 — Documentation: identifier allocator runbook
**Status:** ✅ Complete · **Effort:** 1h
**Parallel with:** T017 tests
**Description.** Author `docs/runbooks/identifier-sequences.md`
covering: bootstrapping a fresh DB (initial year), recovering from
a missed rollover (manual `CREATE SEQUENCE`), auditing the cron's
last run.

**Acceptance:**
- [x] Runbook present; links from `data-model.md` §6.

---

## Phase B5 — Repository + audit emission (16h)

**TDD enforced** on each repo: tests RED before impl GREEN.

### T019 — Seeker repo tests (RED)
**Status:** ✅ Complete · **Effort:** 1.5h
**Parallel with:** T021, T023
**Delegate suggestion:** tdd-guide
**Description.** `packages/tickets/src/__tests__/repo/seeker.test.ts`:
- `insertDraft(principal, fields)` → row exists, state=`draft`.
- `transition(seeker_id, to, principal, reason?)` → uses
  `assertTransition`; rolls back on illegal.
- Audit event emitted; payload validates via `assertValidTransitionEvent`.

**Acceptance:** tests compile, FAIL.

### T020 — Implement seeker repo
**Status:** ✅ Complete · **Effort:** 2h
**Description.** `packages/tickets/src/repo/seeker.ts` Drizzle-backed.
In-transaction audit emission to F02's `audit_events_buffer`. Use
F02 `redactPayload` helper for the audit row.

**Acceptance:**
- [x] T019 tests pass.

### T021 — Employer-req repo tests (RED)
**Status:** ✅ Complete · **Effort:** 1.5h
**Parallel with:** T019, T023
**Delegate suggestion:** tdd-guide
**Description.** As T019 for employer-req. Adds `headcount` semantics
(decrement-on-accept; partial fill).

**Acceptance:** tests FAIL.

### T022 — Implement employer-req repo
**Status:** ✅ Complete · **Effort:** 2h
**FR/NFR:** EC-2 (partial fill: `matching → matching` self-loop with headcount decrement on accepted matches)
**Description.** As T020 for employer-req. Adds partial-fill semantics:
when an `accepted` match transitions, decrement
`headcount_filled` (or increment-toward-total); when filled equals
total, transition employer-req to `filled`.

**Acceptance:**
- [x] T021 tests pass.
- [x] Partial-fill scenario test (EC-2): 2 matches accepted against
      a headcount=3 requisition leaves it in `matching`; the 3rd
      accept transitions to `filled`.

### T023 — Match repo tests (RED)
**Status:** ✅ Complete · **Effort:** 2h
**Parallel with:** T019, T021
**Story:** US-3, US-6 · **FR/NFR:** FR-8, FR-10, FR-11, EC-6, EC-7
**Delegate suggestion:** tdd-guide
**Description.** `packages/tickets/src/__tests__/repo/match.test.ts`:
- `createMatch(seeker_id, employer_id)` atomic with source-ticket
  transitions (US-3 / Scenario 3).
- Idempotency conflict on duplicate (FR-8, EC-3).
- `advanceMatch(match_id, to, principal)` requires
  `tickets.match.advance` scope.
- `renegotiate(match_id)` atomic (EC-7): attempt++, run_id cleared,
  dossier_id cleared, state → negotiating.
- `delivered` requires non-null dossier_id (CL-2 invariant).

**Acceptance:** tests FAIL.

### T024 — Implement match repo
**Status:** ✅ Complete · **Effort:** 3h
**FR/NFR:** FR-8, FR-10, FR-11, EC-6, EC-7
**Description.** Atomic multi-table transactions. Idempotency error
maps from PG unique-violation to `IdempotencyConflictError`.
Round-bookkeeping (FR-11): `advanceRound` mutation enforces
`round < round_cap` via assertTransition invariant; EC-6 verified
by negative test. Re-negotiation `renegotiate(match_id)` (EC-7) is
atomic: `attempt++`, `run_id := NULL`, `dossier_id := NULL`,
`round := 0`, `state := 'negotiating'` in one statement.

**Acceptance:**
- [x] T023 tests pass.
- [x] FR-11 round ceiling enforced (negative test: incrementing past
      round_cap rejected).
- [x] EC-7 re-negotiation atomic (multi-column update verified by
      transaction-isolation test).

### T025 — Cross-cut: audit emission helper + payload-shape tests
**Status:** ✅ Complete · **Effort:** 1.5h
**Description.** Centralize emit logic in
`packages/tickets/src/audit.ts` (already used by T020/T022/T024).
Add a Jest "shape test" that exercises every transition and asserts
the emitted payload validates against the JSON-Schema (FR-5, NFR-4
defense-in-depth).

**Acceptance:**
- [x] All named transitions emit shape-valid payloads.

### T026 — Audit emission no-loss test (NFR-4)
**Status:** ✅ Complete · **Effort:** 1.5h
**FR/NFR:** NFR-4, EC-5
**Delegate suggestion:** tdd-guide
**Description.** Test that simulates an audit-insert failure inside
the transaction (e.g., via a Drizzle mock) and asserts the row
mutation is rolled back. Verifies NFR-4.

**Acceptance:**
- [x] Failed emit → no row change visible post-failure.

---

## Phase B6 — Read primitives + cross-side isolation (10h)

### T027 — Read-primitive tests (RED)
**Status:** ✅ Complete · **Effort:** 2.5h
**Delegate suggestion:** tdd-guide
**Description.** `packages/tickets/src/__tests__/repo/read.test.ts`
covers FR-9 surface:
- `listByPrincipal` filters to caller's tickets only.
- `listByOrg` requires org membership.
- `listByState` requires either tier-side filter OR operator scope.
- `fetchById` cross-side: seeker calling on employer-req → reduced
  projection (NFR-9 scenarios mirror US-10 of quickstart).
- `fetchMatchJoinGraph` returns refs + decision_locus_jurisdiction.

Matrix: (caller-tier × target-table × hit/miss) — ~30+ tests.

**Acceptance:** tests FAIL.

### T028 — Implement `repo/read.ts`
**Status:** ✅ Complete · **Effort:** 3h
**Description.** Drizzle queries with tier-side filters branched on
`principal.kind` and `principal.tier`. Service principal carve-out
gated by scope check. Cursor-based pagination (limit + cursor) per
NFR-2.

**Acceptance:**
- [x] T027 tests pass.
- [x] Cross-side leakage tests (NFR-9) green.

### T029 — F09 hand-off seam: projection adapter
**Status:** ✅ Complete · **Effort:** 1.5h
**Description.** Define an interface
`TicketProjection<K extends TicketKind>` that F09's privacy filter
will implement. F04 ships a default "show all owned fields, hide all
cross-side fields" implementation. F09 will replace this seam with a
filter-rule-driven projection.

**Acceptance:**
- [x] Interface exported; default impl tested.

### T030 — Performance benchmarks against seeded dev DB
**Status:** ✅ Complete · **Effort:** 2h
**Story:** NFR-2, NFR-3, M-5
**Description.** Seed 10k rows / kind via a script. Run benchmark
suite: fetch-by-id, list-by-state, match-create. Capture p50/p90/p99
latencies. Fail if p90 exceeds NFR-2/NFR-3 thresholds.

**Acceptance:**
- [x] Benchmark suite exists.
- [x] p90 within thresholds (50ms / 200ms / 500ms).

### T031 — Read-primitives documentation
**Status:** ✅ Complete · **Effort:** 1h
**Parallel with:** T030
**FR/NFR:** NFR-10
**Description.** Author `packages/tickets/README.md` covering the
public API surface (transition + repos + read primitives), the
state-machine diagrams (linked from data-model.md), and the
audit-event contract.

**Acceptance:**
- [x] README present; covers every exported symbol.

---

## Phase B7 — Server actions / tRPC wiring (16h)

### T032 — Server action: submit seeker intent (US-1)
**Status:** ✅ Complete · **Effort:** 1.5h
**Story:** US-1 · **FR/NFR:** FR-4
**Description.** `apps/web/src/tickets/actions/submit-seeker.ts`
with `"use server"`. Wrap in `withPrincipal` (F02). Validate input
via Zod schema mirroring FR-1 invariants. Call seeker repo to
insert; return id + identifier.

**Acceptance:**
- [x] principal-coverage gate green for the new file.
- [x] Action test exercises happy + bad-input paths.

### T033 — Server action: submit employer requisition (US-2)
**Status:** ✅ Complete · **Effort:** 1.5h
**Parallel with:** T032, T034, T035, T036
**Story:** US-2
**Description.** As T032 for employer-req. Requires
`tier IN ('employer_admin')` (enforced via `requireRole`).

**Acceptance:** as T032.

### T034 — Server action: operator transition (US-4)
**Status:** ✅ Complete · **Effort:** 1.5h
**Parallel with:** T032, T033, T035, T036
**Story:** US-4 · **FR/NFR:** FR-3, EC-4
**Description.** `operator-transition.ts` requires
`tickets.transition.operator` scope + `reason_code` from closed list.
Routes to seeker / employer-req / match repo based on kind.

**Acceptance:**
- [x] Missing reason_code → `MissingReasonCodeError`.
- [x] Wrong scope → `MissingScopeError`.

### T035 — Server action: withdraw seeker intent (US-5, EC-1)
**Status:** 🔴 Blocked by T020, T024 · **Effort:** 2h
**Parallel with:** T032, T033, T034, T036
**Story:** US-5 · **FR/NFR:** EC-1
**Description.** `withdraw-seeker.ts`. When the seeker has a linked
match in `negotiating`, also transitions the match to `rejected`
with `reason_code='source_withdrawn'`. Atomic across both rows.

**Acceptance:**
- [ ] Atomic withdrawal verified by integration test.
- [ ] Two audit events emitted with same `correlation_id`.

### T035b — Server action: amend seeker / employer-req intent (EC-8)
**Status:** 🔴 Blocked by T020, T022, T024 · **Effort:** 2h
**Parallel with:** T032, T033, T034, T035, T036
**Story:** US-5 sibling · **FR/NFR:** FR-6, EC-8
**Description.** Two server actions:
- `amendSeekerIntent(seeker_id, patch)` — accepts patches to
  jurisdictions, comp_band, work_mode, flags. Authenticated via
  `withPrincipal`; rejects when caller is not the ticket owner.
- `amendEmployerRequisition(employer_req_id, patch)` — same shape,
  authorized to employer-admin tier + matching `org_id`.

**Cascading match-rejection semantics (EC-8):** if the amendment
changes the *decision-locus jurisdiction* of a paired `match_tickets`
row that is currently `negotiating`, the match transitions to
`rejected` with `reason_code='jurisdiction_changed'` in the same
transaction. Multi-event correlation_id propagation per T039.

**Audit events emitted:**
- `seeker_ticket.amended` / `employer_req_ticket.amended` with
  payload `{ patched_fields: [...], prior_values_present: bool }`
  (no raw prior values — F02 T069/MEDIUM-3 pattern).
- `match_ticket.rejected` (if cascade fires) with the same
  correlation_id and `reason_code='jurisdiction_changed'`.

**Acceptance:**
- [ ] Amendment without jurisdiction change: 1 audit event.
- [ ] Amendment with decision-locus change: 2 audit events
      (`*_ticket.amended` + `match_ticket.rejected`), same
      correlation_id, atomic.
- [ ] Audit payload schema-validates (no raw prior values).
- [ ] Cross-tier authorization: seeker calling
      `amendEmployerRequisition` rejected.

### T036 — tRPC procedures: createMatch + advanceMatch + renegotiate (US-3, US-6)
**Status:** 🔴 Blocked by T024 · **Effort:** 3h
**Story:** US-3, US-6 · **FR/NFR:** FR-4, FR-8, FR-11
**Description.** tRPC procedures in `apps/web/src/server/tickets.ts`
guarded by `tickets.match.advance` scope. Service-principal-only
surface (matcher + Parley harness).

**Acceptance:**
- [ ] Service-principal scope check enforced.
- [ ] Idempotency conflict mapped to 409.
- [ ] `delivered` requires `dossier_id` (invariant test).

### T037 — Register new scopes in `@spyglass/auth/scopes`
**Status:** ✅ Complete · **Effort:** 0.5h
**Parallel with:** B7
**Description.** Add `tickets.match.advance` and
`tickets.transition.operator` to the scope registry (F02 pattern).
Add helper `OPERATOR_TICKET_TRANSITIONER` constant matching F02's
operator-role helpers.

**Acceptance:**
- [x] Scopes registered.
- [x] Smoke test: requireScope rejects without scope.

### T038 — Wire principal-coverage gate (F02 NFR-11) for new files
**Status:** 🔴 Blocked by T032..T035b, T036 · **Effort:** 0.5h
**Description.** No code change expected — verify
`scripts/check-principal-coverage.sh` recognizes the new server
actions and tRPC procedures (it scans by App Router conventions +
"use server"). If any new file is missed, add the
`withPrincipal`/`getPrincipal` import.

**Acceptance:**
- [ ] Gate green on the F04 branch.

### T039 — Correlation-id propagation through actions
**Status:** 🔴 Blocked by T032..T035b, T036 · **Effort:** 1.5h
**Description.** Ensure every action accepts a parent `correlation_id`
or generates one and propagates into audit emissions. Test covers
the propagation across multi-event transitions (e.g., EC-1 emits
2 events under one correlation_id).

**Acceptance:**
- [ ] Multi-event scenarios share correlation_id.

### T040 — Integration smoke: full lifecycle in one test
**Status:** 🔴 Blocked by T032..T039 · **Effort:** 2h
**Description.** End-to-end Jest covering: seeker submits → screening →
matching → match created → Parley advances → delivered → accepted.
Verifies all expected audit events fire with valid payloads.

**Acceptance:**
- [ ] Test passes.
- [ ] Audit event count and shapes verified.

---

## Phase B8 — Quickstart + staged dev-run (12h)

### T041 — Quickstart Scenarios 1–11 walk through (dev environment)
**Status:** 🔴 Blocked by T040 · **Effort:** 4h
**Story:** all · **FR/NFR:** M-2
**Description.** Execute every quickstart.md scenario against a dev
deploy. Capture results.

**Acceptance:**
- [ ] All 11 scenarios pass.
- [ ] Result log captured in `.specify/specs/04-ticket-store-state-machines/quickstart-run-<date>.md`.

### T042 — M-2 staged dev-run: 100/100/50/25
**Status:** 🔴 Blocked by T040 · **Effort:** 3h
**Parallel with:** T041
**Story:** all · **FR/NFR:** M-2
**Description.** Script that creates 100 seeker + 100 employer-req
tickets, pairs them into 50 match_tickets, advances 25 through
`delivered`. Asserts: zero PII in audit payloads; all expected
events fired; latencies within NFR-2/NFR-3.

**Acceptance:**
- [ ] Script runs to completion.
- [ ] Audit-payload sample audited for PII leakage (0 findings).
- [ ] Latency report appended to quickstart-run log.

### T043 — Performance benchmark capture (NFR-2, NFR-3, M-5)
**Status:** 🔴 Blocked by T030, T042 · **Effort:** 2h
**Description.** Compile T030 + T042 latency captures into a single
`docs/performance/f04-baseline.md` documenting:
- fetch-by-id p50/p90/p99
- list-by-state p50/p90/p99
- match-create p50/p90/p99
- Audit-emission p50/p90/p99

Used by future performance work as the F04 baseline.

**Acceptance:**
- [ ] Document checked in.
- [ ] All p90 values within plan §8 targets.

### T044 — Operator runbook for ticket lifecycle
**Status:** 🔴 Blocked by T040 · **Effort:** 2h
**Parallel with:** T041, T042
**FR/NFR:** NFR-10
**Description.** Author `docs/runbooks/ticket-lifecycle.md` (analog
of F02's credential-lifecycle runbook): operator procedures for
stuck tickets, manual transitions, cancellation, re-negotiation
triggers.

**Acceptance:**
- [ ] Runbook covers each kind.
- [ ] Links from `docs/runbooks/` index.

### T045 — Update `docs/security/credential-lifecycle.md` for F04 cross-refs
**Status:** 🔴 Blocked by T044 · **Effort:** 1h
**Description.** F04 introduces service-principal usage of
`tickets.match.advance` (Parley) and `tickets.transition.operator`.
Update F02's credential-lifecycle doc with these scope names in the
revocation impact list.

**Acceptance:**
- [ ] Cross-reference table updated.

---

## Phase B9 — Analyze + review + PR + merge (6h)

### T046 — Run `/speckit-analyze`
**Status:** 🔴 Blocked by T001..T045 · **Effort:** 0.5h
**Description.** Cross-artifact consistency gate; address any
findings; rerun if needed. Output to `analyze-report.md`.

**Acceptance:**
- [ ] No CRITICAL/HIGH; all MEDIUM resolved or deferred with rationale.

### T047 — Run `/code-review` + `/security-review`
**Status:** 🔴 Blocked by T046 · **Effort:** 1.5h
**Delegate suggestion:** security-reviewer (F04 has real auth surface)
**Description.** Run code-review across the F04 diff. Then run
security-review specifically focused on FR-4 (principal coverage),
NFR-4 (audit no-loss), NFR-9 (cross-side leakage), FR-11 (round
manipulation guards). Address CRITICAL/HIGH; document MEDIUM
resolutions or defer with explicit justification.

**Acceptance:**
- [ ] Both review reports saved alongside `analyze-report.md`.
- [ ] No CRITICAL/HIGH outstanding.

### T048 — Final back-check against schema-lint + principal-coverage gates
**Status:** 🔴 Blocked by T047 · **Effort:** 0.5h
**FR/NFR:** M-6
**Description.** Run all CI gates locally. Confirm green.

**Acceptance:**
- [ ] `pnpm schema:lint` clean.
- [ ] `pnpm tickets:coverage` clean.
- [ ] `pnpm -r run test` clean (existing F02/F03 tests + F04's new suite).
- [ ] principal-coverage clean.

### T049 — Open PR + reviewer pass
**Status:** 🔴 Blocked by T048 · **Effort:** 0.5h
**FR/NFR:** M-4
**Description.** `git push -u`; open PR titled "feat(f04):
ticket store + state machines"; body summarizes the new tables,
state machines, governance amendments, deferred operator gates
(G-1 quickstart walkthrough, G-2 staged dev-run, G-3 review
sign-off). Tag Austin for reviewer pass.

**Acceptance:**
- [ ] PR open against `main`.
- [ ] CI green (all required checks, including the two new gates).
- [ ] Reviewer approval recorded.

### T050 — Squash-merge + roadmap update
**Status:** 🔴 Blocked by T049 · **Effort:** 1h
**Description.** Squash-merge per precedent. Bump roadmap v1.4.0
ticking F04 in Stage 2. Delete branch (local + remote).

**Acceptance:**
- [ ] `main` HEAD shows merged commit.
- [ ] Roadmap reflects F04 closed.
- [ ] Branch deleted.

### T051 — Post-merge: notify F05/F06/F08 owners that F04 hand-off seams are live
**Status:** 🔴 Blocked by T050 · **Effort:** 1h
**Description.** Touch the following spec drafts (where they exist
or will exist):
- F05: audit-event payload shape is now stable at .v1; cutover plan
  can target the rename.
- F06: `decision_locus_jurisdiction` column + `jurisdictions` arrays
  available for joins.
- F08: `tickets.match.advance` scope + the match-ticket join-graph
  read primitive are stable.
- F09: `TicketProjection` interface exported; F09 implements.

**Acceptance:**
- [ ] Per-feature hand-off notes recorded in
      `.specify/notes/f04-handoffs.md` for future owners.

---

## Dependency graph (critical path)

```
T001 ─┬─ T002 ─ T003 (B1 done)
      ├─ T004 (CI placeholder, red until T012)
      ├─ T005,T006 (parallel) ─ T007 ─ T008 ─ T009  (B2 done)
      ├─ T010 (tests RED) ─ T011 (impl GREEN) ─ T012 ─ T013 ─ T014  (B3 done)
      │                                      │
      │                            T015 ─ T016 ─ T017 ─ T018  (B4 done)
      │                                              │
      │                            T019,T021,T023 (parallel RED)
      │                                              │
      │                            T020,T022,T024 (impl, GREEN)
      │                                              │
      │                                              T025 ─ T026  (B5 done)
      │                                              │
      │                            T027 ─ T028 ─ T029 / T030,T031 (parallel)  (B6 done)
      │                                              │
      │                            T032..T036 (parallel) ─ T037 ─ T038 ─ T039 ─ T040  (B7 done)
      │                                              │
      │                            T041,T042 (parallel) ─ T043 / T044,T045 (parallel)  (B8 done)
      │                                              │
      │                            T046 ─ T047 ─ T048 ─ T049 ─ T050 ─ T051  (B9 done)
```

**Critical path (longest chain):**
T001 → T002 → T007 → T008 → T010 → T011 → T023 → T024 → T027 → T028 → T032 → T040 → T046 → T047 → T049 → T050

Approximate duration with full parallelism: **~50h** (~2.5 weeks).
Total work: ~88h (~4 weeks at 1 dev) — matches plan §5 estimate.

---

## Parallelization opportunities

| Phase | Parallel tasks |
|---|---|
| B1 | T003 & T004 (after T002) |
| B2 | T005 / T006 / T007 (with T007 needing T005+T006 first) |
| B3 | T013 & T014 (after T011) |
| B5 | T019 / T021 / T023 (parallel RED); T020 / T022 / T024 (parallel GREEN) |
| B6 | T030 & T031 (after T028) |
| B7 | T032 / T033 / T034 / T035 / T036 (parallel) |
| B8 | T041 & T042 (parallel); T044 & T045 (parallel) |

---

## Quality gates

- ✅ **TDD on B3** (T010 → T011), **B4** (T015 → T016), **B5** (T019/T021/T023 → T020/T022/T024), **B6** (T027 → T028).
- ✅ **State-machine coverage gate** wired in T004, turns green in T012, runs on every PR.
- ✅ **Audit payload-shape gate** wired in T014/T025 as Jest tests; runs in the normal `test` CI job.
- ✅ **Schema-lint** must pass on every PR (F03's existing gate).
- ✅ **principal-coverage** must pass on every PR (F02's existing gate); B7 explicitly verifies (T038).
- ✅ **Back-check** (T048) before PR.
- ✅ **Analyze + code-review + security-review** (T046, T047) before merge.

---

## Out-of-band (operator-run) gates for F04 closure

- **G-1.** Walk all 11 quickstart scenarios against deployed preview.
- **G-2.** M-2 staged dev-run scenario captured in `quickstart-run-<date>.md`.
- **G-3.** Reviewer (Austin) pass on `data-model.md` + `transition-event.schema.yaml`.

---

## Delegate suggestions

| Task | Delegate | Reason |
|---|---|---|
| T010, T015, T019, T021, T023, T026, T027 | tdd-guide | Test authorship for RED-phase |
| T011, T020, T022, T024, T028 | drizzle-orm-expert (advisory) | Drizzle pattern recognition |
| T036 | api-architect (advisory, optional) | tRPC procedure shapes |
| T046 | (built-in `/speckit-analyze`) | Cross-artifact consistency |
| T047 | code-reviewer + security-reviewer | Real auth surface; cross-side isolation gate |

System suggested `tdd-guide` (yes — fits B3/B5 tests), `django-backend-expert` (no — no Django), and `security-reviewer` (yes — T047 is the natural delegate; F04 has real auth surface).

---

## Summary

- **Total tasks:** 52 (T001–T051 + T035b — EC-8 amendment surface added 2026-05-12 by /speckit-analyze)
- **Phases:** 9 (B1–B9)
- **Total effort:** ~90h (88h plan §5 baseline + 2h for T035b)
- **Critical-path duration with parallelism:** ~50h (~2.5 weeks)
- **TDD enforced:** B3, B4, B5, B6 (every impl task blocked by tests)
- **Two new CI gates:** state-machine coverage + audit payload-shape
- **Three new scopes:** `tickets.match.advance`, `tickets.transition.operator`, plus the operator-role helper
- **Quality gates:** schema-lint, principal-coverage, state-machine coverage, audit-shape, analyze, code-review, security-review, back-check, M-2 dev-run
