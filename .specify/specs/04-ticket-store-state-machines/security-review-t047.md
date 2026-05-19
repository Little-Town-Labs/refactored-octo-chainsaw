# F04 T047 Security Review

**Date:** 2026-05-19
**Branch:** `04-ticket-store-state-machines`
**Scope:** FR-4 principal coverage, NFR-4 audit no-loss, NFR-9
cross-side leakage, FR-11 round manipulation guards, and F04's new
operator/match scopes.
**Result:** PASS after remediation. No CRITICAL/HIGH security findings
remain.

---

## Findings

### HIGH-1 — Match creation could bypass source-ticket lifecycle gates

**Status:** Fixed in this pass.

Before remediation, `createMatch` trusted source ticket IDs and did not
force the source seeker/employer rows through the typed transition
validator. A scoped service principal could therefore create a match
against a source state that should not be eligible for matching. This
was an integrity and authorization-boundary issue because the transition
validator is the shared policy gate.

**Fix:** Source tickets now transition to `matching` through
`assertTransition` in the same DB transaction as match creation. Illegal
source states fail closed and roll back match creation plus audit
emission.

Evidence:
- `packages/tickets/src/repo/match.ts:31`
- `packages/tickets/src/repo/match.ts:144`
- `packages/tickets/src/__tests__/repo/match.test.ts:76`

### HIGH-2 — Negotiation entry could produce a null `run_id`

**Status:** Fixed in this pass.

F02/F08 depend on `run_id` as the stable handle for credentials and
Parley runs. `advanceMatch(created → negotiating)` could previously
leave `run_id` null if the caller omitted it. That weakened downstream
authorization/accountability because later agent credentials are keyed
to the run.

**Fix:** The match repo now allocates `run_id` when a match enters
`negotiating` and no run id is already present. The audit event carries
the allocated value.

Evidence:
- `packages/tickets/src/repo/match.ts:195`
- `packages/tickets/src/__tests__/repo/match.test.ts:138`

---

## Security Gate Review

| Gate | Result | Evidence |
|---|---|---|
| FR-4 principal coverage | PASS | `apps/web/src/server/tickets.ts` uses `withPrincipal`; server actions use `getPrincipal`; T048 will run the scanner |
| Scope enforcement | PASS | Service match procedures require `tickets.match.advance`; operator transition action requires `tickets.transition.operator` |
| NFR-4 audit no-loss | PASS | repo mutations and audit inserts occur inside `TicketStore.transaction`; rollback tests cover audit failure |
| NFR-9 cross-side leakage | PASS | read repo gates full join graph behind `tickets.read.all`; side principals receive reduced match projections |
| FR-11 round manipulation | PASS | DB CHECK enforces `0 <= round <= round_cap`; repo rejects `advanceRound` beyond cap |
| Operator reason code | PASS | operator transitions require a closed-list `reason_code`; missing/wrong-scope tests present |
| Correlation propagation | PASS | transition and amendment audit events use the caller principal's `correlation_id` |

---

## Verification

- `pnpm --filter @spyglass/tickets test -- --runTestsByPath src/__tests__/repo/match.test.ts`
- `pnpm --filter @spyglass/tickets type-check`
- `pnpm --filter @spyglass/tickets lint`
- `pnpm --filter @spyglass/tickets test`

Latest full tickets result: 12 suites / 231 tests passed.

---

## Residual Risk

No CRITICAL/HIGH security findings remain. T048 should still run the
full mechanical gates before PR so the repo-wide principal scanner and
schema linter validate the final branch state.
