# F16 Quickstart Run Evidence - 2026-05-22

## Commands

| Command | Result |
|---------|--------|
| `pnpm --filter @spyglass/channels-core test` | PASS: 5 test suites, 19 tests |
| `pnpm --filter @spyglass/channels-core type-check` | PASS |
| `pnpm --filter @spyglass/channels-core lint` | PASS |
| `pnpm --filter @spyglass/channels-core build` | PASS |
| `pnpm --filter @spyglass/channels-core dev-run:f16` | PASS |

## Staged Dev-run Evidence

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

## Success Criteria Mapping

- SC-001: Message tests validate inbound/outbound canonical fixtures for Telegram, email, and web chat.
- SC-002: Duplicate suppression dev-run evidence records `channel.duplicate_suppressed` for the repeated Telegram event identity.
- SC-003: Adapter boundary tests verify outbound input exposes approved projection references and no raw counterparty, transcript, or hidden run-state fields.
- SC-004: Delivery tests cover delivered, accepted-for-delivery, retryable failure, terminal failure, refused, unsupported, and provider-rate-limited outcomes.
- SC-005: Capability tests cover rich realtime chat, async threaded email, and plain-text fallback profiles.
- SC-006: Unsupported-intent tests reject dashboard and direct-negotiation intent families.
- SC-007: Dev-run demonstrates normalization, duplicate suppression, delivery outcome reporting, and unsupported-intent refusal.
