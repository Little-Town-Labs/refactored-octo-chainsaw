# Quickstart Run: F10 Dossier Builder + Signer

**Date**: 2026-05-20

## Commands

```bash
pnpm --filter @spyglass/dossiers test
pnpm --filter @spyglass/dossiers type-check
pnpm --filter @spyglass/dossiers lint
pnpm --filter @spyglass/dossiers build
pnpm --filter @spyglass/dossiers dev-run:f10
pnpm --filter @spyglass/db build
pnpm schema:lint
```

## Evidence

- Unit tests: 9 suites, 13 tests passed.
- Type-check, lint, and build passed for `@spyglass/dossiers`.
- `pnpm schema:lint` passed with 19 tables checked and 0 violations.
- Staged run built stable conclusive dossier evidence, signed it, verified `signature_valid`, stored 4 projections, and built an inconclusive dossier with actionable flags.
