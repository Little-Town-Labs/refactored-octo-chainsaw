# Implementation Plan: Playwright Product Browser Runner

**Branch**: `031-product-browser-gate-runner` | **Date**: 2026-05-27 | **Spec**: [spec.md](./spec.md)

## Summary

Extend `@spyglass/product-test-harness` with PTH06 browser journey contracts, default product journey registry, validation, Playwright-compatible driver boundary, deterministic synthetic driver, browser artifact persistence, and a local sample runner. The slice avoids requiring browser binaries in unit tests while keeping the execution shape ready for local Playwright and future Browserbase-backed Playwright.

## Technical Context

**Language/Version**: TypeScript 5.9 on Node 24.

**Primary Dependencies**: Existing product harness contracts, runner, result store, and validation helpers. No new runtime dependency is required for the deterministic synthetic driver.

**Storage**: Local file result store for sample evidence.

**Testing**: Jest unit tests for registry coverage, validation, synthetic execution, artifact capture, and result-store persistence.

**Target Platform**: Spyglass pnpm/Turborepo monorepo.

**Project Type**: Workspace library package.

**Performance Goals**: Synthetic browser journey sample completes under 5 seconds locally.

**Constraints**: Synthetic data only; package tests must not require live Clerk sessions, Browserbase credentials, Vercel URLs, or installed browser binaries.

**Scale/Scope**: Add browser runner modules under `packages/product-test-harness/src/browser/`, tests, sample command, public exports, and roadmap/docs updates. Live browser binary orchestration can be enabled by a future concrete Playwright driver without changing result-store contracts.

## Constitution Check

| Article | Status | Rationale |
|---------|--------|-----------|
| I.1 Confidentiality | PASS | Artifacts use redacted synthetic refs and metadata; unsafe values are rejected by result-store validation. |
| I.2 Integrity | PASS | Journey ids, route evidence, artifact ids, and result snapshots are deterministic. |
| I.3 Availability | PASS | Offline synthetic driver allows repeatable package validation without live services. |
| I.4 Privacy | PASS | Browser artifacts are synthetic, redacted, and never contain production data. |
| I.5 AAA | PASS | Authenticated journeys are represented as route coverage contracts without bypassing live auth. |
| I.6 Defense in Depth | PASS | Journey validation fails closed before execution on missing app URL, routes, viewports, or artifact policy. |
| II Agent Identity | PASS | No live agent execution is introduced. |
| III Typed Agent Semantics | PASS | Browser driver and artifact semantics are typed and exported. |
| IV Separation of Concerns | PASS | Journey definitions, validation, driver execution, and persistence remain separate modules. |
| V Governance | PASS | Feature follows Spec Kit artifacts and product harness roadmap boundaries. |

## Project Structure

```text
packages/product-test-harness/src/
├── browser/
│   ├── artifacts.ts
│   ├── journeys.ts
│   ├── runner.ts
│   ├── synthetic-driver.ts
│   └── validation.ts
├── samples/
│   └── browser-gate-scenario.ts
└── __tests__/
    └── browser-gates.test.ts
```

## Complexity Tracking

No constitution violations require justification.
