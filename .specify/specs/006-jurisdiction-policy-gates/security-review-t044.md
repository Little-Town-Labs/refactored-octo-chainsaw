# F06 T044 Security Review

**Date:** 2026-05-20
**Branch:** `006-jurisdiction-policy-gates`
**Scope:** Jurisdiction fail-safe behavior, kill-switch authorization,
audit evidence, non-PII failure artifacts, scoped review reads, and
schema/governance controls.
**Result:** PASS. No CRITICAL/HIGH security findings remain.

---

## Findings

No CRITICAL/HIGH security findings remain after the correlation-history
remediation captured in `analyze-report.md` and
`code-review-t044.md`.

---

## Security Gate Review

| Gate | Result | Evidence |
| --- | --- | --- |
| Fail-safe deny | PASS | Evaluator tests cover missing, unknown, unsupported, disabled, review-required, retired/multi-jurisdiction deny paths |
| Kill-switch authorization | PASS | `policy.kill_switch.manage` required; unscoped mutation test verifies no posture change |
| Scoped review access | PASS | `policy.read` required for posture and decision-history reads; unscoped tests deny |
| Canonical audit evidence | PASS | Gate decisions and kill-switch changes link to F05 canonical audit events |
| Closed-list reason codes | PASS | DB CHECKs, JSON Schema contracts, and tests cover decision and kill-switch reason enums |
| Non-PII failure artifacts | PASS | Failure artifact tests assert no principal id, policy revision ids, raw payload, or personal data fields |
| Historical evidence | PASS | Gate decisions and kill-switch events are append-only evidence rows; active posture changes create new revisions |
| Schema conventions | PASS | `pnpm schema:lint` reports 0 violations |

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

No CRITICAL/HIGH security findings remain. Denied kill-switch attempts
are denied before mutation in the package layer; authenticated request
surfaces that want explicit denial audit events should add that surface
audit when F13/F14 operator UI wiring lands.
