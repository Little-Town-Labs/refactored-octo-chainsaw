# Quickstart: Re-negotiation Loop

## Preconditions

- Branch is `015-renegotiation-loop`.
- `.specify/feature.json` points at `.specify/specs/015-renegotiation-loop`.
- `AGENTS.md` points at `.specify/specs/015-renegotiation-loop/plan.md`.
- Workspace dependencies are installed.

## Verification Scenarios

### 1. Accepted fresh run

Create a match ticket with a prior asymmetric outcome where the requester side cleared the threshold. Submit `match_ticket.renegotiation_requested`.

Expected evidence:

- Decision is `allow`.
- New `run_id` differs from all prior runs for the same match ticket.
- Attempt increments for the same match ticket.
- Prompt history, tool-call entries, seeker scratch entries, and employer scratch entries are all `0` at run start.
- Prior run and dossier ids are immutable references only.
- Audit includes request, cap/cost decision, and fresh-run allocation.

### 2. Duplicate request replay

Replay the same request id for the same match ticket and attempt.

Expected evidence:

- Decision is `idempotent_replay` or equivalent replay result.
- No second run is allocated.
- Audit ties the replay to the original decision.

### 3. Round cap reached

Create a match ticket whose prior attempts equal the effective cap.

Expected evidence:

- Decision is `deny`.
- Reason is `round_cap_exhausted`.
- No run is allocated.
- Audit includes cap calculation.

### 4. Unauthorized or non-cleared requester

Submit a request from a principal without match-ticket authority, or from the side that did not clear the prior threshold.

Expected evidence:

- Decision is `deny`.
- Reason is `unauthorized_requester` or `requester_not_cleared_side`.
- No run is allocated.
- Non-cleared side is not notified by default.

### 5. Cost preflight breach

Set estimated re-negotiation cost above the per-match ceiling before dispatch.

Expected evidence:

- Decision is `deny`.
- Reason is `cost_ceiling_exceeded`.
- No run is allocated.
- Alarm record is emitted.

### 6. Runtime cost breach

Start an allowed run and simulate observed cost crossing the ceiling during active dispatch.

Expected evidence:

- Active run terminates safely.
- No additional advocate turns are dispatched after breach.
- Match ticket records bounded termination outcome.
- Alarm and audit records are emitted.

## Commands

```bash
pnpm --filter @spyglass/parley test
pnpm --filter @spyglass/parley type-check
pnpm --filter @spyglass/parley lint
pnpm --filter @spyglass/parley dev-run:f15
```

## Completion Evidence

| Evidence | Required Result |
|----------|-----------------|
| Fresh run scenario | Distinct `run_id`, same match ticket, incremented attempt |
| Isolation scenario | All inherited context counters are `0` |
| Duplicate replay scenario | No second run allocation |
| Cap scenario | Denied with `round_cap_exhausted` |
| Cost scenario | Denied or terminated with alarm |
| Unauthorized scenario | Denied without non-cleared-side notification |
