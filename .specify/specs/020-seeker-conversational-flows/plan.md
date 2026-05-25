# Implementation Plan: Conversational Onboarding and Seeker Product Flows

**Branch**: `020-seeker-conversational-flows` | **Date**: 2026-05-25 | **Spec**: `.specify/specs/020-seeker-conversational-flows/spec.md`

**Input**: Feature specification from `.specify/specs/020-seeker-conversational-flows/spec.md`

## Summary

F20 adds the channel-agnostic seeker product orchestration layer that turns the F16-F19 canonical channel adapters into the actual conversational seeker experience. The implementation will create a dedicated `@spyglass/seeker-flows` package for onboarding, resume/profile collection, work-jurisdiction attestation, preference and threshold tuning, match notification handling, privacy-filtered dossier review, pause/resume/withdraw controls, aggregate insight reports, demographic consent posture, duplicate suppression, refusal handling, and audit evidence. Telegram, email, and Clerk-authenticated web chat remain thin transports; F20 does not add a seeker dashboard, ticket list, analytics UI, recommended-jobs UI, provider webhook routes, Clerk account pages, or Parley run mutation.

## Technical Context

**Language/Version**: TypeScript on Node.js 24, ESM packages.

**Primary Dependencies**: New `@spyglass/seeker-flows` package; existing `@spyglass/channels-core`, `@spyglass/telegram-channel`, `@spyglass/email-channel`, `@spyglass/web-chat-channel`, `@spyglass/tickets`, `@spyglass/audit-log`, `@spyglass/dossiers`, `@spyglass/privacy-filter`, `@spyglass/policy-gates`, `@spyglass/notifications`, and `@spyglass/shared`; Jest, TypeScript, ESLint, Prettier.

**Storage**: Package-level repository interfaces for seeker product state, channel-link posture, profile drafts, threshold posture, demographic consent/segregated data references, scheduled insight cursors, match notification idempotency, and audit append calls. F20 tests use in-memory fakes. Durable table wiring may use existing package repositories where present, but new database migrations are not part of the planning assumption unless implementation discovers an unavoidable schema gap.

**Testing**: Jest unit and integration-style package tests, schema/contract validation, F16 channel-core fixture interoperability, cross-channel flow fixtures, duplicate/idempotency tests, forbidden-intent tests, TypeScript type checks, linting, and a staged `dev-run:f20` command.

**Target Platform**: Spyglass pnpm/Turborepo monorepo packages running on Linux/Node. Future app routes and schedulers can call the package, but F20 ships the reusable orchestration package and evidence first.

**Project Type**: Package-level product-flow orchestration centered in `packages/seeker-flows`.

**Performance Goals**: Flow classification, duplicate checks, authorization posture checks, prompt selection, and refusal decisions are deterministic local operations before any downstream side effect. Match notification and scheduled insight handling should be idempotent and side-effect once per stable product key.

**Constraints**: No seeker dashboard, ticket list, analytics view, or recommended-jobs UI; no direct employer messaging; no raw counterparty records, hidden run state, transcripts, scoring internals, or unapproved dossier internals in seeker messages; all seeker-supplied content is untrusted and bounded; interactive seeker chat cannot pause or mutate in-flight Parley runs; demographic collection stays disabled unless active consent, counsel-approved UX posture, and jurisdiction posture are all present.

**Scale/Scope**: One orchestration package, contracts, fixtures, tests, staged dev run, and Spec Kit artifacts. Provider routes, Clerk profile/account UI, F21 seeker web surface, production schedulers, production copy approval, legal jurisdiction selection, and operator counsel workflows are out of scope.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | F20 Handling |
|------|--------|--------------|
| I.1 Confidentiality | PASS | Seeker outbound messages require approved seeker projections or approved aggregate data; hidden run state, transcripts, raw dossiers, scoring internals, employer records, and direct counterparty messages are refused. |
| I.2 Integrity | PASS | Every flow transition, prompt, refusal, notification, decision, consent posture, duplicate suppression, and delivery result emits audit-ready evidence and stable correlation. |
| I.3 Availability | PASS | Channel retries, duplicate events, unsupported inputs, closed tickets, paused/withdrawn posture, stale match events, and failed delivery map to structured outcomes rather than orphaning product state. |
| I.4 Privacy | PASS | Onboarding collects only required profile, resume, threshold, preference, and jurisdiction data; demographic data is optional, consented, segregated, and disabled without counsel posture. |
| I.5 AAA | PASS | Product actions require verified principal/channel posture from existing auth and channel-link boundaries before state mutation or outbound product messaging. |
| I.6 Fail-safe Defaults | PASS | Unknown, unauthorized, malformed, stale, missing projection, counsel-disabled, jurisdiction-disabled, or unsupported requests refuse by default. |
| I.A Parley Regulatory Primitives | PASS | Work-jurisdiction attestation and policy-gate posture are required before active matching and dossier-related notifications. |
| II Agent-Native Architecture | PASS | The flow package consumes and emits canonical typed channel messages for seeker-agent/product orchestration. |
| III.1 Human UI | PASS | Conversation is the seeker product surface; no dashboard-like UI is introduced. |
| III.2 Typed Semantics | PASS | Contracts define typed flow events, prompts, state, match notifications, consent, and audit evidence. |
| IV Separation of Concerns | PASS | Channel adapters, product flows, ticket/dossier/policy decisions, Clerk account surfaces, provider routes, and Parley internals remain separate. |
| V.3 Review Process | PASS | Tasks include analyze, code review, security/privacy review, staged verification, roadmap update, and PR follow-through. |

No constitutional violations are planned.

## Project Structure

### Documentation (this feature)

```text
.specify/specs/020-seeker-conversational-flows/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── seeker-conversation-event.schema.yaml
│   ├── seeker-flow-state.schema.yaml
│   ├── seeker-outbound-prompt.schema.yaml
│   ├── match-notification.schema.yaml
│   ├── demographic-consent.schema.yaml
│   └── seeker-flow-audit-event.schema.yaml
└── tasks.md
```

### Source Code (repository root)

```text
packages/seeker-flows/
├── package.json
├── README.md
├── tsconfig.json
├── jest.config.js
├── eslint.config.js
├── src/
│   ├── aggregate-insights.ts
│   ├── audit.ts
│   ├── channels.ts
│   ├── controls.ts
│   ├── demographics.ts
│   ├── dossier-review.ts
│   ├── flows.ts
│   ├── idempotency.ts
│   ├── index.ts
│   ├── match-notifications.ts
│   ├── onboarding.ts
│   ├── policy.ts
│   ├── profile.ts
│   ├── prompts.ts
│   ├── repo.ts
│   ├── thresholds.ts
│   ├── types.ts
│   └── __tests__/
│       ├── aggregate-insights.test.ts
│       ├── audit.test.ts
│       ├── boundary.test.ts
│       ├── controls.test.ts
│       ├── demographics.test.ts
│       ├── dossier-review.test.ts
│       ├── idempotency.test.ts
│       ├── match-notifications.test.ts
│       ├── onboarding.test.ts
│       ├── policy.test.ts
│       ├── profile.test.ts
│       ├── staged-dev-run.test.ts
│       └── thresholds.test.ts
└── scripts/
    └── f20-staged-dev-run.ts
```

**Structure Decision**: Implement F20 as `@spyglass/seeker-flows`, a reusable package that depends on canonical channel contracts and existing domain packages through narrow interfaces. Do not add `apps/web` seeker pages, provider webhooks, Clerk admin/profile UI, dashboard views, or Parley run-control surfaces in F20.

## Phase 0: Research Output

Research decisions are captured in `.specify/specs/020-seeker-conversational-flows/research.md`.

## Phase 1: Design Output

Design artifacts are captured in:

- `.specify/specs/020-seeker-conversational-flows/data-model.md`
- `.specify/specs/020-seeker-conversational-flows/quickstart.md`
- `.specify/specs/020-seeker-conversational-flows/contracts/seeker-conversation-event.schema.yaml`
- `.specify/specs/020-seeker-conversational-flows/contracts/seeker-flow-state.schema.yaml`
- `.specify/specs/020-seeker-conversational-flows/contracts/seeker-outbound-prompt.schema.yaml`
- `.specify/specs/020-seeker-conversational-flows/contracts/match-notification.schema.yaml`
- `.specify/specs/020-seeker-conversational-flows/contracts/demographic-consent.schema.yaml`
- `.specify/specs/020-seeker-conversational-flows/contracts/seeker-flow-audit-event.schema.yaml`

## Phase 2: Implementation Approach

1. Scaffold `packages/seeker-flows` using existing package conventions.
2. Add shared types, repository interfaces, flow result shapes, idempotency keys, channel dispatch types, and audit builders.
3. Add onboarding flow handling for verified channel posture, active/resumed seeker ticket state, resume/profile draft capture, required-field prompting, work-jurisdiction attestation, preference/threshold capture, and duplicate suppression.
4. Add forbidden-intent classification and approved refusal prompts for dashboard-like, hidden-state, direct-counterparty, raw-dossier, transcript, and Parley override requests.
5. Add match notification handling for threshold-cleared events with approved seeker projections and fail-closed handling for stale, closed, unauthorized, duplicate, jurisdiction-blocked, and projection-missing events.
6. Add dossier review handling for supported actions without mutating Parley run internals.
7. Add pause/resume/withdraw controls with authorization, state-transition guardrails, confirmation prompts, and future-action blocking.
8. Add aggregate insight and threshold check-in generation from approved aggregate inputs only.
9. Add demographic consent/decline/withdrawal handling, counsel/jurisdiction disabled posture, segregated data reference writes, and operational profile separation.
10. Add cross-channel fixtures for Telegram, email, and web chat, plus staged `dev-run:f20` evidence.

## Risk Controls

- Dashboard drift risk: unsupported intent handling explicitly refuses dashboard, ticket-list, analytics, recommended-jobs, and browse-all-jobs requests.
- Parley boundary risk: F20 records product intents and follow-up proposals only; it cannot pause or mutate a running Parley negotiation.
- Privacy leak risk: seeker notifications require approved seeker projections or approved aggregate report inputs, never raw match or employer records.
- Demographic misuse risk: collection requires active consent, counsel-approved UX posture, jurisdiction posture, segregated storage reference, and audit evidence; decline never blocks core matching.
- Prompt-injection risk: resume/profile/free text is marked untrusted and bounded before storage or downstream use.
- Duplicate side-effect risk: inbound messages, scheduled prompts, match notifications, and delivery retries use stable idempotency keys before mutation.
- Authorization risk: verified channel-link and participant posture are checked before accepting product actions or sending product messages.
- Scope creep risk: F21 account/profile web surface and production route hosting remain documented out of scope.

## Complexity Tracking

No constitutional or structural violations require complexity exceptions.
