# F13 Code Review Notes

Date: 2026-05-21

## Findings

No blocking code-review findings.

## Notes

- `@spyglass/agents` now exposes seeker-only turn, scoring, eval, and
  boundary surfaces.
- Tests cover contracts, direct-provider import detection, accepted turn,
  frozen-ref failure, privacy boundary failure, prior-run context refusal,
  scoring validation, holistic-score ignore behavior, and eval baseline.
- F14 remains out of scope.

## Residual Risk

The first F13 slice uses deterministic fake-gateway behavior. Live model
prompt parsing and richer eval fixtures should be expanded before Phase 0
operator review.
