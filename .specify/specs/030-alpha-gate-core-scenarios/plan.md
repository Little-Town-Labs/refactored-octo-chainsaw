# Implementation Plan: Deterministic Alpha Gate Core Scenarios

**Branch**: `030-alpha-gate-core-scenarios` | **Date**: 2026-05-27 | **Spec**: [spec.md](./spec.md)

## Summary

Extend `@spyglass/product-test-harness` with deterministic Alpha gate scenarios A1-A5. The implementation reuses PTH04 seed factories, evaluates synthetic gate outcomes without live models or external services, persists result-store snapshots, and exposes a local sample command for Alpha gate evidence.

## Technical Context

**Language/Version**: TypeScript 5.9 on Node 24.

**Primary Dependencies**: Existing `@spyglass/product-test-harness` contracts, runner, result store, and seed factories. No new runtime dependency.

**Storage**: Local file result store for sample evidence.

**Testing**: Jest unit tests for scenario outcomes, deterministic replay, and result-store persistence.

**Target Platform**: Spyglass pnpm/Turborepo monorepo.

**Project Type**: Workspace library package.

**Performance Goals**: A1-A5 deterministic gate suite completes under 5 seconds locally.

**Constraints**: Synthetic data only; no Neon, Vercel, Browserbase, Pi, live model, webhook receiver, or browser requirement.

**Scale/Scope**: Add deterministic scenario helpers and samples under `packages/product-test-harness`. Full live product wiring remains for later PTH slices.

## Constitution Check

| Article | Status | Rationale |
|---------|--------|-----------|
| I.1 Confidentiality | PASS | Scenario output uses synthetic seed records and explicit privacy exposure assertions. |
| I.2 Integrity | PASS | Scenario ids, assertion ids, seed ids, and evidence refs are deterministic. |
| I.3 Availability | PASS | Offline gate suite runs without live services. |
| I.4 Privacy | PASS | Denial and dossier evidence are synthetic and non-PII. |
| I.5 AAA | PASS | Human review and operator attribution use synthetic principal refs. |
| I.6 Defense in Depth | PASS | Consent, review, and jurisdiction denials fail closed with stable reason codes. |
| II Agent Identity | PASS | Agent paths remain seeded and synthetic; no live agent invocation is added. |
| III Typed Agent Semantics | PASS | Alpha gate outcomes are typed and exported. |
| IV Separation of Concerns | PASS | Scenario execution, seed generation, gate evaluation, and persistence remain separate. |
| V Governance | PASS | Feature follows Spec Kit artifacts and product harness roadmap boundaries. |

## Project Structure

```text
packages/product-test-harness/src/
├── scenarios/
│   └── alpha-gates.ts
├── samples/
│   └── alpha-gate-scenarios.ts
└── __tests__/
    └── alpha-gates.test.ts
```

## Complexity Tracking

No constitution violations require justification.
