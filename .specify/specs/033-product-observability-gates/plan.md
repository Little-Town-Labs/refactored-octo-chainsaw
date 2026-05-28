# Implementation Plan: Observability and Incident Gate Scenarios

**Branch**: `033-product-observability-gates` | **Date**: 2026-05-27 | **Spec**: [spec.md](./spec.md)

## Summary

Extend `@spyglass/product-test-harness` with PTH08 deterministic observability and incident gate contracts, offline audit/monitoring/Sentry-style signal validation, safe log scanning, incident readiness checks, latency/cost budget assertions, result-store persistence, and a local sample runner.

## Technical Context

**Language/Version**: TypeScript 5.9 on Node 24.

**Primary Dependencies**: Existing product harness contracts, runner, result store, validation helpers, deterministic seed patterns, and local TypeScript modules. No new runtime dependency is required.

**Storage**: Local file result store for sample evidence.

**Testing**: Jest unit tests for signal contracts, audit coverage, monitoring bounds, Sentry-style config validation, incident readiness, unsafe log rejection, failure evidence, result-store persistence, and the sample runner.

**Target Platform**: Spyglass pnpm/Turborepo monorepo.

**Project Type**: Workspace library package.

**Performance Goals**: Synthetic observability gate sample completes under 5 seconds locally.

**Constraints**: Synthetic data only; package tests must not require live monitoring vendors, live Sentry projects, network listeners, Vercel URLs, production credentials, or real incidents.

**Scale/Scope**: Add observability gate modules under `packages/product-test-harness/src/observability/`, tests, sample command, public exports, result-store evidence, and roadmap/docs updates. Live vendor adapters can be layered later without changing deterministic capture contracts.

## Constitution Check

| Article | Status | Rationale |
|---------|--------|-----------|
| I.1 Confidentiality | PASS | Log and metadata scanning rejects credential material, database URLs, private seeker content, and protected-class payloads before persistence. |
| I.2 Integrity | PASS | Audit, monitoring, and incident evidence use deterministic ids, timestamps, reason codes, and evidence refs. |
| I.3 Availability | PASS | Incident and monitoring gates validate readiness signals without live vendor dependencies. |
| I.4 Privacy | PASS | Persisted evidence is synthetic and stripped of forbidden privacy markers. |
| I.5 AAA | PASS | Audit evidence requires stable actor and subject refs for accountability. |
| I.6 Defense in Depth | PASS | Missing signals, invalid config, over-budget metrics, incomplete incident records, and unsafe logs fail closed. |
| II Agent Identity | PASS | No live agent execution is introduced. |
| III Typed Agent Semantics | PASS | Observability and incident signal contracts are typed and exported. |
| IV Separation of Concerns | PASS | Signal validation, log safety, gate registry, runner, and persistence remain separate modules. |
| V Governance | PASS | Feature follows Spec Kit artifacts and product harness roadmap boundaries. |

## Project Structure

```text
packages/product-test-harness/src/
├── observability/
│   ├── gates.ts
│   ├── incidents.ts
│   ├── log-safety.ts
│   ├── monitoring.ts
│   ├── runner.ts
│   └── signals.ts
├── samples/
│   └── observability-gates.ts
└── __tests__/
    └── observability-gates.test.ts
```

## Complexity Tracking

No constitution violations require justification.
