# Quickstart: Channel Adapter Framework

## Goal

Validate that F16 provides a stable channel-core contract before concrete Telegram, email, and web-chat adapters are implemented.

## Prerequisites

- Branch: `016-channels-core`
- Active feature pointer: `.specify/feature.json` points to `.specify/specs/016-channels-core`
- Package target: `packages/channels-core`
- Node.js 24 and pnpm 9

## Scenario 1: Canonical Inbound Normalization

1. Build a Telegram-like inbound fixture with native event id, sender id, chat/thread id, text content, and timestamp.
2. Normalize it through the fake adapter conformance helper.
3. Verify the output `ChannelMessage` has:
   - `direction = inbound`
   - `channel.kind = telegram`
   - a non-empty `idempotency_key`
   - `participant.link_status = verified`
   - at least one `content` part classified as `untrusted_user_input`
   - an audit correlation id

Expected result: one canonical message is accepted for downstream seeker-agent flow.

## Scenario 2: Duplicate Suppression

1. Submit the same native event fixture twice with the same native event id and channel account id.
2. Resolve idempotency for both submissions.

Expected result: the first event normalizes successfully; the second produces a `channel.duplicate_suppressed` audit event and no second canonical message.

## Scenario 3: Outbound Approved Projection Rendering

1. Build an outbound match-notification fixture using approved projection content only.
2. Render it through rich-chat, email-threaded, and plain-text fallback capabilities.
3. Verify each rendering preserves the same semantic intent and records channel-specific rendering limits as metadata.

Expected result: all adapters receive only approved projection content; none receive raw counterparty records, canonical transcripts, or hidden Parley run state.

## Scenario 4: Unsupported Dashboard Intent

1. Submit an inbound message requesting "show all jobs and all match tickets."
2. Classify the message intent.

Expected result: the framework returns `unsupported_intent`, emits a refused/unsupported audit-ready event, and exposes no dashboard or hidden match-ticket state.

## Scenario 5: Delivery Outcome Classification

1. Simulate provider responses for delivered, accepted-for-delivery, throttled, retryable outage, terminal rejection, refused, and unsupported.
2. Convert each native response into a `DeliveryOutcome`.

Expected result: every provider response maps to one canonical status and reason code, with retry metadata only on retryable or rate-limited outcomes.

## Staged Dev Run

After implementation, run:

```bash
pnpm --filter @spyglass/channels-core test
pnpm --filter @spyglass/channels-core type-check
pnpm --filter @spyglass/channels-core lint
pnpm --filter @spyglass/channels-core build
pnpm --filter @spyglass/channels-core dev-run:f16
```

Record the command output or a concise evidence summary in this quickstart before closing F16.

## Evidence: 2026-05-22

Package gates:

```text
pnpm --filter @spyglass/channels-core test
Test Suites: 5 passed, 5 total
Tests:       19 passed, 19 total

pnpm --filter @spyglass/channels-core type-check
Exit status: 0

pnpm --filter @spyglass/channels-core lint
Exit status: 0

pnpm --filter @spyglass/channels-core build
Exit status: 0
```

Staged dev run:

```json
{
  "feature": "F16",
  "normalized_message_id": "chanmsg_inbound_telegram_thread-telegram-1_telegram-update-100",
  "outbound_projection_ref": "projection-match-1",
  "conformance_checks": [
    "capability",
    "normalizeInbound",
    "renderOutbound",
    "acknowledgeInbound",
    "reportDelivery"
  ],
  "duplicate_event_id": "chanaudit_duplicate_suppressed_telegram_chanmsg_inbound_telegram_thread-telegram-1_telegram-update-100",
  "delivery_status": "provider_rate_limited",
  "unsupported_intent": "browse_all_jobs"
}
```

Note: the first sandboxed `dev-run:f16` attempt failed because `tsx` could not create its IPC pipe at `/tmp/tsx-1000/*.pipe` under sandbox restrictions. The same command passed when rerun with approved escalation.
