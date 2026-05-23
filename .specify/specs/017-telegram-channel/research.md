# Research: Telegram Channel Adapter

## Decision: Implement F17 as `@spyglass/telegram-channel`

**Rationale**: The PRD names a future `apps/telegram-bot` webhook handler, but F17's spec is the adapter boundary. A dedicated package lets tests exercise Telegram normalization/rendering without forcing deployment routing decisions or creating product orchestration inside the transport.

**Alternatives considered**:
- Build `apps/telegram-bot` first: rejected because route hosting and token deployment are integration concerns, while F17 needs a reusable adapter contract.
- Add Telegram files directly to `@spyglass/channels-core`: rejected because F16 is provider-neutral and should not depend on Telegram-native shapes.

## Decision: Use grammY for Telegram Types and Client Integration

**Rationale**: grammY is a TypeScript/JavaScript Telegram bot framework, runs on Node.js, and tracks current Telegram Bot API support. The adapter can use grammY-native types/client helpers while still exposing only Spyglass canonical contracts to the rest of the platform.

**Sources**:
- grammY overview: https://grammy.dev/guide/
- Telegram Bot API: https://core.telegram.org/bots/api

**Alternatives considered**:
- Telegraf: viable, but grammY's current TypeScript-first documentation and active Bot API alignment are a better fit for this package.
- Raw HTTP only: rejected for implementation ergonomics and Bot API type maintenance, though contracts remain provider-neutral enough to support raw HTTP later.

## Decision: Webhook-Compatible Adapter, No Production Route in F17

**Rationale**: Telegram supports long polling and webhooks, but the PRD's deployment shape names a Telegram webhook handler. F17 should shape code so a webhook route can pass JSON updates into the adapter and receive provider-neutral outcomes. The actual deployed route, token secret wiring, and queue handoff can be introduced after the adapter package is proven.

**Sources**:
- Telegram `setWebhook`: https://core.telegram.org/bots/api#setwebhook
- Telegram `getUpdates`: https://core.telegram.org/bots/api#getupdates

**Alternatives considered**:
- Long polling runner in F17: rejected because it is not the PRD's v0 hosting direction and would complicate deployment.
- Full webhook app in F17: rejected because it combines adapter and hosting slices.

## Decision: Duplicate Suppression Uses Telegram `update_id` First

**Rationale**: Telegram documents `update_id` as useful for ignoring repeated webhook updates and restoring sequence. The adapter must derive idempotency before downstream work so retries cannot create duplicate canonical messages or duplicate product actions.

**Sources**:
- Telegram Update object and `update_id`: https://core.telegram.org/bots/api#update
- Telegram webhook retry behavior: https://core.telegram.org/bots/api#setwebhook

**Alternatives considered**:
- Deduplicate by chat id and message id only: rejected because non-message updates and callback-style actions also have `update_id`.
- Deduplicate after normalization only: rejected because malformed duplicate updates should still be cheap and safe to suppress.

## Decision: Channel-Link Authority Is an Injected Boundary

**Rationale**: The adapter needs verified/pending/disabled/unknown link posture to decide whether a Telegram event can become seeker-agent input. It should not own identity persistence or account-link flows, so implementation will depend on a narrow lookup interface with in-memory test doubles.

**Alternatives considered**:
- Add database tables in F17: rejected because persistence ownership belongs to the identity/channel-linking surface.
- Treat all Telegram senders as pending links: rejected because unknown senders must fail closed unless they are in an explicit link flow.

## Decision: Outbound Rendering Requires Approved Canonical Content

**Rationale**: Constitution I.1 and Parley privacy posture prohibit raw counterparty disclosure outside approved projections. Telegram rendering will accept canonical outbound `ChannelMessage` values with `approved_projection` or system-generated posture and refuse missing/unapproved projection content before provider send.

**Alternatives considered**:
- Let Telegram renderer fetch dossier fields: rejected because adapters must not become disclosure policy surfaces.
- Let product code pass raw text with a display hint: rejected because it weakens auditability and privacy enforcement.

## Decision: Telegram Unsupported Update Kinds Fail Closed

**Rationale**: Telegram updates may include many optional shapes. F17 only needs message-like text, command-like text, verification responses, acknowledgement actions, and bounded attachment references. Unsupported update kinds should return structured refusals rather than leaking provider payloads into product logic.

**Alternatives considered**:
- Pass all updates through as metadata: rejected because it would turn the adapter into a provider-payload tunnel.
- Drop unsupported updates silently: rejected because auditability and operator debugging require explicit refusal evidence.

## Decision: Delivery Mapping Preserves Provider Details as Bounded Metadata

**Rationale**: Telegram send responses and errors include native fields and human-readable descriptions. F17 maps these into F16 delivery statuses and reason codes, preserving only bounded native references and retry hints such as `retry_after` when available.

**Sources**:
- Telegram request/response shape and response parameters: https://core.telegram.org/bots/api#making-requests

**Alternatives considered**:
- Store raw provider responses in canonical outcomes: rejected because raw responses may contain unstable or excessive provider detail.
- Collapse all errors into terminal failure: rejected because throttling and temporary provider errors require retry semantics.
