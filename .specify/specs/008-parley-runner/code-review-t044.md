# F08 Code Review

**Date**: 2026-05-21

## Findings

No blocking code-review findings.

## Review Notes

- The implementation keeps F08 orchestration in `@spyglass/parley` and reuses existing Stage 3/4 packages instead of duplicating registry, scoring, privacy, dispatcher, or dossier logic.
- `NegotiationContextManager` keys context by `(run_id, side)` and requires projection refs for counterparty updates.
- `dispatchParley` refuses missing contract/rubric/tool prerequisites and scans advertised descriptors for human-input pause semantics.
- `coordinateParleyRun` enforces seeker-first turns, round-cap termination, both-sides-done scoring handoff, scoring-gap inconclusive fallback, and context release after terminal dossier production.

## Test Evidence

- `pnpm --filter @spyglass/parley test`
- `pnpm --filter @spyglass/parley type-check`
- `pnpm --filter @spyglass/parley lint`
- `pnpm --filter @spyglass/parley build`

**Result**: Pass.
