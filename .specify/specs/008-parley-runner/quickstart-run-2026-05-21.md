# F08 Quickstart Run Evidence

**Date**: 2026-05-21

**Branch**: `008-parley-runner`

## Commands

```bash
pnpm --filter @spyglass/parley test
pnpm --filter @spyglass/parley type-check
pnpm --filter @spyglass/parley lint
pnpm --filter @spyglass/parley build
pnpm --filter @spyglass/parley dev-run:f08
pnpm --filter @spyglass/tool-dispatcher boundary:check
pnpm --filter @spyglass/privacy-filter test
pnpm --filter @spyglass/privacy-filter reachability:check
pnpm --filter @spyglass/privacy-filter boundary:check
pnpm --filter @spyglass/dossiers test
pnpm schema:lint
```

## Staged Run Output

```text
run_status=complete
round_cap=2
dossier_status=conclusive
signature_verification=valid
projection_count=4
terminal_event=negotiation.run.terminated
dossier_event=dossier.produced
```

## Notes

- `tsx`-based dev-run and cross-package boundary scripts require elevated execution in this sandbox because `tsx` cannot create `/tmp/tsx-1000/*.pipe` under default sandbox permissions.
- The staged run uses deterministic fixture side-agent drivers; no AI Gateway, live Inngest, or Postgres credentials are required.
