# Data Model: Email Channel Adapter

## Email Provider Event

Bounded input representation of a provider-parsed email webhook event.

| Field | Description |
|-------|-------------|
| `provider_event_id` | Provider event identifier. Primary webhook retry idempotency input when available. |
| `event_kind` | Supported normalized kind: `inbound_message`, `delivery`, `deferred`, `bounce`, `complaint`, `suppression`, or `unsupported`. |
| `message_id` | Provider or RFC message identifier after bounds checks. |
| `from_ref` | Bounded sender address/name reference. |
| `to_refs` | Bounded recipient references, including reply aliases. |
| `reply_alias` | Spyglass-issued address or plus-address token used to identify the canonical thread. |
| `reference_headers` | Bounded `Message-ID`, `In-Reply-To`, and `References` values when present. |
| `subject` | Bounded subject text. Always untrusted when inbound. |
| `text_body` | Bounded text body or stripped reply text. Always untrusted when inbound. |
| `html_body_ref` | Optional bounded indicator that HTML existed; raw HTML is not semantic content. |
| `attachment_refs` | Bounded provider attachment references; raw bytes are out of scope. |
| `spam_signals` | Bounded provider spam/spoof-risk signals when available. |
| `occurred_at` | Provider event timestamp when available. |
| `metadata` | Bounded provider metadata that is not semantic content. |

## Email Channel Link

Injected identity posture for an email address or alias.

| Field | Description |
|-------|-------------|
| `link_id` | Stable Spyglass channel-link identifier when known. |
| `participant_id` | Stable participant identifier when known. |
| `principal_id` | Authenticated seeker principal when the link is verified. |
| `email_address` | Canonicalized email address or verified alias. |
| `status` | `verified`, `pending_verification`, `disabled`, `unsubscribed`, `suppressed`, or `unknown`. |
| `pending_challenge_id` | Optional pending-link challenge reference. |
| `allowed_thread_ids` | Spyglass channel-thread identifiers this address may use. |

## Email Thread

Provider-neutral conversation/thread mapping.

| Field | Description |
|-------|-------------|
| `thread_id` | Stable Spyglass channel-thread identifier. |
| `reply_alias` | Spyglass-issued alias or plus-address token for replies. |
| `native_thread_ref` | Bounded provider or email header reference when available. |
| `seeker_ticket_id` | Optional seeker-ticket reference when already bound. |
| `match_ticket_id` | Optional match-ticket reference for match notification/review flows. |
| `state` | `open`, `awaiting_verification`, `paused`, `unsubscribed`, `closed`, or `errored`. |

## Email Idempotency Record

Adapter-level duplicate-suppression identity.

| Field | Description |
|-------|-------------|
| `idempotency_key` | Canonical key derived from provider event id, message id, reply alias, and thread id. |
| `provider_event_id` | Native provider event id when present. |
| `message_id` | Native or RFC message id when present. |
| `thread_id` | Canonical Spyglass thread id. |
| `first_seen_at` | First platform receive timestamp. |
| `status` | `accepted`, `duplicate_suppressed`, or `refused`. |
| `message_ref` | Canonical channel message or delivery result reference when accepted. |
| `audit_event_id` | Audit event reference for accepted or suppressed state. |

## Email Inbound Normalization

Result of processing one email provider event.

| Field | Description |
|-------|-------------|
| `result` | `normalized`, `delivery_recorded`, `refused`, or `duplicate_suppressed`. |
| `message` | Canonical inbound `ChannelMessage` when normalized. |
| `delivery_result` | Provider-neutral delivery outcome when event is bounce/complaint/deferred/delivery/suppression. |
| `refusal` | Provider-neutral refusal reason when not normalized. |
| `link` | Channel-link posture used for the decision. |
| `thread` | Thread posture used for the decision. |
| `audit_event` | Audit-ready evidence for the decision. |

## Email Outbound Render

Result of converting one canonical outbound `ChannelMessage` into a sendable email request.

| Field | Description |
|-------|-------------|
| `target` | Email recipient and reply/thread target derived from verified channel link metadata. |
| `subject` | Bounded subject line derived from canonical message context. |
| `text_body` | Text-first body content. |
| `html_body` | Optional minimal HTML representation when approved and safely derived from canonical content. |
| `headers` | Bounded threading headers such as `Message-ID`, `In-Reply-To`, and `References`. |
| `source_message` | Canonical outbound message used for rendering. |
| `fallback_used` | Whether approved fallback text replaced richer content. |
| `refusal` | Provider-neutral refusal if rendering cannot proceed safely. |
| `audit_event` | Audit-ready evidence for rendered or refused outcome. |

## Email Delivery Result

Provider-neutral delivery record for an email send attempt or provider event.

| Field | Description |
|-------|-------------|
| `status` | F16 delivery status: `delivered`, `accepted_for_delivery`, `retryable_failure`, `terminal_failure`, `refused`, `unsupported`, or `provider_rate_limited`. |
| `reason_code` | F16 reason code, extended through email-specific mappings where needed. |
| `retry_after` | Retry hint when provider supplies one. |
| `native_ref` | Bounded provider message, event, or suppression reference. |
| `provider_metadata` | Bounded non-secret provider metadata. |
| `audit_event_id` | Audit evidence reference. |

## Email Adapter Capability

Email-specific capability declaration compatible with F16 channel-core.

| Field | Description |
|-------|-------------|
| `adapter_name` | `email-channel`. |
| `adapter_version` | Adapter contract version. |
| `channel_kind` | `email`. |
| `content_parts` | Supported content parts: text, command-like text, bounded attachment references, rich-card fallback, and system notice. |
| `max_subject_chars` | Maximum accepted/rendered subject length. |
| `max_body_chars` | Maximum accepted/rendered text body length. |
| `supports_html` | True only for minimal safe rendering from approved canonical content. |
| `supports_attachments` | Bounded references only; raw download/upload is out of scope for F18. |
| `supports_threads` | True through Spyglass reply aliases and bounded message reference headers. |
| `unsubscribe_mode` | `required_refusal_boundary` for suppressed/unsubscribed recipients. |
| `acknowledgement_mode` | Webhook-compatible acknowledgement posture. |
| `retry_mode` | Platform retry for transient provider failures and provider retry for webhook redelivery. |

## State Transitions

### Inbound Email Event

```text
provider_event_received
  -> duplicate_suppressed
  -> delivery_recorded
  -> refused
  -> normalized
  -> accepted_for_agent_flow
```

### Email Channel Link

```text
unknown -> pending_verification -> verified -> unsubscribed | suppressed | disabled
```

### Email Thread

```text
awaiting_verification -> open -> paused | unsubscribed | closed | errored
```

### Outbound Email Message

```text
canonical_message_ready
  -> render_refused
  -> rendered
  -> accepted_for_delivery | delivered | retryable_failure | terminal_failure | provider_rate_limited
```
