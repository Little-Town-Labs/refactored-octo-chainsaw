# Implementation Plan: Email Channel Adapter

**Branch**: `018-email-channel` | **Date**: 2026-05-23 | **Spec**: `.specify/specs/018-email-channel/spec.md`

**Input**: Feature specification from `.specify/specs/018-email-channel/spec.md`

## Summary

F18 adds the fallback and async-friendly seeker transport: an email adapter that conforms to the F16 `@spyglass/channels-core` contract. The implementation will create a dedicated package for provider-parsed inbound email normalization, Resend-first provider mapping, Spyglass reply-alias threading, channel-link posture checks, duplicate suppression, outbound email rendering from approved canonical messages, provider-neutral delivery/bounce/complaint outcomes, unsubscribe/suppression refusals, capability declarations, audit event generation, conformance fixtures, and a staged dev run. Product conversation execution, persistent channel-link authority, provider webhook route hosting, sending-domain administration, and F20 onboarding flows remain outside the adapter.

## Technical Context

**Language/Version**: TypeScript on Node.js 24, ESM packages.

**Primary Dependencies**: New `@spyglass/email-channel` package; existing `@spyglass/channels-core` contract and conformance utilities; `@spyglass/shared` for common helpers; Resend provider shapes/SDK compatibility for the initial provider path; Jest, TypeScript, ESLint, Prettier.

**Storage**: No new database migrations in F18. The adapter accepts channel-link lookup, duplicate-store, unsubscribe/suppression posture, and provider-event mapping abstractions so implementation tests can use in-memory fakes; durable persistence is supplied by the later webhook/product integration layer.

**Testing**: Jest package tests, channel-core conformance tests, email contract schema validation, TypeScript type checks, linting, and a staged `dev-run:f18` command.

**Target Platform**: Spyglass pnpm/Turborepo monorepo packages running on Linux/Node. Future webhook routes can consume this adapter from `apps/web` or another inbound worker, but F18 ships the reusable adapter package first.

**Project Type**: Package-level transport adapter centered in `packages/email-channel`.

**Performance Goals**: Inbound normalization, refusal, bounce/complaint classification, and duplicate decisions are deterministic and local; no provider or model calls before duplicate suppression. Webhook-facing code can acknowledge accepted provider events quickly and defer product work outside the adapter.

**Constraints**: Adapters remain thin transports; no seeker dashboard semantics; no direct Parley run-state controls; no raw counterparty records or unfiltered dossier internals cross the email adapter boundary; all inbound email body/subject/header text is untrusted; missing channel-link posture, missing projection, malformed payloads, unsupported intents, unsubscribed recipients, and suppressed recipients fail closed.

**Scale/Scope**: One email adapter package, contract docs, fixtures, tests, and staged evidence. Telegram, web chat, full seeker conversation orchestration, channel-link persistence UI, provider route hosting, DNS/domain setup, and production webhook deployment are out of scope.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | F18 Handling |
|------|--------|--------------|
| I.1 Confidentiality | PASS | Email outbound rendering accepts canonical approved projection/system content only; raw counterparty and dossier internals are not adapter inputs. |
| I.2 Integrity | PASS | Normalization, refusal, duplicate suppression, outbound rendering, delivery results, bounce/complaint handling, and capability registration produce audit-ready events. |
| I.3 Availability | PASS | Provider failures, deferrals, bounces, complaints, suppressions, throttling, unsupported content, and malformed inbound events map to provider-neutral retry/refusal outcomes. |
| I.4 Privacy | PASS | Inbound email content is always untrusted; outbound content requires approved disclosure posture before rendering. |
| I.5 AAA | PASS | Inbound events require verified channel links or explicit pending-link verification posture before becoming seeker-agent input. |
| I.6 Fail-safe Defaults | PASS | Unknown, disabled, spoof-risk, spam-flagged, malformed, oversized, unapproved, unsubscribed, suppressed, and unsupported cases refuse by default. |
| I.A Parley Regulatory Primitives | PASS | The adapter does not alter Parley scoring, rubrics, policy gates, candidate notification artifacts, or dossier delivery rules. |
| II Agent-Native Architecture | PASS | Email events become canonical machine-readable `ChannelMessage` envelopes for later agent/product flows. |
| III.1 Human UI | PASS | Email is the fallback and async-friendly v0 human seeker surface and preserves usability through reply threading and approved rendering/fallbacks. |
| III.2 Typed Semantics | PASS | The adapter consumes/produces F16 typed channel contracts and publishes email-specific schemas. |
| IV Separation of Concerns | PASS | Email transport, channel-link authority, product orchestration, provider route hosting, and Parley state remain separate. |
| V.3 Review Process | PASS | Tasks include analysis, code review, security review, staged verification, roadmap update, and PR follow-through. |

No constitutional violations are planned.

## Project Structure

### Documentation (this feature)

```text
.specify/specs/018-email-channel/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── email-inbound.schema.yaml
│   ├── email-outbound.schema.yaml
│   ├── email-delivery-result.schema.yaml
│   └── email-audit-event.schema.yaml
└── tasks.md
```

### Source Code (repository root)

```text
packages/email-channel/
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
│   ├── threading.ts
│   ├── types.ts
│   └── __tests__/
│       ├── adapter.test.ts
│       ├── boundary.test.ts
│       ├── delivery.test.ts
│       ├── idempotency.test.ts
│       ├── links.test.ts
│       ├── render.test.ts
│       └── threading.test.ts
└── scripts/
    └── f18-staged-dev-run.ts
```

**Structure Decision**: Implement F18 as `@spyglass/email-channel`, a reusable package that consumes `@spyglass/channels-core`. Do not create the production webhook app or domain-management workflow in F18; the package exposes adapter functions that a later route/app can call.

## Phase 0: Research Output

Research decisions are captured in `.specify/specs/018-email-channel/research.md`.

## Phase 1: Design Output

Design artifacts are captured in:

- `.specify/specs/018-email-channel/data-model.md`
- `.specify/specs/018-email-channel/quickstart.md`
- `.specify/specs/018-email-channel/contracts/email-inbound.schema.yaml`
- `.specify/specs/018-email-channel/contracts/email-outbound.schema.yaml`
- `.specify/specs/018-email-channel/contracts/email-delivery-result.schema.yaml`
- `.specify/specs/018-email-channel/contracts/email-audit-event.schema.yaml`

## Phase 2: Implementation Approach

1. Scaffold `packages/email-channel` using the monorepo package pattern.
2. Add email provider event wrappers and bounded metadata helpers.
3. Add channel-link lookup, unsubscribe/suppression posture, and pending-link posture handling without owning persistence.
4. Add email idempotency keys based on provider event id, message id, reply alias, and thread identity before any expensive or external work.
5. Add inbound normalization/refusal for verified replies, pending verification, wrong-thread messages, spam/spoof-risk events, unsupported MIME/content, malformed payloads, oversized content, unknown/disabled participants, and unsafe attachments.
6. Add bounce, complaint, deferred, delivered, suppressed, and provider-rate-limited event mapping to F16 delivery outcomes.
7. Add outbound rendering from approved canonical `ChannelMessage` content with text-first body rendering, subject bounds, reply/thread headers, and safe fallback behavior for rich cards and unsupported content.
8. Add audit event builders and capability declarations.
9. Add conformance, boundary, duplicate, threading, rendering, delivery, and staged dev-run tests.

## Risk Controls

- Duplicate work/cost risk: duplicate suppression happens before downstream work and uses provider event id plus email message id, reply alias, and thread identity.
- Privacy leak risk: outbound rendering refuses missing approved projection posture and never accepts raw counterparty or dossier records.
- Prompt-injection risk: inbound subject/body/header-derived text is always classified as untrusted and remains bounded.
- Adapter bloat risk: product commands are classified but not executed inside the adapter.
- Provider drift risk: provider-native fields are bounded metadata; canonical behavior stays provider-neutral through F16 contracts.
- Webhook retry risk: provider retries map to idempotent duplicate suppression and accepted/refused outcomes, not repeated product actions.
- Email abuse risk: spam/spoof-risk, bounces, complaints, unsubscribes, suppressions, and unsafe attachments fail closed before agent input.

## Complexity Tracking

No constitutional or structural violations require complexity exceptions.
