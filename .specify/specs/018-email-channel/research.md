# Research: Email Channel Adapter

## Decision: Implement F18 as `@spyglass/email-channel`

**Rationale**: The PRD defines email as a fallback and async-friendly seeker channel, while F18's spec is the adapter boundary. A dedicated package lets tests exercise email normalization, threading, delivery mapping, and rendering without forcing deployment routing, DNS/domain setup, or product orchestration into the transport.

**Alternatives considered**:
- Build a production webhook route first: rejected because route hosting and secret verification are integration concerns, while F18 needs a reusable adapter contract.
- Add email files directly to `@spyglass/channels-core`: rejected because F16 is provider-neutral and should not depend on email-provider native shapes.

## Decision: Resend-First Provider Path With Provider-Neutral Core

**Rationale**: PRD §7.1 already lists Resend as likely for transactional email, and current Resend documentation supports receiving inbound emails via `email.received` webhooks. F18 should map Resend-style parsed inbound events and send responses into Spyglass contracts while keeping the adapter core provider-neutral enough for a later Postmark or SES wrapper.

**Sources**:
- Resend inbound overview: https://resend.com/features/inbound
- Resend receiving docs: https://resend.com/docs/dashboard/receiving/introduction

**Alternatives considered**:
- Postmark as the initial provider: viable and mature for inbound parsing, with explicit inbound webhook and stripped reply fields, but it would add a second email vendor when the PRD already leans Resend.
- SES inbound first: rejected for F18 because SES receiving usually implies more infrastructure choices around receipt rules, S3/SNS/Lambda, and raw MIME parsing than this adapter slice should own.

## Decision: Provider-Parsed Webhook Events Are the Inbound Boundary

**Rationale**: F18 does not need to parse raw SMTP or raw MIME from scratch. The adapter should accept bounded provider-parsed events, classify supported shapes, preserve safe metadata, and refuse malformed or unsupported content before creating canonical `ChannelMessage` values.

**Sources**:
- Resend inbound webhook/event posture: https://resend.com/features/inbound
- Postmark inbound webhook model for comparison: https://postmarkapp.com/developer/webhooks/inbound-webhook

**Alternatives considered**:
- Raw MIME parser in F18: rejected because it broadens scope and makes provider-specific delivery/security concerns part of the adapter.
- Product-level parsing after `ChannelMessage`: rejected because untrusted email shape, duplicate suppression, and thread identity must be decided before downstream product work.

## Decision: Threading Uses Spyglass Reply Aliases Plus Message References

**Rationale**: Email threading has inconsistent client behavior, so Spyglass needs a stable thread identity it controls. The adapter derives canonical thread identity from Spyglass-issued reply aliases and validates message reference headers when present. Provider message ids are retained as bounded native metadata and idempotency inputs, not as the canonical thread authority.

**Alternatives considered**:
- Use provider thread id only: rejected because provider-native grouping can differ by vendor and mailbox behavior.
- Use RFC `Message-ID` and `References` only: rejected because forwarded mail, new-composition replies, and client behavior can omit or alter references.
- Use seeker email address only: rejected because one seeker may participate in multiple threads and tickets.

## Decision: Channel-Link, Suppression, and Unsubscribe Authority Are Injected Boundaries

**Rationale**: The adapter needs verified/pending/disabled/unsubscribed/suppressed posture to decide whether an email can become seeker-agent input or receive outbound mail. It should not own identity persistence, unsubscribe storage, or provider suppression lists, so implementation will depend on narrow lookup interfaces with in-memory test doubles.

**Alternatives considered**:
- Add database tables in F18: rejected because persistence ownership belongs to identity/channel-linking and notification surfaces.
- Treat all matching email addresses as sendable: rejected because unsubscribe and suppression posture must fail closed.

## Decision: Outbound Rendering Requires Approved Canonical Content

**Rationale**: Constitution I.1 and Parley privacy posture prohibit raw counterparty disclosure outside approved projections. Email rendering will accept canonical outbound `ChannelMessage` values with `approved_projection` or system-generated posture and refuse missing/unapproved projection content before provider send.

**Alternatives considered**:
- Let the email renderer fetch dossier fields: rejected because adapters must not become disclosure policy surfaces.
- Let product code pass raw HTML/text with a display hint: rejected because it weakens auditability and privacy enforcement.

## Decision: Delivery Mapping Includes Email-Specific Terminal Signals

**Rationale**: Email delivery has async outcomes beyond chat-style delivered/failed states. F18 maps accepted, delivered, deferred, bounced, complained, suppressed, throttled, retryable failure, and terminal failure into F16 provider-neutral outcomes, preserving only bounded native references and retry hints.

**Alternatives considered**:
- Collapse bounces and complaints into terminal failure only: rejected because operators and later notification policy need distinct reason codes.
- Treat provider accept as delivered: rejected because email acceptance is not recipient delivery.

## Decision: Unsafe Attachments Are References Only or Refused

**Rationale**: Email attachments may contain malware, PII, prompt-injection content, or excessive data. F18 can represent bounded safe attachment references when the provider supplies metadata, but raw bytes, scanning, storage, extraction, and product interpretation remain out of scope.

**Alternatives considered**:
- Download and parse attachments in F18: rejected because it adds security scanning, storage, and content extraction concerns outside the adapter boundary.
- Drop attachments silently: rejected because auditability requires explicit refusal or bounded reference behavior.
