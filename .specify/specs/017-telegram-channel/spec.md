# Feature Specification: Telegram Channel Adapter

**Feature Branch**: `017-telegram-channel`

**Created**: 2026-05-23

**Status**: Draft

**Input**: User description: "F17 Telegram channel adapter / `17-telegram-channel`: create the primary seeker Telegram transport that conforms to the F16 channel-core contract, normalizes Telegram inbound updates into canonical `ChannelMessage` envelopes, renders approved outbound seeker messages back to Telegram, supports channel-link verification, duplicate suppression, delivery outcomes, privacy-filtered disclosure boundaries, and audit-ready evidence before the full F20 conversational flows are implemented."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Receive Telegram Seeker Messages (Priority: P1)

A seeker can send a Telegram message to Spyglass and have it accepted as a canonical seeker-channel message only when the Telegram account is verified or actively completing a verification flow.

**Why this priority**: Telegram is the primary v0 seeker conversational channel. Inbound messages are the first point where untrusted channel input enters Spyglass, so identity binding, duplicate handling, and canonical normalization must work before any richer conversation can safely build on it.

**Independent Test**: Can be tested by submitting representative Telegram inbound events for verified, pending-verification, unknown, duplicate, malformed, and oversized senders, then verifying the adapter returns canonical messages or structured refusals without invoking seeker product state.

**Acceptance Scenarios**:

1. **Given** a Telegram message from a verified channel link, **When** the adapter receives the inbound event, **Then** it produces one valid inbound `ChannelMessage` with Telegram channel metadata, participant binding, thread identity, idempotency key, untrusted content classification, and audit correlation.
2. **Given** a Telegram message from an account in a pending-link flow, **When** the message contains a valid verification response, **Then** the adapter produces a canonical verification-channel message without treating the account as fully verified until the link flow accepts it.
3. **Given** a Telegram message from an unknown or disabled account, **When** the adapter receives the event, **Then** it refuses the event with an audit-ready reason and does not create seeker-agent conversation input.
4. **Given** Telegram retries the same inbound event, **When** the adapter processes the duplicate, **Then** duplicate suppression prevents more than one canonical message or downstream action.

---

### User Story 2 - Send Approved Telegram Replies (Priority: P2)

Spyglass can send Telegram messages to a seeker using only approved channel content that has already passed disclosure and product-flow decisions outside the adapter.

**Why this priority**: The PRD defines channel adapters as thin transports. Telegram delivery must not become a hidden path for raw counterparty data, Parley state, dossier internals, or product decisions.

**Independent Test**: Can be tested by rendering outbound canonical messages with approved projection content, rich-card fallback content, unsupported content parts, unavailable projection posture, and simulated provider delivery responses.

**Acceptance Scenarios**:

1. **Given** an outbound `ChannelMessage` containing approved projection content for a verified Telegram participant, **When** the adapter renders it, **Then** it produces a Telegram-sendable message while preserving the canonical semantic content and audit correlation.
2. **Given** outbound content requires an approved projection but the projection is unavailable or marked unapproved, **When** the adapter is asked to send it, **Then** delivery is refused before Telegram rendering.
3. **Given** an outbound rich card cannot be represented by Telegram for the target context, **When** fallback text is available, **Then** the adapter degrades to the approved fallback without changing the underlying message intent.
4. **Given** Telegram accepts, rate-limits, or rejects a send attempt, **When** the adapter records the result, **Then** it reports a provider-neutral delivery outcome with retry posture and bounded native references.

---

### User Story 3 - Preserve Telegram Adapter Boundaries (Priority: P3)

A channel maintainer can verify the Telegram adapter conforms to the F16 channel-core interface without inheriting seeker onboarding logic, match-ticket state machines, Parley negotiation control, scoring, dossier construction, or privacy-filter rule evaluation.

**Why this priority**: Telegram is the first concrete channel and will set the pattern for email and web chat. It must prove the adapter boundary is real before F20 uses it for full conversational flows.

**Independent Test**: Can be tested by running Telegram-specific conformance fixtures against the shared channel-core contract and by validating unsupported intents and prohibited data surfaces are refused or safely downgraded.

**Acceptance Scenarios**:

1. **Given** Telegram inbound text resembles a product command, **When** the adapter normalizes it, **Then** it preserves the canonical intent family without executing the product action inside the adapter.
2. **Given** a Telegram message asks to browse jobs, inspect hidden run state, directly message a counterparty, or override a Parley run, **When** the adapter classifies it, **Then** the result is unsupported or safely downgraded without exposing prohibited state.
3. **Given** a test attempts to pass raw counterparty records, canonical transcripts, hidden Parley scratch state, or unfiltered dossier internals into Telegram rendering, **When** the adapter boundary is exercised, **Then** the public adapter surface provides no valid path for that data.

---

### Edge Cases

- Telegram sends a non-message update, edited message, callback-style action, or unsupported media payload.
- A Telegram event lacks enough sender or chat information to derive participant, thread, or idempotency identity.
- A verified seeker sends messages from multiple Telegram chats or devices close together.
- A pending verification code is expired, reused, malformed, or sent from a different Telegram account than the one being linked.
- Telegram retries an inbound event after the first processing attempt partially completed.
- Telegram accepts an outbound send but later reports a provider-side failure or rate limit.
- A Telegram message exceeds the channel-core text or metadata bounds.
- Inbound free text contains prompt-injection text, sentinel-like markers, control characters, or content that resembles hidden instructions.
- A seeker is paused, withdrawn, or no longer authorized for the target thread when a Telegram message arrives.
- Telegram cannot render an approved rich outbound message and no approved fallback text is available.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a Telegram adapter that declares and satisfies the F16 `ChannelAdapter` contract for the `telegram` channel.
- **FR-002**: System MUST normalize supported Telegram inbound events into canonical inbound `ChannelMessage` envelopes without exposing Telegram-specific payload fields as semantic content.
- **FR-003**: System MUST derive stable Telegram idempotency keys so duplicate inbound events and repeated delivery attempts do not create duplicate canonical messages or downstream actions.
- **FR-004**: System MUST bind inbound Telegram messages to a verified channel link or an explicit pending-link verification flow before they become seeker-agent conversation input.
- **FR-005**: System MUST refuse inbound Telegram events from unknown, disabled, unauthorized, malformed, or over-size senders with provider-neutral reason codes and audit-ready evidence.
- **FR-006**: System MUST classify all Telegram free-text input as untrusted user input and preserve the untrusted-input posture required by the existing privacy and sentinel-handling rules.
- **FR-007**: System MUST support Telegram inbound content needed for the v0 seeker-channel action set, including free text, command-like text, verification responses, acknowledgement actions, and bounded attachment references when the attachment can be represented safely.
- **FR-008**: System MUST explicitly reject or safely downgrade dashboard-like and direct-negotiation intents, including browse-all-jobs, list-all-match-tickets, inspect-hidden-run-state, direct-counterparty-message, and override-Parley-run.
- **FR-009**: System MUST render outbound Telegram messages only from canonical outbound `ChannelMessage` envelopes that carry approved projection or system-generated content.
- **FR-010**: System MUST refuse Telegram outbound rendering when approved projection content is unavailable, participant binding is invalid, the target thread is not sendable, or the content cannot be represented safely.
- **FR-011**: System MUST provide Telegram fallback rendering for approved rich-card or structured content when Telegram-specific formatting cannot represent the preferred shape.
- **FR-012**: System MUST report provider-neutral delivery outcomes for Telegram sends, including delivered, accepted-for-delivery, retryable failure, terminal failure, refused, unsupported, and provider-rate-limited.
- **FR-013**: System MUST keep Telegram native identifiers, provider response references, and update metadata bounded and non-semantic in canonical messages and audit events.
- **FR-014**: System MUST emit audit-ready event shapes for Telegram inbound normalization, inbound refusal, duplicate suppression, outbound rendering, delivery result recording, and capability registration.
- **FR-015**: System MUST expose Telegram adapter capability metadata covering supported content parts, maximum text length, attachment posture, rich formatting posture, acknowledgement behavior, threading posture, and retry behavior.
- **FR-016**: System MUST provide Telegram-specific conformance fixtures that can run against the shared F16 channel-core checks.
- **FR-017**: System MUST keep seeker onboarding, profile completion, threshold tuning, match notification handling, dossier review, pause/resume/withdraw execution, demographic opt-in persistence, Parley run control, scoring, and dossier construction outside the Telegram adapter.
- **FR-018**: System MUST document that Telegram is the primary v0 seeker channel and that email and web-chat behavior remains in F18 and F19 respectively.

### Key Entities *(include if feature involves data)*

- **Telegram Channel Link**: The binding between a Telegram account/chat identity and a Spyglass seeker participant, including verified, pending, disabled, and unknown states.
- **Telegram Inbound Event**: A bounded representation of a Telegram update or message that can be normalized, refused, or duplicate-suppressed.
- **Telegram Outbound Request**: A canonical outbound message plus Telegram send target and rendering posture, using only approved projection or system-generated content.
- **Telegram Delivery Result**: Provider-neutral result of a Telegram send attempt, including retry posture, reason code, and bounded native reference.
- **Telegram Adapter Capability**: Declaration of Telegram-supported content, formatting, acknowledgement, threading, text limits, attachment posture, and retry behavior.
- **Telegram Audit Event**: Immutable evidence for normalization, refusal, duplicate suppression, outbound rendering, delivery result, and capability registration.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Telegram conformance tests validate at least one verified inbound message, one pending-link verification message, one refused unknown sender, and one duplicate event.
- **SC-002**: Duplicate-event tests prove repeated Telegram events with the same native identity produce no more than one canonical inbound message.
- **SC-003**: Outbound tests prove approved Telegram messages render successfully while unavailable or unapproved disclosure content is refused before provider send.
- **SC-004**: Delivery tests cover delivered, accepted-for-delivery, retryable failure, terminal failure, refused, unsupported, and provider-rate-limited outcomes.
- **SC-005**: Boundary tests prove the Telegram adapter cannot receive raw counterparty records, canonical transcripts, hidden Parley run state, scoring internals, or unfiltered dossier internals through its public surface.
- **SC-006**: Unsupported dashboard/direct-negotiation Telegram intents are rejected or safely downgraded in 100% of covered cases.
- **SC-007**: A staged F17 dev run exercises Telegram inbound normalization, pending-link handling, duplicate suppression, outbound rendering, provider-neutral delivery reporting, and unsupported-intent refusal.

## Assumptions

- F16 `@spyglass/channels-core` is complete and provides the canonical `ChannelMessage`, `ChannelAdapter`, delivery outcome, reason-code, capability, audit, and conformance utilities used by F17.
- F17 implements the Telegram transport boundary only; the full seeker conversational product flow remains F20.
- Channel-link persistence and verification decisions are owned by the existing identity/channel-linking surface; the Telegram adapter reports pending or verified posture but does not become the identity authority.
- The existing privacy filter remains responsible for projection and redaction decisions; the Telegram adapter requires approved outbound posture and treats inbound text as untrusted.
- Concrete Telegram library or webhook hosting choices are planning decisions, not specification-level requirements.
- Email and web-chat adapters remain separate features, F18 and F19.
