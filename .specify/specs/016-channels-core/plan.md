# Implementation Plan: Channel Adapter Framework

**Branch**: `016-channels-core` | **Date**: 2026-05-22 | **Spec**: `.specify/specs/016-channels-core/spec.md`

**Input**: Feature specification from `.specify/specs/016-channels-core/spec.md`

## Summary

F16 turns the existing `@spyglass/channels-core` placeholder into the shared seeker-channel contract used by Telegram, email, and web chat. The package will define a canonical `ChannelMessage` envelope, adapter capability and delivery contracts, structured refusal and reason codes, conformance fixtures, and audit-ready event shapes while keeping concrete transports and full conversational product flows out of scope for later Stage 6 features.

## Technical Context

**Language/Version**: TypeScript on Node.js 24, ESM packages.

**Primary Dependencies**: Existing `@spyglass/channels-core` package, `@spyglass/shared` conventions, Clerk-linked principal concepts from auth, privacy/disclosure terminology from `@spyglass/privacy-filter`, dossier projection concepts from `@spyglass/dossiers`, and audit evidence concepts from `@spyglass/audit-log`.

**Storage**: Package-local contract types and in-memory conformance fixtures only. F16 defines durable event and message shapes but does not add database migrations.

**Testing**: Jest package tests, TypeScript type checks, linting, JSON/YAML contract schema review, and a staged `dev-run:f16` command once implementation tasks are complete.

**Target Platform**: Spyglass monorepo packages running on Linux/Node with later adapters in `apps/telegram-bot`, `apps/web`, and an email adapter package or app integration.

**Project Type**: Package-level shared contract and conformance feature centered in `packages/channels-core`.

**Performance Goals**: Canonical normalization and validation should be deterministic and side-effect bounded; duplicate checks and capability validation should be usable on webhook and async email paths without network calls.

**Constraints**: Adapters remain thin transports; no seeker dashboard semantics; no direct Parley run-state controls; no raw counterparty records or unfiltered dossier internals cross the channel boundary; all free text is marked untrusted; email provider/parser decisions are deferred to F18.

**Scale/Scope**: One shared channel-core slice for Stage 6. Concrete Telegram, email, web-chat, full onboarding conversation orchestration, and A2A seeker-delegate execution are out of scope.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | F16 Handling |
|------|--------|--------------|
| I.1 Confidentiality | PASS | Adapters receive approved projections only and cannot access raw counterparty records or hidden Parley state. |
| I.2 Integrity | PASS | Canonical message, delivery, duplicate suppression, and capability registration outcomes have audit-ready event shapes. |
| I.3 Availability | PASS | Delivery and provider failures are structured as retryable, terminal, refused, unsupported, or rate-limited outcomes. |
| I.4 Privacy | PASS | Channel-core records disclosure posture, treats all free text as untrusted, and keeps demographic opt-in as explicit consent semantics. |
| I.5 AAA | PASS | Inbound messages require verified channel links or pending-link flows before becoming seeker-agent input. |
| I.6 Fail-safe Defaults | PASS | Unknown sender, malformed payload, missing projection, and unsupported intent fail closed with reason codes. |
| I.A Parley Regulatory Primitives | PASS | Channel delivery consumes approved dossier/projection outputs and does not alter Parley scoring, rubrics, or negotiation controls. |
| I.C.2 AI Supply Chain References | PASS | No prompts/models are introduced; channel messages preserve prompt-safety metadata for later agent flows. |
| II Agent-Native Architecture | PASS | Shared typed envelopes give agents and services machine-readable channel semantics. |
| III.2 Typed Semantics | PASS | `ChannelMessage`, adapter capabilities, delivery outcomes, and reason codes are the core deliverables. |
| IV Separation of Concerns | PASS | Concrete transports, product flow orchestration, and core channel contracts remain separate. |
| V.3 Review Process | PASS | Tasks include analysis, code review, security review, staged verification, roadmap update, and PR follow-through. |

No constitutional violations are planned.

## Project Structure

### Documentation (this feature)

```text
.specify/specs/016-channels-core/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── channel-message.schema.yaml
│   ├── channel-adapter.schema.yaml
│   ├── delivery-outcome.schema.yaml
│   └── channel-audit-event.schema.yaml
└── tasks.md
```

### Source Code (repository root)

```text
packages/channels-core/
├── package.json
├── README.md
├── src/
│   ├── adapter.ts
│   ├── audit.ts
│   ├── capabilities.ts
│   ├── conformance.ts
│   ├── content.ts
│   ├── delivery.ts
│   ├── errors.ts
│   ├── fixtures.ts
│   ├── index.ts
│   ├── message.ts
│   └── __tests__/
│       ├── adapter.test.ts
│       ├── conformance.test.ts
│       ├── delivery.test.ts
│       ├── message.test.ts
│       └── unsupported-intents.test.ts
└── scripts/
    └── f16-staged-dev-run.ts
```

**Structure Decision**: Implement F16 inside the existing `@spyglass/channels-core` placeholder. Do not create concrete channel packages during F16; later F17/F18/F19 features consume the conformance helpers and contracts.

## Phase 0: Research Output

Research decisions are captured in `.specify/specs/016-channels-core/research.md`.

## Phase 1: Design Output

Design artifacts are captured in:

- `.specify/specs/016-channels-core/data-model.md`
- `.specify/specs/016-channels-core/quickstart.md`
- `.specify/specs/016-channels-core/contracts/channel-message.schema.yaml`
- `.specify/specs/016-channels-core/contracts/channel-adapter.schema.yaml`
- `.specify/specs/016-channels-core/contracts/delivery-outcome.schema.yaml`
- `.specify/specs/016-channels-core/contracts/channel-audit-event.schema.yaml`

## Phase 2: Implementation Approach

1. Add canonical channel, direction, participant, content, intent, disclosure, delivery, and reason-code models in `packages/channels-core`.
2. Add the `ChannelMessage` envelope and validation helpers for inbound/outbound canonical message fixtures.
3. Add adapter capability and adapter interface contracts for inbound normalization, outbound rendering, acknowledgement, and delivery result reporting.
4. Add structured refusal and delivery result helpers for duplicate events, unsupported intents, unauthenticated links, malformed payloads, missing privacy projection, and provider failures.
5. Add conformance fixtures for Telegram-like realtime chat, email-like async threading, and web-chat/minimal plain-text fallback.
6. Add audit-ready event builders for normalization, refusal, duplicate suppression, outbound rendering, delivery result, and capability registration.
7. Add staged dev run evidence that exercises canonical normalization, duplicate suppression, delivery outcomes, and unsupported dashboard/direct-negotiation refusal.

## Risk Controls

- Dashboard drift risk: unsupported intent list rejects browse/list/analytics/direct-negotiation actions in channel-core.
- Privacy leak risk: outbound adapters receive approved projection content only and no raw counterparty or transcript types.
- Prompt-injection risk: all free-text content carries untrusted-input classification for downstream sentinel handling.
- Adapter bloat risk: adapter contracts expose transport operations only, leaving seeker product orchestration to later F20.
- Retry/duplicate risk: idempotency fields and duplicate suppression events are first-class contract elements.
- Provider ambiguity risk: delivery outcomes force ambiguous native failures into a bounded retryable, terminal, refused, unsupported, or rate-limited classification.

## Complexity Tracking

No constitutional or structural violations require complexity exceptions.
