# Quickstart: Email Channel Adapter

## Prerequisites

- Node.js 24 and pnpm 9.
- Branch `018-email-channel`.
- F16 `@spyglass/channels-core` package available locally.
- No real Resend API key, DNS records, or inbound webhook endpoint is required for the package-level staged run; tests use deterministic fixtures and fake provider responses.

## Validation Commands

```bash
pnpm --filter @spyglass/email-channel test
pnpm --filter @spyglass/email-channel type-check
pnpm --filter @spyglass/email-channel lint
pnpm --filter @spyglass/email-channel build
pnpm --filter @spyglass/email-channel dev-run:f18
```

## Staged Dev Run Expectations

The F18 staged dev run should exercise:

1. Verified threaded inbound email reply normalization into one canonical inbound `ChannelMessage`.
2. Pending-link verification email normalization without treating the address as fully verified.
3. Unknown, disabled, unsubscribed, suppressed, spam-flagged, and wrong-thread sender refusal with provider-neutral reason codes.
4. Duplicate provider event suppression using the same native event/message/thread identity.
5. Bounce, complaint, deferred, delivered, suppressed, and provider-rate-limited event mapping to provider-neutral delivery outcomes.
6. Outbound rendering from approved projection or system-generated content.
7. Outbound refusal when approved projection posture is missing or the recipient is not sendable.
8. Approved rich-content fallback to safe text-first email body content.
9. Unsupported dashboard/direct-negotiation intent refusal.

## Manual Review Checklist

- Provider-native payload fields remain bounded metadata and do not become agent-facing semantic content.
- Inbound subject, body, attachment names, and header-derived text are classified as untrusted user input.
- Outbound rendering has no path for raw counterparty records, canonical transcripts, hidden Parley state, scoring internals, provider account secrets, or unfiltered dossier internals.
- Channel-link, unsubscribe, and suppression status are injected through narrow lookup boundaries; the adapter does not become identity or preference persistence.
- Product actions are classified but not executed inside the adapter.
- Thread identity depends on Spyglass reply aliases first, not provider grouping alone.
