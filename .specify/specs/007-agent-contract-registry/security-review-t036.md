# F07a T036 Security Review

**Date:** 2026-05-20
**Branch:** `007-agent-contract-registry`
**Scope:** Immutable contract policy artifacts, scoped publish/deprecate
authorization, canonical audit evidence, fail-closed dispatch
resolution, dependency validation, bounded review reads, and schema
governance controls.
**Result:** PASS. No CRITICAL/HIGH security findings remain.

---

## Findings

No CRITICAL/HIGH security findings remain after the publish-time
dependency validation remediation captured in `analyze-report.md` and
`code-review-t035.md`.

---

## Security Gate Review

| Gate | Result | Evidence |
| --- | --- | --- |
| Immutable policy artifacts | PASS | `(contract_id, version)` uniqueness plus mutation rejection tests |
| Scoped publication | PASS | `contract.publish` required; unscoped publish denied |
| Scoped deprecation | PASS | `contract.deprecate` required; unscoped deprecation denied |
| Scoped review reads | PASS | `contract.read` required for contract version/event history |
| Canonical audit evidence | PASS | publish/deprecate operations append F05 canonical audit events |
| Fail-closed dispatch | PASS | missing, deprecated, and dependency-unresolvable refs deny dispatch |
| Dependency validation | PASS | publish-time and dispatch-time checker paths covered |
| Runtime ceiling safety | PASS | over-ceiling runtime settings clamp at resolution without mutating stored material |
| Schema conventions | PASS | `pnpm schema:lint` reports 0 violations |

---

## Verification

- `pnpm --filter @spyglass/agent-contracts test`
- `pnpm --filter @spyglass/agent-contracts type-check`
- `pnpm --filter @spyglass/agent-contracts lint`
- `pnpm schema:lint`
- `pnpm --filter @spyglass/agent-contracts dev-run:f07a`

Latest agent-contracts result: 6 suites / 27 tests passed.

---

## Residual Risk

No CRITICAL/HIGH security findings remain. F07a currently relies on
caller-supplied dependency checkers until F07b, prompt registry, and
F08.5 tool-surface registry land. Request surfaces must supply those
checkers before production dispatch uses the registry.
