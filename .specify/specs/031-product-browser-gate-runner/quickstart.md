# Quickstart: Playwright Product Browser Runner

## Goal

Verify that PTH06 can define product browser journeys, execute them through a Playwright-compatible runner, capture browser artifacts, and persist local result-store snapshots without external services.

## Commands

```bash
pnpm --filter @spyglass/product-test-harness test -- browser-gates
pnpm --filter @spyglass/product-test-harness type-check
pnpm --filter @spyglass/product-test-harness build
pnpm --filter @spyglass/product-test-harness run:browser-gate-sample
```

## Expected Evidence

- Default journeys cover seeker landing, seeker auth/profile, employer console/req/candidate review, operator credential/audit, Alpha consent, and informational-only surfaces.
- The synthetic browser driver visits each configured route and viewport deterministically.
- Each journey records screenshot, video, trace, console log, and network log artifact refs according to policy.
- Browser artifacts persist in `ProductResultStoreSnapshot.browser_artifacts` and reload from the local result store.

## No External Services

This quickstart must not require Browserbase credentials, Vercel URLs, live Clerk sessions, live model providers, or installed Playwright browser binaries.

## Run Evidence

Validated on 2026-05-27:

- `pnpm --filter @spyglass/product-test-harness test -- browser-gates`: 1 suite, 5 tests passed.
- `pnpm --filter @spyglass/product-test-harness test`: 8 suites, 57 tests passed.
- `pnpm --filter @spyglass/product-test-harness type-check`: passed.
- `pnpm --filter @spyglass/product-test-harness build`: passed.
- `pnpm --filter @spyglass/product-test-harness lint`: passed.
- `pnpm --filter @spyglass/product-test-harness run:browser-gate-sample`: produced `8/8 browser journey(s) passed`, persisted 8 gate runs, and captured browser artifacts for all default journeys.
- `pnpm format:check`: passed.
