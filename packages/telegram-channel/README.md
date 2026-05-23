# @spyglass/telegram-channel

**Status:** alpha - F17 Telegram channel adapter.

The concrete Telegram transport adapter for seeker conversations. It consumes
the F16 `@spyglass/channels-core` contract and translates bounded Telegram
updates into canonical `ChannelMessage` values, then renders approved outbound
canonical messages back into Telegram-sendable payloads.

## Public API

F17 exports:

- `createTelegramAdapter`: a `ChannelAdapter` implementation for Telegram.
- Telegram capability metadata for F16 conformance checks.
- Inbound normalization helpers for verified and pending-link updates.
- Outbound rendering helpers for approved projection/system content.
- Idempotency helpers using Telegram update identity.
- Provider-neutral delivery mapping and audit-ready event helpers.

## Boundaries

The adapter does not own seeker onboarding, profile updates, threshold tuning,
match-ticket state, Parley run control, scoring, dossier construction,
privacy-filter rule evaluation, or channel-link persistence. It classifies and
normalizes transport messages only.

Inbound Telegram text is always untrusted. Outbound rendering requires approved
projection or system-generated canonical content and refuses raw counterparty
records, canonical transcripts, hidden Parley state, scoring internals, and
unfiltered dossier internals.

## Commands

```bash
pnpm --filter @spyglass/telegram-channel test
pnpm --filter @spyglass/telegram-channel type-check
pnpm --filter @spyglass/telegram-channel lint
pnpm --filter @spyglass/telegram-channel build
pnpm --filter @spyglass/telegram-channel dev-run:f17
```
