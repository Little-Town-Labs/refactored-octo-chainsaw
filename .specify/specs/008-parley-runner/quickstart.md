# Quickstart: F08 Parley Runner

## Goal

Run the deterministic Parley synthetic match and verify it produces a signed, valid dossier with all four audience projections while exercising dispatch, coordination, side runners, privacy filtering, dossier production, and terminal event emission.

## Prerequisites

- Node 24 and pnpm 9.
- Dependencies installed with `pnpm install`.
- No external Inngest, AI Gateway, or Postgres credentials are required for the staged package run.

## Commands

```bash
pnpm --filter @spyglass/parley test
pnpm --filter @spyglass/parley type-check
pnpm --filter @spyglass/parley lint
pnpm --filter @spyglass/parley build
pnpm --filter @spyglass/parley dev-run:f08
pnpm --filter @spyglass/tool-dispatcher boundary:check
pnpm --filter @spyglass/privacy-filter reachability:check
pnpm --filter @spyglass/privacy-filter boundary:check
pnpm --filter @spyglass/dossiers test
pnpm schema:lint
```

## Expected Evidence

The staged run should print:

- `run_status=complete`
- `round_cap=2` or lower from seeded contract contributions
- `dossier_status=conclusive`
- `signature_verification=valid`
- `projection_count=4`
- `terminal_event=negotiation.run.terminated`
- `dossier_event=dossier.produced`

## Failure Evidence

The implementation should also include tests for:

- `rubric_missing_bias_test` dispatch refusal.
- Human-input tool descriptor refusal.
- Cross-run context isolation.
- Side-runner type boundary rejecting raw counterparty principal input.
- Inconclusive dossier generation for incomplete scoring.
