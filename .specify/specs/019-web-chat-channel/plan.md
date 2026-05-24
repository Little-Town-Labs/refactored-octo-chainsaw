# Implementation Plan: Web-Chat Channel Adapter

**Branch**: `019-web-chat-channel` | **Date**: 2026-05-23 | **Spec**: `.specify/specs/019-web-chat-channel/spec.md`

**Input**: Feature specification from `.specify/specs/019-web-chat-channel/spec.md`

## Summary

F19 adds the Clerk-authenticated first-touch web-chat transport: a reusable adapter that conforms to the F16 `@spyglass/channels-core` contract. The implementation will create a dedicated package for bounded Clerk/session posture input, authenticated and pending-link inbound normalization, unauthenticated refusal/prompt posture, browser retry duplicate suppression, outbound render models from approved canonical messages, channel-neutral delivery/status outcomes, WCAG 2.2 AA-facing interaction semantics, capability declarations, audit event generation, conformance fixtures, and a staged dev run. Full seeker conversational onboarding, account/profile UI, web route hosting, Clerk administration, ticket/dashboard/product execution, and Parley control remain outside the adapter.

## Technical Context

**Language/Version**: TypeScript on Node.js 24, ESM packages.

**Primary Dependencies**: New `@spyglass/web-chat-channel` package; existing `@spyglass/channels-core` contract and conformance utilities; `@spyglass/shared` for common helpers; Clerk session/principal concepts as bounded inputs; Jest, TypeScript, ESLint, Prettier.

**Storage**: No new database migrations in F19. The adapter accepts session binding, channel-link lookup, duplicate-store, participant posture, and status mapping abstractions so implementation tests can use in-memory fakes; durable persistence and Clerk validation are supplied by the later web route/product integration layer.

**Testing**: Jest package tests, channel-core conformance tests, web-chat contract schema validation, accessibility contract fixture tests, TypeScript type checks, linting, and a staged `dev-run:f19` command.

**Target Platform**: Spyglass pnpm/Turborepo monorepo packages running on Linux/Node. Future `apps/web` chat routes can consume this adapter, but F19 ships the reusable adapter package and render contract first.

**Project Type**: Package-level transport adapter centered in `packages/web-chat-channel`.

**Performance Goals**: Inbound normalization, refusal, duplicate decisions, and render-model creation are deterministic and local; no provider, Clerk network, or model calls before duplicate suppression. Browser-facing integration code can acknowledge accepted client events quickly and defer product work outside the adapter.

**Constraints**: Adapters remain thin transports; no seeker dashboard semantics; no ticket list, analytics, recommended-jobs UI, or direct Parley run-state controls; no raw counterparty records or unfiltered dossier internals cross the web-chat adapter boundary; all client-controlled text is untrusted; unauthenticated visitors cannot create canonical seeker-agent input.

**Scale/Scope**: One web-chat adapter package, contract docs, fixtures, tests, and staged evidence. Telegram, email, full onboarding conversation orchestration, Clerk-hosted profile/account pages, channel-link persistence UI, web route hosting, production websocket/SSE transport, and A2A seeker-delegate execution are out of scope.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | F19 Handling |
|------|--------|--------------|
| I.1 Confidentiality | PASS | Web-chat outbound rendering accepts canonical approved projection/system content only; raw counterparty records and dossier internals are not adapter inputs. |
| I.2 Integrity | PASS | Normalization, refusal, duplicate suppression, render, status outcomes, accessibility validation, and capability registration produce audit-ready events. |
| I.3 Availability | PASS | Client retries, expired actions, render failures, terminal failures, cancelled messages, and unsupported actions map to structured retry/refusal/status outcomes. |
| I.4 Privacy | PASS | Inbound browser content is always untrusted; outbound content requires approved disclosure posture before rendering. |
| I.5 AAA | PASS | Canonical inbound messages require Clerk-authenticated session binding or explicit pending-link verification posture. |
| I.6 Fail-safe Defaults | PASS | Unknown, unauthenticated, expired, wrong-participant, malformed, over-size, unsupported, and unapproved cases refuse by default. |
| I.A Parley Regulatory Primitives | PASS | The adapter does not alter Parley scoring, rubrics, policy gates, candidate notification artifacts, or dossier delivery rules. |
| II Agent-Native Architecture | PASS | Web-chat events become canonical machine-readable `ChannelMessage` envelopes for later agent/product flows. |
| III.1 Human UI | PASS | Web chat is the Clerk-authenticated first-touch v0 human seeker surface and includes WCAG 2.2 AA-facing render contract semantics. |
| III.2 Typed Semantics | PASS | The adapter consumes/produces F16 typed channel contracts and publishes web-chat-specific schemas. |
| IV Separation of Concerns | PASS | Web-chat transport, Clerk/session authority, product orchestration, web route hosting, account management, and Parley state remain separate. |
| V.3 Review Process | PASS | Tasks include analysis, code review, security/accessibility review, staged verification, roadmap update, and PR follow-through. |

No constitutional violations are planned.

## Project Structure

### Documentation (this feature)

```text
.specify/specs/019-web-chat-channel/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── web-chat-client-event.schema.yaml
│   ├── web-chat-render-model.schema.yaml
│   ├── web-chat-delivery-status.schema.yaml
│   ├── web-chat-accessibility-contract.schema.yaml
│   └── web-chat-audit-event.schema.yaml
└── tasks.md
```

### Source Code (repository root)

```text
packages/web-chat-channel/
├── package.json
├── README.md
├── tsconfig.json
├── jest.config.js
├── eslint.config.js
├── src/
│   ├── accessibility.ts
│   ├── adapter.ts
│   ├── audit.ts
│   ├── capabilities.ts
│   ├── delivery.ts
│   ├── idempotency.ts
│   ├── index.ts
│   ├── links.ts
│   ├── normalize.ts
│   ├── render.ts
│   ├── session.ts
│   ├── types.ts
│   └── __tests__/
│       ├── accessibility.test.ts
│       ├── adapter.test.ts
│       ├── boundary.test.ts
│       ├── delivery.test.ts
│       ├── idempotency.test.ts
│       ├── links.test.ts
│       ├── render.test.ts
│       └── session.test.ts
└── scripts/
    └── f19-staged-dev-run.ts
```

**Structure Decision**: Implement F19 as `@spyglass/web-chat-channel`, a reusable package that consumes `@spyglass/channels-core`. Do not create production `apps/web` routes, Clerk profile/account pages, dashboard UI, or conversational onboarding flow in F19; the package exposes adapter functions and render/accessibility contracts that a later web surface can call.

## Phase 0: Research Output

Research decisions are captured in `.specify/specs/019-web-chat-channel/research.md`.

## Phase 1: Design Output

Design artifacts are captured in:

- `.specify/specs/019-web-chat-channel/data-model.md`
- `.specify/specs/019-web-chat-channel/quickstart.md`
- `.specify/specs/019-web-chat-channel/contracts/web-chat-client-event.schema.yaml`
- `.specify/specs/019-web-chat-channel/contracts/web-chat-render-model.schema.yaml`
- `.specify/specs/019-web-chat-channel/contracts/web-chat-delivery-status.schema.yaml`
- `.specify/specs/019-web-chat-channel/contracts/web-chat-accessibility-contract.schema.yaml`
- `.specify/specs/019-web-chat-channel/contracts/web-chat-audit-event.schema.yaml`

## Phase 2: Implementation Approach

1. Scaffold `packages/web-chat-channel` using the monorepo package pattern.
2. Add bounded Clerk/session, web-chat event, channel-link, render, delivery/status, accessibility, and audit types.
3. Add session binding and channel-link posture interfaces without owning Clerk validation, persistence, or profile/account UI.
4. Add web-chat idempotency keys based on client event id, session id, participant id, thread id, action id, and event kind before any product work.
5. Add inbound normalization/refusal for authenticated text, pending verification/resume, unauthenticated prompt/refusal, expired sessions, wrong participants, disabled/paused/withdrawn links, malformed payloads, unsupported actions, expired actions, wrong-thread submissions, oversized content, and unsafe attachment references.
6. Add outbound render-model creation from approved canonical `ChannelMessage` content with safe text, controls, status models, fallback behavior, stable action identities, and bounded native metadata.
7. Add WCAG 2.2 AA-facing accessibility contract validation for labels, keyboard activation, focus order hints, disabled controls, error/status announcements, and reduced-motion-safe status behavior.
8. Add channel-neutral delivery/status mapping for rendered, displayed, acknowledged, retryable failure, terminal failure, expired, cancelled, refused, unsupported, and duplicate outcomes.
9. Add audit event builders and capability declarations.
10. Add conformance, boundary, duplicate, session, rendering, accessibility, delivery/status, and staged dev-run tests.

## Risk Controls

- Anonymous mutation risk: unauthenticated visitors can receive sign-in/resume prompt posture only; canonical input requires Clerk-authenticated or pending-link posture.
- Dashboard drift risk: unsupported intent list rejects browse/list/analytics/recommended-jobs/direct-negotiation actions in the adapter.
- Privacy leak risk: outbound rendering refuses missing approved projection posture and never accepts raw counterparty or dossier records.
- Prompt-injection risk: inbound text and client-controlled metadata are always classified as untrusted and bounded.
- Adapter bloat risk: product commands are classified but not executed inside the adapter.
- Retry/duplicate risk: duplicate suppression happens before downstream work and uses stable client/session/thread/action identity.
- Accessibility drift risk: render models must pass explicit WCAG-facing contract fixtures before they can be consumed by the web UI.
- Clerk secret risk: public adapter types accept bounded principal/session posture only and never expose Clerk secrets or session tokens.

## Complexity Tracking

No constitutional or structural violations require complexity exceptions.
