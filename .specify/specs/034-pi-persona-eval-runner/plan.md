# Implementation Plan: Pi Persona Eval Adapter

**Branch**: `034-pi-persona-eval-runner` | **Date**: 2026-05-28 | **Spec**: [spec.md](./spec.md)

## Summary

Extend `@spyglass/product-test-harness` with PTH09 Pi-compatible persona eval contracts, deterministic synthetic driver execution, seeker/employer encounter matrices, transcript/tool/model/usage evidence, safety-boundary evaluation, result-store agent invocation persistence, and a local sample runner.

## Technical Context

**Language/Version**: TypeScript 5.9 on Node 24.

**Primary Dependencies**: Existing product harness contracts, runner, result store, observability log-safety helper, deterministic seed patterns, and local TypeScript modules. No new runtime dependency is required.

**Storage**: Local file result store for sample evidence.

**Testing**: Jest unit tests for persona registry, encounter matrix execution, synthetic Pi-compatible driver behavior, prompt-injection refusal, privacy-boundary safety, transcript safety checks, result-store persistence, and sample output.

**Target Platform**: Spyglass pnpm/Turborepo monorepo.

**Project Type**: Workspace library package.

**Performance Goals**: Synthetic persona eval sample completes under 5 seconds locally.

**Constraints**: Synthetic data only; package tests must not require live Pi credentials, model provider credentials, network sessions, external browser services, production data, or nondeterministic model calls.

**Scale/Scope**: Add persona eval modules under `packages/product-test-harness/src/persona-evals/`, tests, sample command, public exports, result-store evidence, and roadmap/docs updates. Live Pi sessions can be layered behind the same driver contract later.

## Constitution Check

| Article | Status | Rationale |
|---------|--------|-----------|
| I.1 Confidentiality | PASS | Transcript and metadata safety checks reject raw secrets, database URLs, private seeker content, and protected-class payloads. |
| I.2 Integrity | PASS | Persona ids, encounter ids, prompt refs, transcript refs, tool traces, usage, and evaluator reason codes are deterministic. |
| I.3 Availability | PASS | Offline synthetic execution allows repeatable eval validation without live providers. |
| I.4 Privacy | PASS | Persona data is synthetic and eval artifacts are safe references/excerpts only. |
| I.5 AAA | PASS | Tool traces record decision/refusal metadata for accountability; no anonymous live action is introduced. |
| I.6 Defense in Depth | PASS | Missing personas, driver failures, unsafe transcripts, and unsafe tool requests fail closed with stable reason codes. |
| II Agent Identity | PASS | Driver records identify synthetic persona and driver refs. |
| III Typed Agent Semantics | PASS | Persona, encounter, driver, transcript, tool, model, and evaluator contracts are typed and exported. |
| IV Separation of Concerns | PASS | Persona registry, driver, evaluator, runner, and persistence remain separate modules. |
| V Governance | PASS | Feature follows Spec Kit artifacts and product harness roadmap boundaries. |

## Project Structure

```text
packages/product-test-harness/src/
├── persona-evals/
│   ├── driver.ts
│   ├── evaluator.ts
│   ├── matrix.ts
│   ├── personas.ts
│   └── runner.ts
├── samples/
│   └── pi-persona-evals.ts
└── __tests__/
    └── pi-persona-evals.test.ts
```

## Complexity Tracking

No constitution violations require justification.
