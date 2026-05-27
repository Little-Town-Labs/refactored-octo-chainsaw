# Implementation Plan: Employer API and Webhook Gate Scenarios

**Branch**: `032-product-api-webhook-gates` | **Date**: 2026-05-27 | **Spec**: [spec.md](./spec.md)

## Summary

Extend `@spyglass/product-test-harness` with PTH07 employer API and webhook gate contracts, deterministic offline API execution, scoped synthetic credential validation, signed webhook delivery, synthetic receiver capture, idempotency handling, payload-boundary assertions, result-store persistence, and a local sample runner.

## Technical Context

**Language/Version**: TypeScript 5.9 on Node 24.

**Primary Dependencies**: Existing product harness contracts, runner, result store, deterministic seed factories, and Node `crypto` for HMAC-style synthetic signing. No new runtime dependency is required.

**Storage**: Local file result store for sample evidence.

**Testing**: Jest unit tests for credential scope, req lifecycle outcomes, signed delivery, synthetic receiver captures, idempotency, failure evidence, forbidden payload rejection, and result-store persistence.

**Target Platform**: Spyglass pnpm/Turborepo monorepo.

**Project Type**: Workspace library package.

**Performance Goals**: Synthetic API/webhook gate sample completes under 5 seconds locally.

**Constraints**: Synthetic data only; package tests must not require live employer credentials, network listeners, Vercel URLs, Neon branches, or external webhook services.

**Scale/Scope**: Add API/webhook gate modules under `packages/product-test-harness/src/api-webhooks/`, tests, sample command, public exports, and roadmap/docs updates. Live HTTP endpoint orchestration can be layered later without changing capture contracts.

## Constitution Check

| Article | Status | Rationale |
|---------|--------|-----------|
| I.1 Confidentiality | PASS | Credential and webhook evidence stores redacted refs and safe metadata only. |
| I.2 Integrity | PASS | Req ids, event ids, delivery ids, signatures, reason codes, and capture ids are deterministic. |
| I.3 Availability | PASS | Offline synthetic execution supports repeatable package validation without live services. |
| I.4 Privacy | PASS | Payload-boundary checks reject private seeker content, protected-class data, raw credentials, and secrets. |
| I.5 AAA | PASS | Scoped synthetic credentials are required for authorized employer API operations. |
| I.6 Defense in Depth | PASS | Invalid auth, missing scope, invalid signature, duplicate delivery, and forbidden payload fields fail closed. |
| II Agent Identity | PASS | No live agent execution is introduced. |
| III Typed Agent Semantics | PASS | API operations, webhook deliveries, and captures are typed and exported. |
| IV Separation of Concerns | PASS | Credential validation, req operations, signing, receiver capture, and persistence remain separate modules. |
| V Governance | PASS | Feature follows Spec Kit artifacts and product harness roadmap boundaries. |

## Project Structure

```text
packages/product-test-harness/src/
├── api-webhooks/
│   ├── credentials.ts
│   ├── gates.ts
│   ├── payload-boundaries.ts
│   ├── receiver.ts
│   ├── runner.ts
│   └── signing.ts
├── samples/
│   └── api-webhook-gates.ts
└── __tests__/
    └── api-webhook-gates.test.ts
```

## Complexity Tracking

No constitution violations require justification.
