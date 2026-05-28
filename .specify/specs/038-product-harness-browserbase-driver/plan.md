# Implementation Plan: PTH13 Browserbase Preview/Prod Replay Driver

**Branch**: `038-product-harness-browserbase-driver` | **Date**: 2026-05-28 | **Spec**: `spec.md`
**Input**: PTH13 feature spec from the product harness roadmap.

## Summary

Add a Browserbase-backed `BrowserJourneyDriver` to `@spyglass/product-test-harness` that creates managed Browserbase sessions and delegates visit execution to a Playwright-compatible connector. Keep local tests deterministic by injecting fake Browserbase/session dependencies, and expose environment validation helpers for PTH14 canary workflow wiring.

## Technical Context

**Language/Version**: TypeScript on Node 24
**Primary Dependencies**: Existing pnpm workspace, Jest, local product-test-harness browser contracts
**Storage**: Evidence refs only; PTH11 Neon and PTH12 durable artifacts consume metadata later
**Testing**: Jest package tests plus package type-check/lint/build and workspace hygiene checks
**Target Project**: `packages/product-test-harness`
**Constraints**: No live Browserbase credentials in tests, no new runtime dependencies, safe metadata, session cleanup

## Constitution Check

- Synthetic data only: tests use fake Browserbase sessions and deterministic deployed URLs.
- Evidence retention: visits include session/replay/artifact refs without embedding secrets.
- CI hygiene: local tests do not need Browserbase credentials.
- Type safety: session clients, connector inputs, driver options, and env helpers are explicit.

## Project Structure

```text
packages/product-test-harness/src/
  browser/
    browserbase-driver.ts
    runner.ts
  __tests__/
    browserbase-driver.test.ts
.specify/specs/038-product-harness-browserbase-driver/
  contracts/browserbase-driver.md
  data-model.md
  quickstart.md
  research.md
  tasks.md
```

## Validation Strategy

1. Focused Browserbase driver tests.
2. Existing browser journey tests.
3. Product-test-harness package type-check, lint, build, and tests.
4. Workspace format/type/lint/build checks.
5. Spec Kit analyze pass across spec, plan, and tasks.
