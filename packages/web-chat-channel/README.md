# @spyglass/web-chat-channel

Reusable web-chat channel adapter for F19. The package maps bounded, Clerk-authenticated web-chat client events into F16 `ChannelMessage` envelopes and renders approved outbound messages into safe web-chat render models.

## Scope

- Clerk-authenticated or pending-link inbound normalization.
- Unauthenticated prompt/refusal posture without canonical seeker-agent input.
- Browser retry duplicate suppression.
- Approved outbound render models.
- Channel-neutral delivery/status mapping.
- WCAG 2.2 AA-facing render contract validation.
- Audit-ready events and channel-core conformance fixtures.

## Boundaries

This package does not host web routes, validate Clerk tokens, manage Clerk profiles, persist channel links, run seeker onboarding, execute pause/resume/withdraw actions, expose dashboards, list tickets, show analytics, recommend jobs, control Parley runs, score matches, build dossiers, or evaluate privacy rules. It accepts bounded posture from those owners and fails closed when posture is missing or unsafe.

## Validation

```bash
pnpm --filter @spyglass/web-chat-channel test
pnpm --filter @spyglass/web-chat-channel type-check
pnpm --filter @spyglass/web-chat-channel lint
pnpm --filter @spyglass/web-chat-channel build
pnpm --filter @spyglass/web-chat-channel dev-run:f19
```
