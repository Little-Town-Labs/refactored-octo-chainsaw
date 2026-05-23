# Quickstart: Telegram Channel Adapter

## Prerequisites

- Node.js 24 and pnpm 9.
- Branch `017-telegram-channel`.
- F16 `@spyglass/channels-core` package available locally.
- No real Telegram bot token is required for the package-level staged run; tests use deterministic fixtures and fake provider responses.

## Validation Commands

```bash
pnpm --filter @spyglass/telegram-channel test
pnpm --filter @spyglass/telegram-channel type-check
pnpm --filter @spyglass/telegram-channel lint
pnpm --filter @spyglass/telegram-channel build
pnpm --filter @spyglass/telegram-channel dev-run:f17
```

## Staged Dev Run Expectations

The F17 staged dev run should exercise:

1. Verified Telegram inbound update normalization into one canonical inbound `ChannelMessage`.
2. Pending-link verification update normalization without treating the link as fully verified.
3. Unknown or disabled sender refusal with provider-neutral reason code.
4. Duplicate Telegram update suppression using the same native update identity.
5. Outbound rendering from approved projection content.
6. Outbound refusal when approved projection posture is missing.
7. Provider-neutral delivery mapping for delivered, retryable failure, terminal failure, and provider-rate-limited responses.
8. Unsupported dashboard/direct-negotiation intent refusal.

## Manual Review Checklist

- Telegram-native payload fields remain bounded metadata and do not become agent-facing semantic content.
- Inbound free text is classified as untrusted user input.
- Outbound rendering has no path for raw counterparty records, canonical transcripts, hidden Parley state, scoring internals, or unfiltered dossier internals.
- Channel-link status is injected through a narrow lookup boundary; the adapter does not become identity persistence.
- Product actions are classified but not executed inside the adapter.
