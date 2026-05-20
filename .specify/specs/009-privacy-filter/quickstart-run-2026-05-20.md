# Quickstart Run: F09 Privacy Filter

**Date**: 2026-05-20

## Commands

```bash
pnpm --filter @spyglass/privacy-filter test
pnpm --filter @spyglass/privacy-filter type-check
pnpm --filter @spyglass/privacy-filter lint
pnpm --filter @spyglass/privacy-filter build
pnpm --filter @spyglass/privacy-filter dev-run:f09
pnpm --filter @spyglass/privacy-filter reachability:check
pnpm --filter @spyglass/privacy-filter boundary:check
pnpm --filter @spyglass/db build
pnpm schema:lint
```

## Evidence

- Unit tests: 10 suites, 17 tests passed.
- Type-check, lint, and build passed for `@spyglass/privacy-filter`.
- `dev-run:f09` published `default-seeker-to-employer@1.0.0`, wrapped/validated sentinels, filtered F08.5-style tool output, returned `privacy-filter/run-f09/...`, and recorded redaction counts `{ email: 1, field_not_allowed: 1 }`.
- `reachability:check` passed after excluding test/detector fixtures from production scan.
- `boundary:check` passed against the side-runner scan target.
- `pnpm schema:lint` passed with 18 tables checked and 0 violations.
