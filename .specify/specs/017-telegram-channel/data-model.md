# Data Model: Telegram Channel Adapter

## Telegram Native Update

Bounded input representation of a Telegram Bot API update.

| Field | Description |
|-------|-------------|
| `update_id` | Telegram update identifier. Primary idempotency input. |
| `kind` | Supported normalized update kind: `message`, `edited_message`, `callback_query`, or `unsupported`. |
| `message_ref` | Optional native message reference when the update contains a message-like payload. |
| `sender_ref` | Telegram user reference derived from the update when available. |
| `chat_ref` | Telegram chat reference derived from the update when available. |
| `occurred_at` | Provider event timestamp when available. |
| `text` | Text or command-like content after bounds checks. |
| `attachment_refs` | Bounded references to provider media/file identifiers; raw bytes are out of scope. |
| `metadata` | Bounded provider metadata that is not semantic content. |

## Telegram Channel Link

Injected identity posture for a Telegram sender/chat.

| Field | Description |
|-------|-------------|
| `link_id` | Stable Spyglass channel-link identifier when known. |
| `participant_id` | Stable participant identifier when known. |
| `principal_id` | Authenticated seeker principal when the link is verified. |
| `telegram_account_id` | Bounded Telegram account identifier. |
| `telegram_chat_id` | Bounded Telegram chat identifier. |
| `status` | `verified`, `pending_verification`, `disabled`, or `unknown`. |
| `pending_challenge_id` | Optional pending-link challenge reference. |
| `thread_id` | Spyglass channel-thread identifier associated with the link or pending flow. |

## Telegram Idempotency Record

Adapter-level duplicate-suppression identity.

| Field | Description |
|-------|-------------|
| `idempotency_key` | Canonical key derived from Telegram `update_id` and, when useful, chat/message references. |
| `telegram_update_id` | Native update id. |
| `message_ref` | Optional message reference for diagnostics. |
| `first_seen_at` | First platform receive timestamp. |
| `status` | `accepted`, `duplicate_suppressed`, or `refused`. |
| `message_id` | Canonical channel message id when accepted. |
| `audit_event_id` | Audit event reference for accepted or suppressed state. |

## Telegram Inbound Normalization

Result of processing one Telegram native update.

| Field | Description |
|-------|-------------|
| `result` | `normalized`, `refused`, or `duplicate_suppressed`. |
| `message` | Canonical inbound `ChannelMessage` when normalized. |
| `refusal` | Provider-neutral refusal reason when not normalized. |
| `link` | Channel-link posture used for the decision. |
| `audit_event` | Audit-ready evidence for the decision. |

## Telegram Outbound Render

Result of converting one canonical outbound `ChannelMessage` into a Telegram-sendable payload.

| Field | Description |
|-------|-------------|
| `target` | Telegram chat/account target derived from verified channel link metadata. |
| `payload` | Telegram-sendable payload with bounded text/formatting fields. |
| `source_message` | Canonical outbound message used for rendering. |
| `fallback_used` | Whether approved fallback text replaced richer content. |
| `refusal` | Provider-neutral refusal if rendering cannot proceed safely. |
| `audit_event` | Audit-ready evidence for rendered or refused outcome. |

## Telegram Delivery Result

Provider-neutral delivery record for a Telegram send attempt.

| Field | Description |
|-------|-------------|
| `status` | F16 delivery status: `delivered`, `accepted_for_delivery`, `retryable_failure`, `terminal_failure`, `refused`, `unsupported`, or `provider_rate_limited`. |
| `reason_code` | F16 reason code. |
| `retry_after` | Retry hint when Telegram provides one. |
| `native_ref` | Bounded Telegram message or request reference. |
| `provider_metadata` | Bounded non-secret provider metadata. |
| `audit_event_id` | Audit evidence reference. |

## Telegram Adapter Capability

Telegram-specific capability declaration compatible with F16 channel-core.

| Field | Description |
|-------|-------------|
| `adapter_name` | `telegram-channel`. |
| `adapter_version` | Adapter contract version. |
| `channel_kind` | `telegram`. |
| `content_parts` | Supported content parts: text, command, bounded attachment references, rich-card fallback, and system notice. |
| `max_text_chars` | Maximum accepted/rendered text length. |
| `supports_rich_cards` | True only through Telegram-compatible rendering or approved fallback. |
| `supports_attachments` | Bounded references only; raw download/upload is out of scope for F17. |
| `supports_threads` | Native Telegram chat/message reference support mapped to F16 thread identity. |
| `acknowledgement_mode` | Webhook-compatible acknowledgement posture. |
| `retry_mode` | Platform retry for transient provider failures and provider retry for webhook redelivery. |

## State Transitions

### Inbound Telegram Update

```text
native_update_received
  -> duplicate_suppressed
  -> refused
  -> normalized
  -> accepted_for_agent_flow
```

### Telegram Channel Link

```text
unknown -> pending_verification -> verified -> disabled
```

### Outbound Telegram Message

```text
canonical_message_ready
  -> render_refused
  -> rendered
  -> delivered | accepted_for_delivery | retryable_failure | terminal_failure | provider_rate_limited
```
