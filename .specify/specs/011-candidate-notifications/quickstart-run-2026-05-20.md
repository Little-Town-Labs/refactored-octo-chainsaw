# Quickstart Run: F11 Candidate Notification Artifact System

**Date**: 2026-05-20

## Commands

```bash
pnpm --filter @spyglass/notifications test
pnpm --filter @spyglass/notifications type-check
pnpm --filter @spyglass/notifications lint
pnpm --filter @spyglass/notifications build
pnpm --filter @spyglass/notifications dev-run:f11
pnpm --filter @spyglass/db build
pnpm schema:lint
```

## Evidence

- Unit/contract tests: 8 suites, 10 tests passed.
- Type-check, lint, and build passed for `@spyglass/notifications`.
- `pnpm schema:lint` passed with 20 tables checked and 0 violations.
- Staged run published a template, built a deterministic notification artifact, refused early delivery with `not_yet_eligible`, allowed delivery with `notice_ready`, generated a deterministic delivery command idempotency key, and reconstructed review evidence.
