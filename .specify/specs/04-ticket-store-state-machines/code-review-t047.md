# F04 T047 Code Review

**Date:** 2026-05-19
**Branch:** `04-ticket-store-state-machines`
**Scope:** F04 diff against `main`, focused on ticket lifecycle
repositories, server actions/tRPC wiring, state-machine gates, DB
schema, and test coverage.
**Result:** PASS after remediation. No CRITICAL/HIGH findings remain.

---

## Findings

### HIGH-1 — `createMatch` did not advance or validate source-ticket state

**Status:** Fixed in this pass.
**Files:** `packages/tickets/src/repo/match.ts`,
`packages/tickets/src/__tests__/repo/match.test.ts`

`createMatch` originally inserted `match_tickets` without first ensuring
the seeker and employer requisition could enter `matching`. That meant a
service caller with `tickets.match.advance` could create a match against
an ineligible source state if it supplied IDs for draft, submitted,
withdrawn, or closed source tickets. This contradicted US-3 and FR-3:
match creation must atomically transition the source tickets to
`matching`, or fail as a unit.

**Fix:** `createMatch` now transitions eligible `screening`/`open`
source rows to `matching` inside the same transaction and emits the
source transition audit events before inserting the match row. Illegal
source transitions throw and roll the transaction back. Tests cover both
the successful atomic transition and the rollback path.

Evidence:
- `packages/tickets/src/repo/match.ts:31`
- `packages/tickets/src/repo/match.ts:144`
- `packages/tickets/src/__tests__/repo/match.test.ts:58`
- `packages/tickets/src/__tests__/repo/match.test.ts:76`

### HIGH-2 — `created → negotiating` could leave `run_id` null

**Status:** Fixed in this pass.
**Files:** `packages/tickets/src/repo/match.ts`,
`packages/tickets/src/__tests__/repo/match.test.ts`

`advanceMatch` preserved the current `run_id` when the caller omitted
one. For a newly created match, that value is null, so
`created → negotiating` could produce a negotiation row without the
stable `run_id` consumed by F02 credentials and F08 Parley wiring.

**Fix:** `advanceMatch` now allocates a run id when entering
`negotiating` and no explicit/current run id exists. The emitted audit
payload includes the allocated run id. A focused test covers this path.

Evidence:
- `packages/tickets/src/repo/match.ts:195`
- `packages/tickets/src/__tests__/repo/match.test.ts:138`

---

## Reviewed Areas

| Area | Result | Notes |
|---|---|---|
| State-machine catalogs | PASS | `tickets:coverage` confirms 8 seeker, 8 employer, 9 match edges covered |
| Match lifecycle repo | PASS | HIGH-1 and HIGH-2 fixed; idempotency, dossier invariant, round cap tests pass |
| Source-ticket workflows | PASS | owner/org authorization, withdrawal cascade, amendment cascade, and rollback tests present |
| Server actions | PASS | action wrappers obtain `getPrincipal`; core functions require expected role/scope before repo calls |
| tRPC/server procedures | PASS | `withPrincipal` + service-principal + `tickets.match.advance` checks present |
| DB schema | PASS | F04 tables have CHECKs, FKs where target tables exist, idempotency unique index, and hot-path indexes |
| Governance docs | PASS | data-classification, retention, invariant, performance, and runbook artifacts present |

---

## Verification

- `pnpm --filter @spyglass/tickets test -- --runTestsByPath src/__tests__/repo/match.test.ts`
- `pnpm --filter @spyglass/tickets type-check`
- `pnpm --filter @spyglass/tickets lint`
- `pnpm --filter @spyglass/tickets test`

Latest full tickets result: 12 suites / 231 tests passed.

---

## Residual Risk

No code-review CRITICAL/HIGH findings remain. T048 still needs the full
branch closure gates (`schema:lint`, `tickets:coverage`, `pnpm -r run
test`, and principal coverage) before PR.
