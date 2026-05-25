# Quickstart: Conversational Onboarding and Seeker Product Flows

## Goal

Verify F20 as a channel-agnostic seeker product orchestration package. The staged run must prove onboarding, resume/profile completion, threshold tuning, match notification, dossier review, pause/resume/withdraw, aggregate insight, demographic consent posture, duplicate suppression, and unsupported-intent refusal across Telegram, email, and web chat fixtures.

## Prerequisites

- Node.js 24 and pnpm 9.
- F16-F19 packages present in the workspace.
- No production provider credentials are required; all F20 evidence uses package fixtures and in-memory repositories.

## Commands

```bash
pnpm install
pnpm --filter @spyglass/seeker-flows test
pnpm --filter @spyglass/seeker-flows type-check
pnpm --filter @spyglass/seeker-flows lint
pnpm --filter @spyglass/seeker-flows dev-run:f20
pnpm type-check
pnpm lint
pnpm test
```

## Scenario 1: Conversational Onboarding

1. Submit Telegram, email, and web-chat canonical inbound fixtures for a verified new seeker.
2. Provide bounded resume/profile inputs, required profile answers, work-jurisdiction attestation, and threshold preferences.
3. Verify exactly one seeker ticket is opened or resumed per seeker identity.
4. Verify active posture is reached only after required profile, threshold, and jurisdiction posture are accepted.
5. Verify duplicate inbound fixtures do not create duplicate tickets, duplicate profile writes, or duplicate prompts.

Expected evidence:
- Product state transitions from onboarding to active.
- Approved outbound prompts per channel.
- Audit events for profile, jurisdiction, threshold, duplicate suppression, and delivery.

## Scenario 2: Match Notification and Dossier Review

1. Submit threshold-cleared match event with approved seeker projection.
2. Verify an approved channel notification is emitted with bounded dossier summary and review actions.
3. Submit acknowledge, decline, request-human-follow-up, request-threshold-change, pause, resume, and withdraw review actions.
4. Submit stale, duplicate, closed-ticket, unauthorized, and projection-missing match events.
5. Submit requests for raw dossiers, hidden run state, transcripts, scoring internals, and direct counterparty messaging.

Expected evidence:
- Notifications only for authorized events with approved seeker projections.
- Review decisions recorded without Parley run mutation.
- Forbidden requests refused with approved explanation text.
- Fail-closed audit evidence for invalid match events.

## Scenario 3: Ongoing Controls, Insights, and Demographics

1. Submit pause, resume, and withdraw commands for authorized and unauthorized posture.
2. Run scheduled aggregate insight/check-in fixtures for active, paused, withdrawn, duplicate, and no-match seekers.
3. Submit demographic consent, decline, withdrawal, duplicate, ambiguous, counsel-disabled, and jurisdiction-disabled answers.
4. Verify demographic collection only occurs when consent, counsel posture, and jurisdiction posture are active.

Expected evidence:
- Authorized controls update product posture and block inappropriate future actions.
- Aggregate insight reports contain only approved aggregate data and no dashboards or raw records.
- Decline and withdrawal never block core matching.
- Consented demographic data is represented only by segregated storage references.

## Exit Criteria

- All package tests pass.
- Staged `dev-run:f20` prints scenario evidence for every supported flow family and all three channels.
- Workspace type-check, lint, and tests remain green or any unrelated existing failures are documented.
- `/speckit-analyze`, code review, and security/privacy review artifacts are added before PR.

## Evidence

Recorded 2026-05-25:

- `pnpm --filter @spyglass/seeker-flows test` — PASS, 14 suites / 40 tests.
- `pnpm --filter @spyglass/seeker-flows type-check` — PASS.
- `pnpm --filter @spyglass/seeker-flows lint` — PASS.
- `pnpm --filter @spyglass/seeker-flows build` — PASS.
- `pnpm --filter @spyglass/seeker-flows dev-run:f20` — PASS after rerun with elevated execution because sandboxed `tsx` IPC failed with `EPERM` under `/tmp/tsx-*`.
- `pnpm type-check` — PASS, 40 Turbo tasks.
- `pnpm lint` — PASS, 24 Turbo tasks.
- `pnpm test` — PASS, 40 Turbo tasks.

Staged `dev-run:f20` output:

```text
f20:onboarding:telegram:onboarding_active
f20:onboarding:email:onboarding_active
f20:onboarding:web-chat:onboarding_active
f20:match:match_notification_sent
f20:review:review_acknowledge
f20:control:control_pause
f20:insight:aggregate_insight_sent
f20:demographics:demographic_consented
f20:refusal:dashboard_intent_refused
```
