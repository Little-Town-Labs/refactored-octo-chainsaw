# F06 T044 Code Review

**Date:** 2026-05-20
**Branch:** `006-jurisdiction-policy-gates`
**Scope:** F06 diff against `main`, focused on jurisdiction policy
schema, evaluator semantics, kill-switch mutation, failure artifacts,
scoped review reads, quickstart runner, and governance artifacts.
**Result:** PASS after remediation. No CRITICAL/HIGH findings remain.

---

## Findings

### HIGH-1 — Decision history could not group by correlation id

**Status:** Fixed in this pass.
**Files:** `packages/policy-gates/src/repo.ts`,
`packages/policy-gates/src/review.ts`,
`packages/policy-gates/src/__tests__/review.test.ts`

FR-013 requires downstream evidence export and incident review to group
related gate decisions by `correlation_id`. The initial review API
returned correlation ids but could not filter by them, so callers would
have needed to over-fetch and group outside the repository boundary.

**Fix:** Added `correlationId` to `ReadDecisionHistoryInput` and
`GateDecisionHistoryQuery`, wired the Drizzle `correlation_id` filter,
and extended review tests to exclude same-subject/same-jurisdiction
rows with a different correlation id.

---

## Reviewed Areas

| Area | Result | Notes |
| --- | --- | --- |
| DB schema and migration | PASS | F06 tables, constraints, indexes, and journal entry present; `schema:lint` clean |
| Gate evaluator | PASS | Allows active allowed posture; denies missing, unknown, unsupported, disabled, review-required, retired |
| Gate decision audit | PASS | Canonical audit event linked by source table/event id before decision persistence |
| Kill-switch path | PASS | Scoped mutation, closed-list reasons, policy revision replacement, and immutable event row |
| Failure artifacts | PASS | Stable non-PII projection; rejects allow decisions |
| Review reads | PASS | `policy.read` enforced; posture and history reads bounded and filterable |
| Quickstart runner | PASS | Memory-backed run covers all six documented scenarios and writes evidence |
| Governance docs | PASS | Classification, retention, invariants, runbook, roadmap, and handoffs updated |

---

## Verification

- `pnpm --filter @spyglass/policy-gates test`
- `pnpm --filter @spyglass/policy-gates type-check`
- `pnpm --filter @spyglass/policy-gates lint`
- `pnpm --filter @spyglass/auth type-check`
- `pnpm schema:lint`
- `pnpm --filter @spyglass/policy-gates dev-run:f06`

Latest policy-gates result: 6 suites / 31 tests passed.

---

## Residual Risk

No CRITICAL/HIGH code-review findings remain. Production app wiring
should preserve the same single-request ordering between canonical audit
append and policy-gate row persistence when F08/F13 surfaces call these
helpers.
