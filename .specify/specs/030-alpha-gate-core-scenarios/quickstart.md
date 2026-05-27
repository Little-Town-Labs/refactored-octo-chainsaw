# Quickstart: Deterministic Alpha Gate Core Scenarios

## Goal

Verify that PTH05 can run deterministic Alpha gate scenarios A1-A5 without external services and persist reviewable local evidence.

## Commands

```bash
pnpm --filter @spyglass/product-test-harness test -- alpha-gates
pnpm --filter @spyglass/product-test-harness type-check
pnpm --filter @spyglass/product-test-harness build
pnpm --filter @spyglass/product-test-harness run:alpha-gate-sample
```

## Expected Evidence

- A1 allows the flow and asserts signed dossier, informational-only posture, audit evidence, and no forbidden exposure.
- A2 blocks for missing consent with stable reason code.
- A3 blocks for withdrawn consent and confirms no new dossier dispatch.
- A4 blocks for human review and exposes reviewer/evidence refs.
- A5 denies for jurisdiction kill switch with non-PII failure artifact and audit evidence.
- Local result-store snapshots are reloadable for all five scenarios.

## No External Services

This quickstart must not require Neon credentials, Vercel URLs, Browserbase credentials, Pi credentials, live model providers, browsers, or live webhook endpoints.

## Run Evidence

Validated on 2026-05-27:

- `pnpm --filter @spyglass/product-test-harness test -- alpha-gates`: 1 suite, 11 tests passed.
- `pnpm --filter @spyglass/product-test-harness test`: 7 suites, 52 tests passed.
- `pnpm --filter @spyglass/product-test-harness type-check`: passed.
- `pnpm --filter @spyglass/product-test-harness build`: passed.
- `pnpm --filter @spyglass/product-test-harness lint`: passed.
- `pnpm --filter @spyglass/product-test-harness run:alpha-gate-sample`: produced `5/5 Alpha gate scenario(s) passed`, persisted 5 gate runs, and reported 22 seed records plus 1 audit signal for each A1-A5 scenario.
