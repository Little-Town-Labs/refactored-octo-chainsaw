# Agent Contract Registry Runbook

**Feature:** F07a Agent Contract Registry
**Owner:** Gary
**Last reviewed:** 2026-05-20

## Purpose

The Agent Contract Registry stores immutable `(contract_id, version)`
definitions for Parley side agents. A contract version pins the prompt
template ref, rubric ref, tool-surface ref, model ref, runtime settings,
description, author/reviewer provenance, and canonical audit evidence.

## Scope

This runbook covers:

- Publishing reviewed contract versions.
- Deprecating contract versions for new dispatch.
- Resolving contracts for dispatch.
- Reviewing bounded contract version and event history.

F07a does not store prompt bodies, rubric bodies, bias-test artifacts,
tool dispatcher catalogs, or Parley run execution state.

## Required Scopes

| Action | Scope |
| --- | --- |
| Read contract versions and events | `contract.read` |
| Publish reviewed contract version | `contract.publish` |
| Deprecate contract version | `contract.deprecate` |

## Publish Procedure

1. Confirm the new contract version pins only versioned refs:
   prompt template, rubric, tool surface, model, and runtime settings.
2. Confirm the author/operator principal has `contract.publish`.
3. Confirm reviewer metadata is present and counsel/compliance approval
   is recorded where required.
4. Publish with a correlation id and closed-list reason code.
5. Verify the `(contract_id, version)` row is `published`.
6. Verify `agent_contract_events.audit_event_id` points to canonical
   `agent_contract.published` evidence.
7. Resolve the contract for dispatch and confirm `contract_resolved`.

## Deprecation Procedure

1. Confirm deprecation affects only new dispatch; in-flight runs keep
   their dispatch-time frozen contract.
2. Confirm the operator principal has `contract.deprecate`.
3. Deprecate with a cutoff timestamp, reason code, correlation id, and
   optional reviewer principal.
4. Verify the contract status is `deprecated` and `deprecated_after` is
   set.
5. Verify canonical `agent_contract.deprecated` audit evidence.
6. Resolve after the cutoff and confirm new dispatch returns
   `contract_deprecated`.

## Review Procedure

1. Use `readContractVersions` for bounded contract-version review.
2. Use `readContractEvents` for publication/deprecation event history.
3. Always include date filters and a limit for operator or counsel
   review.
4. Treat missing `contract.read` as a hard denial.
5. Use F05 evidence exports for external review packages; do not use ad
   hoc database dumps.

## Dispatch Validation

Dispatch must fail closed for:

- `missing_contract`
- `contract_deprecated`
- `prompt_template_unresolvable`
- `rubric_unresolvable`
- `rubric_missing_bias_test`
- `tool_version_unavailable`
- `model_unavailable`

Runtime values above harness ceilings are clamped for dispatch and
reported as `runtime_clamps`; the stored contract material remains
unchanged.

## Verification

Run:

```sh
pnpm --filter @spyglass/agent-contracts test
pnpm --filter @spyglass/agent-contracts type-check
pnpm --filter @spyglass/agent-contracts lint
pnpm schema:lint
pnpm --filter @spyglass/agent-contracts dev-run:f07a
```

The staged dev run is memory-backed and writes:

```text
.specify/specs/007-agent-contract-registry/quickstart-run-2026-05-20.md
```

## Rollback Limits

Contract versions are immutable. Do not delete or update contract
version/event rows to roll back a release. Publish a new version or
deprecate the affected version for new dispatch.
