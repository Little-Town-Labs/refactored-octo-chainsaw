# Jurisdiction Policy Gates Runbook

**Feature:** F06 Jurisdiction Policy Gates
**Owner:** Gary
**Last reviewed:** 2026-05-20

## Purpose

Jurisdiction policy gates prevent ticket, match, and run-dispatch
workflows from proceeding when jurisdiction posture is missing,
unknown, unsupported, disabled, retired, or review-required. The
default is fail-safe deny.

## Scope

This runbook covers:

- Reading active jurisdiction posture.
- Reviewing bounded gate-decision history.
- Disabling or re-enabling a jurisdiction without deployment.
- Producing structured non-PII failure artifacts for denied decisions.

## Required Scopes

| Action | Scope |
| --- | --- |
| Read active posture | `policy.read` |
| Read decision history | `policy.read` |
| Persist gate decision | `policy.decide` |
| Disable/re-enable jurisdiction posture | `policy.kill_switch.manage` |

## Kill-Switch Procedure

1. Confirm the incident, counsel directive, launch posture change, or
   compliance reason is one of the closed-list reason codes:
   `new_regulation`, `counsel_directive`, `incident_response`,
   `bias_audit_gap`, `launch_posture`, or `manual_reenable`.
2. Confirm the operator principal has `policy.kill_switch.manage`.
3. Read the current active posture for the jurisdiction.
4. Execute the posture change with a correlation id, policy version,
   and optional reviewer principal.
5. Verify the previous policy row is closed with `effective_until`.
6. Verify a new active policy row exists.
7. Verify `jurisdiction_kill_switch_events.audit_event_id` points to a
   canonical `jurisdiction_policy.kill_switch` audit event.
8. Evaluate a new gate decision for that jurisdiction and confirm the
   new posture is reflected immediately.

## Failure Artifact Procedure

For every denied gate decision, generate a failure artifact through
`projectFailureArtifact`. The artifact must include only:

- failure artifact id
- gate decision id
- subject kind and subject id
- deny reason
- jurisdiction codes
- policy version
- correlation id
- canonical audit event id
- created timestamp

Do not include principal ids, policy revision ids, transcript content,
resume text, job description text, or raw payload data in downstream
failure artifacts.

## Review Procedure

1. Use `readActivePosture` for active posture review.
2. Use `readDecisionHistory` with bounded filters. Always set date
   filters and a limit for operator or counsel review.
3. Treat missing `policy.read` as a hard denial.
4. Export evidence through F05 evidence-export flows when external
   review packages are needed.

## Verification

Run:

```sh
pnpm --filter @spyglass/policy-gates test
pnpm --filter @spyglass/policy-gates type-check
pnpm --filter @spyglass/policy-gates lint
pnpm schema:lint
pnpm --filter @spyglass/policy-gates dev-run:f06
```

The staged dev run is memory-backed and writes:

```text
.specify/specs/006-jurisdiction-policy-gates/quickstart-run-2026-05-19.md
```

## Rollback Limits

Policy posture is revisioned. Do not delete policy rows or kill-switch
event rows. To reverse a posture, create a new policy revision through
the scoped kill-switch mutation path with `manual_reenable` or the
appropriate closed-list reason.
