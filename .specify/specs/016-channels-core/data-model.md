# Data Model: Channel Adapter Framework

## Channel

Provider-neutral channel identifier for seeker conversational transport.

| Field | Description |
|-------|-------------|
| `kind` | `telegram`, `email`, `web_chat`, or future `a2a_delegate`. |
| `version` | Contract version understood by the adapter. |
| `display_name` | Human-readable channel label for logs and operator review. |
| `enabled` | Whether this channel can currently accept or send messages. |

## Channel Participant

Identity posture for the human or pending channel account associated with a message.

| Field | Description |
|-------|-------------|
| `participant_id` | Stable Spyglass participant identifier when known. |
| `principal_id` | Authenticated principal identifier when bound. |
| `channel_account_id` | Provider-specific account/link identifier, stored as bounded metadata. |
| `link_status` | `verified`, `pending_verification`, `disabled`, or `unknown`. |
| `role` | `seeker`, `operator`, or `system`; F16 executable flow targets seekers. |

## Channel Thread

Provider-neutral conversation/thread mapping.

| Field | Description |
|-------|-------------|
| `thread_id` | Stable Spyglass channel-thread identifier. |
| `native_thread_ref` | Bounded provider thread reference, when available. |
| `seeker_ticket_id` | Optional seeker-ticket reference when already bound. |
| `match_ticket_id` | Optional match-ticket reference for match notification/review flows. |
| `state` | `open`, `awaiting_verification`, `paused`, `closed`, or `errored`. |

## Channel Message

Canonical inbound or outbound conversation envelope.

| Field | Description |
|-------|-------------|
| `message_id` | Stable canonical message identifier. |
| `direction` | `inbound` or `outbound`. |
| `channel` | Channel descriptor. |
| `participant` | Channel participant descriptor. |
| `thread` | Channel thread descriptor. |
| `idempotency_key` | Deduplication identity derived from native event/message identity. |
| `occurred_at` | Native event or requested-send timestamp. |
| `received_at` | Platform receive timestamp for inbound messages. |
| `content` | Ordered normalized content parts. |
| `intent` | Supported, unsupported, or unknown seeker-channel intent. |
| `disclosure` | Disclosure posture for outbound content or untrusted posture for inbound content. |
| `delivery` | Delivery status when relevant. |
| `audit` | Audit correlation identifiers and source references. |
| `metadata` | Bounded non-semantic provider metadata. |

## Content Part

Normalized message content element.

| Field | Description |
|-------|-------------|
| `kind` | `text`, `command`, `attachment_ref`, `rich_card`, or `system_notice`. |
| `text` | Text content for text-like parts. Always untrusted when inbound. |
| `command` | Canonical command identifier when the message is command-like. |
| `attachment_ref` | Storage or provider reference; raw attachment bytes are out of scope for F16. |
| `rich_card` | Structured outbound display payload that can degrade to text. |
| `classification` | `untrusted_user_input`, `approved_projection`, `system_generated`, or `provider_metadata`. |

## Channel Intent

Canonical action classification for seeker-channel flow.

Allowed v0 intent families:

- `onboarding`
- `resume_profile_update`
- `threshold_tuning`
- `match_notification_ack`
- `dossier_review_response`
- `pause`
- `resume`
- `withdraw`
- `aggregate_insight_ack`
- `demographic_opt_in_response`
- `fallback_free_text`

Explicitly unsupported intent families:

- `browse_all_jobs`
- `list_all_match_tickets`
- `inspect_hidden_run_state`
- `direct_counterparty_message`
- `override_parley_run`
- `analytics_dashboard_request`

## Channel Adapter Capability

Concrete adapter capability declaration.

| Field | Description |
|-------|-------------|
| `adapter_name` | Stable adapter name. |
| `adapter_version` | Semver-like adapter contract version. |
| `channel_kind` | Channel kind served by the adapter. |
| `content_parts` | Supported content part kinds. |
| `max_text_chars` | Maximum text characters accepted per message or part. |
| `supports_rich_cards` | Whether rich cards can render natively. |
| `supports_attachments` | Whether attachment references can render natively. |
| `supports_threads` | Whether native provider threading is available. |
| `acknowledgement_mode` | `sync`, `async`, or `none`. |
| `retry_mode` | `provider_retry`, `platform_retry`, or `manual_review`. |

## Delivery Outcome

Canonical result for outbound render/send and inbound refusal paths.

| Field | Description |
|-------|-------------|
| `status` | `delivered`, `accepted_for_delivery`, `retryable_failure`, `terminal_failure`, `refused`, `unsupported`, or `provider_rate_limited`. |
| `reason_code` | Provider-neutral reason code. |
| `retry_after` | Optional retry-after timestamp or duration when provider supplies one. |
| `native_ref` | Bounded provider delivery/message reference. |
| `audit_event_id` | Audit evidence reference. |

## Channel Audit Event

Audit-ready event shape for channel-core outcomes.

| Field | Description |
|-------|-------------|
| `event_id` | Stable event identifier. |
| `event_type` | `channel.normalized`, `channel.refused`, `channel.duplicate_suppressed`, `channel.outbound_rendered`, `channel.delivery_recorded`, or `channel.capability_registered`. |
| `message_id` | Related canonical message, when available. |
| `channel_kind` | Channel involved. |
| `principal_id` | Attributed principal, when known. |
| `reason_code` | Reason for refusal/failure/unsupported outcome, when relevant. |
| `occurred_at` | Event timestamp. |
| `correlation_id` | Cross-package correlation identifier. |

## State Transitions

### Inbound Message

```text
native_event_received
  -> duplicate_suppressed | refused | normalized
  -> accepted_for_agent_flow
```

### Outbound Message

```text
projection_ready
  -> render_refused | rendered
  -> delivered | accepted_for_delivery | retryable_failure | terminal_failure | provider_rate_limited
```

### Channel Link

```text
unknown -> pending_verification -> verified -> disabled
```
