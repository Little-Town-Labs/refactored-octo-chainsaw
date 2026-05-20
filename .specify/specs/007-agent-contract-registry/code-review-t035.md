# F07a T035 Code Review

**Date:** 2026-05-20
**Branch:** `007-agent-contract-registry`
**Scope:** F07a diff against the previous F06 branch, focused on agent
contract schema, immutable publication, deprecation, dispatch
resolution, dependency validation, scoped review reads, quickstart
runner, and governance artifacts.
**Result:** PASS after remediation. No CRITICAL/HIGH findings remain.

---

## Findings

### HIGH-1 — Publish path did not validate dependency refs

**Status:** Fixed in this pass.
**Files:** `packages/agent-contracts/src/publish.ts`,
`packages/agent-contracts/src/__tests__/publication-audit.test.ts`

FR-007 and the research artifact require dependency validation at write
time and dispatch time. The initial resolver covered dispatch-time
validation, but a reviewed contract could be published while a checker
already knew its rubric, prompt, tool surface, or model ref was
unavailable.

**Fix:** Added optional publish-time `dependencyChecker` support. A
dependency failure raises `ContractDependencyValidationError` and leaves
no contract row persisted. The publication audit test covers
`rubric_missing_bias_test`.

---

## Reviewed Areas

| Area | Result | Notes |
| --- | --- | --- |
| DB schema and migration | PASS | `agent_contract_versions` and `agent_contract_events` constraints/indexes present; `schema:lint` clean |
| Immutable publication | PASS | Existing id/version with different material rejects with `ContractVersionMutationError` |
| Publication audit | PASS | `agent_contract.published` canonical audit event linked to event row |
| Deprecation audit | PASS | `agent_contract.deprecated` canonical audit event linked to event row; post-cutoff resolution denies |
| Dependency validation | PASS | Publish-time checker and dispatch-time checker fail closed with stable reason codes |
| Runtime clamps | PASS | Effective settings returned without mutating stored contract material |
| Review reads | PASS | `contract.read` enforced; version/event reads bounded and filterable |
| Quickstart runner | PASS | Memory-backed run covers all six documented scenarios and writes evidence |
| Governance docs | PASS | Classification, retention, invariants, and runbook updated |

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

No CRITICAL/HIGH code-review findings remain. Future prompt, rubric,
and tool-surface registries must provide concrete dependency checkers to
the publish and dispatch paths; F07a intentionally keeps those stores
out of scope.
