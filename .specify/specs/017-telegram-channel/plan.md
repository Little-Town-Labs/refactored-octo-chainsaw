# Implementation Plan: Telegram Channel Adapter

**Branch**: `017-telegram-channel` | **Date**: 2026-05-23 | **Spec**: `.specify/specs/017-telegram-channel/spec.md`

**Input**: Feature specification from `.specify/specs/017-telegram-channel/spec.md`

## Summary

F17 adds the first concrete seeker transport: a Telegram adapter that conforms to the F16 `@spyglass/channels-core` contract. The implementation will create a dedicated package for Telegram-native update normalization, channel-link posture checks, duplicate suppression semantics, outbound rendering from approved canonical messages, provider-neutral delivery reporting, Telegram capability declarations, audit event generation, conformance fixtures, and a staged dev run. Product conversation execution, persistent channel-link authority, webhook route hosting, and F20 onboarding flows remain outside the adapter.

## Technical Context

**Language/Version**: TypeScript on Node.js 24, ESM packages.

**Primary Dependencies**: New `@spyglass/telegram-channel` package; existing `@spyglass/channels-core` contract and conformance utilities; `@spyglass/shared` for common helpers; `grammy` for Telegram Bot API types/client behavior during implementation; Jest, TypeScript, ESLint, Prettier.

**Storage**: No new database migrations in F17. The adapter accepts channel-link lookup and duplicate-store abstractions so implementation tests can use in-memory fakes; durable persistence is supplied by the later webhook/product integration layer.

**Testing**: Jest package tests, channel-core conformance tests, Telegram contract schema validation, TypeScript type checks, linting, and a staged `dev-run:f17` command.

**Target Platform**: Spyglass pnpm/Turborepo monorepo packages running on Linux/Node. The PRD's future Telegram webhook handler can consume this adapter from `apps/telegram-bot` or `apps/web`, but F17 ships the reusable adapter package first.

**Project Type**: Package-level transport adapter centered in `packages/telegram-channel`.

**Performance Goals**: Inbound normalization, refusal, and duplicate decisions are deterministic and local; no provider or model calls before duplicate suppression. Webhook-facing code can acknowledge accepted updates quickly and defer product work outside the adapter.

**Constraints**: Adapters remain thin transports; no seeker dashboard semantics; no direct Parley run-state controls; no raw counterparty records or unfiltered dossier internals cross the Telegram adapter boundary; all inbound text is untrusted; missing channel-link posture, missing projection, malformed payloads, and unsupported intents fail closed.

**Scale/Scope**: One Telegram adapter package, contract docs, fixtures, tests, and staged evidence. Email, web chat, full seeker conversation orchestration, channel-link persistence UI, and production webhook deployment are out of scope.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | F17 Handling |
|------|--------|--------------|
| I.1 Confidentiality | PASS | Telegram outbound rendering accepts canonical approved projection/system content only; raw counterparty and dossier internals are not adapter inputs. |
| I.2 Integrity | PASS | Normalization, refusal, duplicate suppression, outbound rendering, delivery results, and capability registration produce audit-ready events. |
| I.3 Availability | PASS | Provider failures, throttling, unsupported content, and malformed updates map to provider-neutral retry/refusal outcomes. |
| I.4 Privacy | PASS | Inbound Telegram text is always untrusted; outbound content requires approved disclosure posture before rendering. |
| I.5 AAA | PASS | Inbound updates require verified channel links or explicit pending-link verification posture before becoming seeker-agent input. |
| I.6 Fail-safe Defaults | PASS | Unknown, disabled, malformed, oversized, unapproved, and unsupported cases refuse by default. |
| I.A Parley Regulatory Primitives | PASS | The adapter does not alter Parley scoring, rubrics, policy gates, candidate notification artifacts, or dossier delivery rules. |
| II Agent-Native Architecture | PASS | Telegram events become canonical machine-readable `ChannelMessage` envelopes for later agent/product flows. |
| III.1 Human UI | PASS | Telegram is the primary v0 human seeker conversation surface and preserves channel-specific usability through approved rendering/fallbacks. |
| III.2 Typed Semantics | PASS | The adapter consumes/produces F16 typed channel contracts and publishes Telegram-specific schemas. |
| IV Separation of Concerns | PASS | Telegram transport, channel-link authority, product orchestration, and Parley state remain separate. |
| V.3 Review Process | PASS | Tasks include analysis, code review, security review, staged verification, roadmap update, and PR follow-through. |

No constitutional violations are planned.

## Project Structure

### Documentation (this feature)

```text
.specify/specs/017-telegram-channel/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── telegram-update.schema.yaml
│   ├── telegram-outbound.schema.yaml
│   ├── telegram-delivery-result.schema.yaml
│   └── telegram-audit-event.schema.yaml
└── tasks.md
```

### Source Code (repository root)

```text
packages/telegram-channel/
├── package.json
├── README.md
├── tsconfig.json
├── jest.config.js
├── eslint.config.js
├── src/
│   ├── adapter.ts
│   ├── audit.ts
│   ├── capabilities.ts
│   ├── delivery.ts
│   ├── idempotency.ts
│   ├── index.ts
│   ├── links.ts
│   ├── normalize.ts
│   ├── render.ts
│   ├── types.ts
│   └── __tests__/
│       ├── adapter.test.ts
│       ├── boundary.test.ts
│       ├── delivery.test.ts
│       ├── idempotency.test.ts
│       ├── links.test.ts
│       └── render.test.ts
└── scripts/
    └── f17-staged-dev-run.ts
```

**Structure Decision**: Implement F17 as `@spyglass/telegram-channel`, a reusable package that consumes `@spyglass/channels-core`. Do not create the production webhook app in F17; the package exposes adapter functions that a later route/app can call.

## Phase 0: Research Output

Research decisions are captured in `.specify/specs/017-telegram-channel/research.md`.

## Phase 1: Design Output

Design artifacts are captured in:

- `.specify/specs/017-telegram-channel/data-model.md`
- `.specify/specs/017-telegram-channel/quickstart.md`
- `.specify/specs/017-telegram-channel/contracts/telegram-update.schema.yaml`
- `.specify/specs/017-telegram-channel/contracts/telegram-outbound.schema.yaml`
- `.specify/specs/017-telegram-channel/contracts/telegram-delivery-result.schema.yaml`
- `.specify/specs/017-telegram-channel/contracts/telegram-audit-event.schema.yaml`

## Phase 2: Implementation Approach

1. Scaffold `packages/telegram-channel` using the monorepo package pattern.
2. Add Telegram native type wrappers and bounded metadata helpers.
3. Add channel-link lookup abstractions and pending-link posture handling without owning persistence.
4. Add Telegram update idempotency keys based on Telegram update/message identity before any expensive or external work.
5. Add inbound normalization/refusal for messages, pending verification, unsupported update kinds, malformed payloads, oversized content, and unknown/disabled participants.
6. Add outbound rendering from approved canonical `ChannelMessage` content with safe fallback behavior for rich cards and unsupported content.
7. Add Telegram provider response mapping to F16 delivery outcomes, including throttling and retry-after handling.
8. Add audit event builders and capability declarations.
9. Add conformance, boundary, duplicate, rendering, delivery, and staged dev-run tests.

## Risk Controls

- Duplicate work/cost risk: duplicate suppression happens before downstream work and uses Telegram `update_id` plus message/chat fallback identity.
- Privacy leak risk: outbound rendering refuses missing approved projection posture and never accepts raw counterparty or dossier records.
- Prompt-injection risk: inbound text is always classified as untrusted and remains bounded.
- Adapter bloat risk: product commands are classified but not executed inside the adapter.
- Provider drift risk: Telegram-native fields are bounded metadata; canonical behavior stays provider-neutral through F16 contracts.
- Webhook retry risk: provider retries map to idempotent duplicate suppression and accepted/refused outcomes, not repeated product actions.

## Complexity Tracking

No constitutional or structural violations require complexity exceptions.
