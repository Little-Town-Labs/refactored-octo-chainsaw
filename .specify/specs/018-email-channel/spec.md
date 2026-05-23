# Feature Specification: Email Channel Adapter

**Feature Branch**: `018-email-channel`

**Created**: 2026-05-23

**Status**: Draft

**Input**: User description: "F18 Email channel adapter / `18-email-channel`: create the fallback and async-friendly seeker email transport that conforms to the F16 channel-core contract, normalizes inbound parsed email into canonical `ChannelMessage` envelopes, renders approved outbound seeker messages as email, resolves the PRD Open Question #7 inbound parsing and threading model, supports channel-link verification, duplicate suppression, delivery outcomes, unsubscribe/bounce handling, privacy-filtered disclosure boundaries, and audit-ready evidence before the full F20 conversational flows are implemented."

## Clarifications

### Session 2026-05-23

- Q: Which inbound email parsing strategy and threading model resolves PRD Open Question #7 for F18? -> A: Provider-parsed webhook ingestion with Resend as the initial provider path; thread identity is derived from Spyglass-issued reply aliases plus message reference headers, with provider message IDs used only as bounded native metadata and idempotency inputs.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Receive Threaded Seeker Email Replies (Priority: P1)

A seeker can reply to a Spyglass email and have the reply accepted as a canonical seeker-channel message only when the sender, recipient alias, and thread identity match a verified or pending email channel link.

**Why this priority**: Email is the v0 fallback and async-friendly seeker channel. Replies are the main way email enters the product, and they must preserve identity, threading, duplicate suppression, and untrusted-input posture before any F20 conversational flows consume them.

**Independent Test**: Can be tested by submitting representative parsed inbound email events for verified, pending-verification, unknown, duplicate, malformed, spam-flagged, bounce, and wrong-thread senders, then verifying the adapter returns canonical messages or structured refusals without invoking seeker product state.

**Acceptance Scenarios**:

1. **Given** an inbound email reply from a verified channel link with a recognized thread alias and message reference, **When** the adapter receives the parsed event, **Then** it produces one valid inbound `ChannelMessage` with email channel metadata, participant binding, thread identity, idempotency key, untrusted content classification, and audit correlation.
2. **Given** an inbound email from an address in a pending-link flow, **When** the message contains a valid verification response, **Then** the adapter produces a canonical verification-channel message without treating the email address as fully verified until the link flow accepts it.
3. **Given** an inbound email from an unknown, disabled, spoof-risk, spam-flagged, or wrong-thread sender, **When** the adapter receives the event, **Then** it refuses the event with an audit-ready reason and does not create seeker-agent conversation input.
4. **Given** the email provider retries the same inbound webhook or the sender resends the same message identifier, **When** the adapter processes the duplicate, **Then** duplicate suppression prevents more than one canonical message or downstream action.

---

### User Story 2 - Send Approved Email Messages (Priority: P2)

Spyglass can send email messages to a seeker using only approved channel content that has already passed disclosure and product-flow decisions outside the adapter.

**Why this priority**: The PRD defines channel adapters as thin transports. Email delivery must not become a hidden path for raw counterparty data, Parley state, dossier internals, or product decisions.

**Independent Test**: Can be tested by rendering outbound canonical messages with approved projection content, subject/thread metadata, rich-card fallback content, unsupported content parts, unavailable projection posture, unsubscribe posture, and simulated provider delivery responses.

**Acceptance Scenarios**:

1. **Given** an outbound `ChannelMessage` containing approved projection or system-generated content for a verified email participant, **When** the adapter renders it, **Then** it produces a sendable email with stable threading headers, bounded subject text, text-first body content, and audit correlation.
2. **Given** outbound content requires an approved projection but the projection is unavailable or marked unapproved, **When** the adapter is asked to render or send it, **Then** delivery is refused before email rendering.
3. **Given** outbound rich content cannot be represented safely in email for the target context, **When** approved fallback text is available, **Then** the adapter degrades to the approved fallback without changing the underlying message intent.
4. **Given** the email provider accepts, defers, bounces, suppresses, rate-limits, or rejects a send attempt, **When** the adapter records the result, **Then** it reports a provider-neutral delivery outcome with retry posture and bounded native references.

---

### User Story 3 - Preserve Email Adapter Boundaries (Priority: P3)

A channel maintainer can verify the email adapter conforms to the F16 channel-core interface without inheriting seeker onboarding logic, match-ticket state machines, Parley negotiation control, scoring, dossier construction, privacy-filter rule evaluation, or email-provider account administration.

**Why this priority**: Email is a broadly exposed asynchronous channel and will receive quoted text, forwarded content, signatures, attachments, bounces, and adversarial free text. The adapter must prove the boundary is real before F20 uses email for full conversational flows.

**Independent Test**: Can be tested by running email-specific conformance fixtures against the shared channel-core contract and by validating unsupported intents, prohibited data surfaces, bounce/complaint events, and unsafe attachments are refused or safely downgraded.

**Acceptance Scenarios**:

1. **Given** inbound email text resembles a product command, **When** the adapter normalizes it, **Then** it preserves the canonical intent family without executing the product action inside the adapter.
2. **Given** an email asks to browse jobs, inspect hidden run state, directly message a counterparty, override a Parley run, or expose raw dossier internals, **When** the adapter classifies it, **Then** the result is unsupported or safely downgraded without exposing prohibited state.
3. **Given** a test attempts to pass raw counterparty records, canonical transcripts, hidden Parley scratch state, unfiltered dossier internals, or provider account secrets into email rendering, **When** the adapter boundary is exercised, **Then** the public adapter surface provides no valid path for that data.

---

### Edge Cases

- Inbound email is an auto-reply, bounce, complaint, delivery-status notification, forwarded message, mailing-list message, or provider health-check event.
- Inbound email lacks enough sender, recipient, message-id, or thread reference information to derive participant, thread, or idempotency identity.
- A verified seeker sends from an alias, plus-addressed mailbox, forwarded mailbox, or different case/Unicode-normalized variant of the same email address.
- A pending verification code is expired, reused, malformed, or sent from a different email address than the one being linked.
- A provider retries an inbound webhook after the first processing attempt partially completed.
- Email reply content includes quoted history, signatures, hidden HTML, tracking pixels, malformed MIME, suspicious links, prompt-injection text, sentinel-like markers, control characters, or content that resembles hidden instructions.
- Attachments are present, over-size, unsupported, missing provider references, or unsafe to represent as bounded attachment references.
- A seeker is paused, withdrawn, unsubscribed, suppressed, or no longer authorized for the target thread when an email arrives.
- Email cannot render an approved rich outbound message and no approved fallback text is available.
- Provider delivery events arrive out of order, arrive after a prior terminal outcome, or reference an unknown outbound message.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an email adapter that declares and satisfies the F16 `ChannelAdapter` contract for the `email` channel.
- **FR-002**: System MUST normalize supported provider-parsed inbound email webhook events into canonical inbound `ChannelMessage` envelopes without exposing provider-specific payload fields as semantic content.
- **FR-003**: System MUST derive stable email idempotency keys from bounded provider event identity, email message identity, Spyglass reply-alias identity, and thread identity so duplicate inbound events and repeated delivery attempts do not create duplicate canonical messages or downstream actions.
- **FR-004**: System MUST bind inbound email to a verified email channel link or an explicit pending-link verification flow before it becomes seeker-agent conversation input.
- **FR-005**: System MUST refuse inbound email from unknown, disabled, unauthorized, spoof-risk, spam-flagged, malformed, over-size, unsubscribed, suppressed, or wrong-thread senders with provider-neutral reason codes and audit-ready evidence.
- **FR-006**: System MUST classify all inbound email body text, subject text, attachment names, and user-controlled headers as untrusted user input and preserve the untrusted-input posture required by the existing privacy and sentinel-handling rules.
- **FR-007**: System MUST support inbound email content needed for the v0 seeker-channel action set, including free text, reply text, command-like text, verification responses, acknowledgement actions, bounded attachment references, and provider delivery-status events.
- **FR-008**: System MUST explicitly reject or safely downgrade dashboard-like and direct-negotiation intents, including browse-all-jobs, list-all-match-tickets, inspect-hidden-run-state, direct-counterparty-message, override-Parley-run, and expose-raw-dossier.
- **FR-009**: System MUST render outbound email only from canonical outbound `ChannelMessage` envelopes that carry approved projection or system-generated content.
- **FR-010**: System MUST refuse email outbound rendering when approved projection content is unavailable, participant binding is invalid, the target thread is not sendable, the recipient is unsubscribed or suppressed, or the content cannot be represented safely.
- **FR-011**: System MUST provide email fallback rendering for approved rich-card or structured content when email-specific formatting cannot represent the preferred shape.
- **FR-012**: System MUST report provider-neutral delivery outcomes for email sends and provider events, including delivered, accepted-for-delivery, deferred, bounced, complained, suppressed, retryable failure, terminal failure, refused, unsupported, and provider-rate-limited.
- **FR-013**: System MUST keep email native identifiers, provider response references, message reference headers, spam signals, and webhook metadata bounded and non-semantic in canonical messages and audit events.
- **FR-014**: System MUST emit audit-ready event shapes for email inbound normalization, inbound refusal, duplicate suppression, outbound rendering, delivery result recording, bounce/complaint handling, unsubscribe/suppression refusal, and capability registration.
- **FR-015**: System MUST expose email adapter capability metadata covering supported content parts, maximum subject/body lengths, attachment posture, HTML posture, threading posture, unsubscribe posture, acknowledgement behavior, and retry behavior.
- **FR-016**: System MUST provide email-specific conformance fixtures that can run against the shared F16 channel-core checks.
- **FR-017**: System MUST keep seeker onboarding, profile completion, threshold tuning, match notification handling, dossier review, pause/resume/withdraw execution, demographic opt-in persistence, Parley run control, scoring, dossier construction, email-provider domain administration, and provider webhook hosting outside the email adapter.
- **FR-018**: System MUST document that email is the v0 fallback and async-friendly seeker channel and that Telegram and web-chat behavior remain in F17 and F19 respectively.

### Key Entities *(include if feature involves data)*

- **Email Channel Link**: The binding between an email address or verified alias and a Spyglass seeker participant, including verified, pending, disabled, unsubscribed, suppressed, and unknown states.
- **Email Thread**: The canonical conversation thread derived from Spyglass-issued reply aliases and message reference headers, with provider message metadata preserved only as bounded native references.
- **Parsed Inbound Email Event**: A bounded representation of a provider-parsed inbound webhook event, delivery-status notification, bounce, or complaint that can be normalized, refused, duplicate-suppressed, or recorded as a delivery outcome.
- **Email Outbound Request**: A canonical outbound message plus email send target and rendering posture, using only approved projection or system-generated content.
- **Email Delivery Result**: Provider-neutral result of an email send or provider event, including retry posture, reason code, and bounded native reference.
- **Email Adapter Capability**: Declaration of email-supported content, formatting, threading, unsubscribe posture, subject/body limits, attachment posture, and retry behavior.
- **Email Audit Event**: Immutable evidence for normalization, refusal, duplicate suppression, outbound rendering, delivery result, bounce/complaint handling, unsubscribe/suppression refusal, and capability registration.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Email conformance tests validate at least one verified threaded inbound reply, one pending-link verification message, one refused unknown sender, one refused wrong-thread sender, one bounce/complaint event, and one duplicate event.
- **SC-002**: Duplicate-event tests prove repeated provider webhook events or repeated email message identities produce no more than one canonical inbound message or delivery outcome transition.
- **SC-003**: Outbound tests prove approved email messages render successfully while unavailable or unapproved disclosure content is refused before provider send.
- **SC-004**: Delivery tests cover delivered, accepted-for-delivery, deferred, bounced, complained, suppressed, retryable failure, terminal failure, refused, unsupported, and provider-rate-limited outcomes.
- **SC-005**: Boundary tests prove the email adapter cannot receive raw counterparty records, canonical transcripts, hidden Parley run state, scoring internals, unfiltered dossier internals, or provider account secrets through its public surface.
- **SC-006**: Unsupported dashboard/direct-negotiation email intents are rejected or safely downgraded in 100% of covered cases.
- **SC-007**: A staged F18 dev run exercises email inbound normalization, pending-link handling, duplicate suppression, outbound rendering, bounce/complaint delivery reporting, unsubscribe/suppression refusal, and unsupported-intent refusal.

## Assumptions

- F16 `@spyglass/channels-core` is complete and provides the canonical `ChannelMessage`, `ChannelAdapter`, delivery outcome, reason-code, capability, audit, and conformance utilities used by F18.
- F18 implements the email transport boundary only; the full seeker conversational product flow remains F20.
- Channel-link persistence, verification decisions, unsubscribe persistence, and suppression-list authority are owned by existing or future identity/channel-linking surfaces; the email adapter reports posture but does not become the identity authority.
- The existing privacy filter remains responsible for projection and redaction decisions; the email adapter requires approved outbound posture and treats inbound email text as untrusted.
- Resend is the initial provider path for F18 inbound/outbound planning because the PRD already marks Resend likely and current Resend docs support inbound email webhooks; the adapter contract remains provider-neutral so a later Postmark or SES wrapper can map into the same parsed event shape.
- Telegram and web-chat adapters remain separate features, F17 and F19.
