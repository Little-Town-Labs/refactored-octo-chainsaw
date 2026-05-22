# Threat Model: Re-negotiation Loop

## Assets

- Match-ticket attempt state and lifecycle flags.
- Prior run and dossier identifiers.
- Fresh `run_id` allocation boundary.
- Prompt, tool-call, and scratch-state isolation counters.
- Per-match cap and cost-ceiling records.
- Re-negotiation audit events.
- Non-cleared-side silence posture.

## Trust Boundaries

- Incoming `match_ticket.renegotiation_requested` event boundary.
- Match-ticket repository and prior outcome boundary.
- Parley dispatch and run repository boundary.
- Privacy-filter and tool-dispatch boundary.
- Cost telemetry and alarm boundary.
- Audit-log evidence boundary.

## STRIDE Review

| Threat | Risk | Mitigation |
|--------|------|------------|
| Spoofing | Unauthorized actor requests pushback as a cleared side. | Require authenticated principal, side authorization, scoped request, and audit attribution. |
| Tampering | Request changes prior run or dossier evidence. | Treat prior artifacts as immutable references only; never mutate prior records. |
| Repudiation | Actor denies initiating re-negotiation. | Record signed or attributable audit evidence for every request and decision. |
| Information disclosure | Counterparty learns about refused or pending pushback. | Preserve non-cleared-side silence by default and route all disclosure through privacy/tool boundaries. |
| Denial of service | Duplicate events or repeated requests create many runs. | Enforce idempotency, active-run checks, effective round cap, and cost ceiling. |
| Elevation of privilege | Advocate or operator bypasses eligibility gates. | Centralize decision policy in Parley orchestration and fail closed on missing data. |

## Abuse Cases

- Transparent retry of a failed run under a new label.
- Cost drain by repeatedly replaying re-negotiation events.
- Race between both sides requesting pushback.
- Counterparty pressure leak through automatic notifications.
- Legal hold or tombstone bypass by referencing stale prior run data.
- Hidden prompt-history inheritance from prior run state.

## Required Controls

- Fresh `run_id` for every accepted re-negotiation.
- Zero inherited prompt history, tool-call log, side scratch state, and prior context at run start.
- Immutable prior references only.
- Strictest effective round cap across both contracts and platform default.
- Preflight and runtime cost ceiling enforcement.
- Idempotent duplicate-event handling.
- Audit evidence for every accepted, refused, replayed, alarmed, and terminated path.

## Residual Risks

- F15 creates alarm records but does not implement live paging or alert delivery; later operations features must decide routing.
- Product research may later revise the default cap, but F15 enforces the current default of 3 unless stricter contract caps apply.
- Durable storage migrations are deferred; task generation must ensure in-memory tests preserve the future durable contract shape.
