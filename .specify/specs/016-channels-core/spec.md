# Feature Specification: Channel Adapter Framework

**Feature Branch**: `016-channels-core`

**Created**: 2026-05-22

**Status**: Draft

**Input**: User description: "F16 Channel adapter framework / `16-channels-core`: create the shared channel-core contract for seeker conversational transports, including the canonical `ChannelMessage` envelope, adapter boundary, inbound/outbound semantics, privacy-filtered disclosure requirements, delivery outcomes, and testable transport conformance rules before Telegram, email, and web-chat adapters are implemented."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Normalize Channel Messages (Priority: P1)

A seeker-facing transport can convert its native message shape into one canonical channel envelope so downstream seeker-agent and product flows do not depend on Telegram, email, or web-chat-specific payloads.

**Why this priority**: F16 is the foundation for all Stage 6 seeker channels. Telegram, email, and web chat must share one semantic message contract before any individual adapter can be implemented safely.

**Independent Test**: Can be tested by constructing canonical inbound and outbound messages for each v0 channel type and verifying required identity, threading, content, consent, disclosure, and idempotency fields are present and transport-specific details remain isolated as metadata.

**Acceptance Scenarios**:

1. **Given** an inbound seeker message from a supported channel, **When** the adapter normalizes it, **Then** the result is a valid `ChannelMessage` with canonical direction, channel, participant, content, thread, delivery, idempotency, and disclosure metadata.
2. **Given** an outbound platform message to a seeker, **When** it is prepared for a channel adapter, **Then** the adapter receives the same canonical envelope shape regardless of the target channel.
3. **Given** a channel-specific payload contains fields not used by the canonical contract, **When** it is normalized, **Then** those fields are either captured as bounded transport metadata or dropped without becoming part of the agent-facing semantic content.

---

### User Story 2 - Enforce Adapter Boundaries (Priority: P2)

A channel implementer can build Telegram, email, or web-chat transports against a shared adapter interface without bypassing authentication, privacy, audit, or seeker-agent boundaries.

**Why this priority**: PRD §5.3 defines adapters as thin transports. The core framework must prevent channel packages from becoming product-specific logic or hidden access paths to Parley run state.

**Independent Test**: Can be tested by using a fake adapter and conformance checks to prove inbound normalization, outbound rendering, acknowledgement, retry hints, and failure outcomes are exposed through the adapter boundary only.

**Acceptance Scenarios**:

1. **Given** a concrete adapter receives an inbound channel event, **When** it cannot authenticate or bind the sender to a known channel link, **Then** it returns a structured refusal without creating an agent conversation message.
2. **Given** an outbound message requires privacy-filtered content, **When** it is sent through an adapter, **Then** the adapter receives only the already-approved projection and has no interface for raw counterparty or hidden run state.
3. **Given** an adapter cannot deliver a message, **When** it reports the result, **Then** the framework records a retryable, terminal, or refused delivery outcome with a reason code suitable for audit and later channel-specific handling.

---

### User Story 3 - Preserve Conversational Product Semantics (Priority: P3)

The seeker product remains channel-mediated rather than dashboard-mediated: channels can carry onboarding, profile completion, threshold tuning, match notifications, dossier review, and pause/resume/withdraw commands without creating a seeker ticket list or analytics UI.

**Why this priority**: The PRD explicitly says the seeker product is the conversation, not a SaaS dashboard. F16 must encode that product boundary so later channel features do not drift into dashboard semantics.

**Independent Test**: Can be tested by validating that supported message intents cover the v0 seeker channel flow while explicitly excluding browse/apply dashboard actions and direct Parley negotiation controls.

**Acceptance Scenarios**:

1. **Given** a seeker sends a supported conversational command, **When** the message is classified, **Then** the canonical intent maps to an allowed seeker-channel action such as onboarding, profile update, threshold tuning, match review, pause, resume, withdraw, or feedback acknowledgement.
2. **Given** a message attempts to list jobs, browse all tickets, inspect hidden run state, or override Parley negotiation behavior, **When** it is classified, **Then** the framework marks it unsupported or routes it to a safe fallback without exposing prohibited state.
3. **Given** a later adapter adds richer channel formatting, **When** it renders a message, **Then** the core semantic payload remains stable and does not depend on channel-specific UI affordances.

---

### Edge Cases

- Duplicate inbound events arrive from webhook retries or email reprocessing.
- A channel event lacks a verified channel link or maps to a disabled seeker ticket.
- A seeker sends a command while paused, withdrawn, or in an active match conversation state.
- A channel cannot represent a rich outbound card and must degrade to plain text.
- A native channel payload exceeds the allowed size for canonical metadata or text content.
- A message contains untrusted free text that looks like a prompt instruction or sentinel.
- The same human is linked to multiple channels and sends messages in two channels close together.
- An adapter reports an ambiguous provider error that could be retryable or terminal.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST define a canonical `ChannelMessage` envelope for all seeker-facing v0 channels: Telegram, email, and Clerk-authenticated web chat.
- **FR-002**: `ChannelMessage` MUST identify direction, channel, channel account/link, authenticated or pending participant, conversation/thread identity, message identity, idempotency key, timestamps, content parts, intent, delivery posture, and disclosure posture.
- **FR-003**: System MUST define a channel adapter interface for inbound normalization, outbound rendering, acknowledgement, delivery result reporting, capability declaration, and conformance testing.
- **FR-004**: System MUST keep channel adapters thin: adapters translate native channel payloads to and from `ChannelMessage` and MUST NOT own seeker product state machines, Parley negotiation state, scoring logic, or dossier construction.
- **FR-005**: System MUST require inbound messages to be bound to a verified channel link or an explicit pending-link flow before they can become seeker-agent conversation input.
- **FR-006**: System MUST treat all free-text channel input as untrusted and mark it for existing privacy/sentinel handling before it reaches prompt construction or agent-facing flows.
- **FR-007**: System MUST represent outbound content as approved projection content; channel adapters MUST NOT receive raw counterparty records, canonical transcripts, hidden Parley scratch state, or unfiltered dossier internals.
- **FR-008**: System MUST include idempotency semantics so duplicate native channel events do not create duplicate canonical messages or duplicate downstream actions.
- **FR-009**: System MUST define structured delivery outcomes including delivered, accepted-for-delivery, retryable failure, terminal failure, refused, unsupported, and provider-rate-limited.
- **FR-010**: System MUST include reason codes for unsupported intent, unauthenticated channel link, unauthorized participant, malformed payload, over-size payload, privacy projection unavailable, delivery provider unavailable, and provider throttling.
- **FR-011**: System MUST declare channel capabilities separately from message semantics, including supported content parts, max text length, rich-card support, attachment support, threading support, acknowledgement behavior, and retry behavior.
- **FR-012**: System MUST support the v0 seeker-channel action set: onboarding, resume/profile update, threshold tuning, match notification acknowledgement, dossier review response, pause, resume, withdraw, aggregate insight acknowledgement, and demographic opt-in prompt response.
- **FR-013**: System MUST explicitly reject dashboard-like or direct-negotiation actions from the channel-core contract, including browse-all-jobs, list-all-match-tickets, inspect-hidden-run-state, direct-counterparty-message, and override-Parley-run.
- **FR-014**: System MUST expose conformance fixtures that later F17, F18, and F19 adapters can reuse to prove they implement the shared contract.
- **FR-015**: System MUST expose audit-ready event shapes for inbound normalization, inbound refusal, outbound render, delivery result, duplicate suppression, and adapter capability registration.
- **FR-016**: System MUST keep A2A seeker-delegate support out of the v0 executable scope while leaving the channel and participant model capable of adding an A2A smart-channel adapter later.
- **FR-017**: System MUST document email inbound parsing and threading as deferred to F18; F16 defines the core contract hooks and failure modes but does not choose a provider-specific parser.

### Key Entities *(include if feature involves data)*

- **Channel Message**: Canonical inbound or outbound conversation envelope, including direction, channel, participant, thread, content parts, intent, idempotency, disclosure, delivery, and audit metadata.
- **Channel Participant**: The human seeker or pending channel identity associated with a channel account/link and authorization posture.
- **Channel Thread**: The channel-level conversation or provider thread mapped to a Spyglass seeker conversation context.
- **Content Part**: A normalized text, command, attachment reference, rich card, or system notice element inside a channel message.
- **Channel Adapter Capability**: A concrete adapter's supported content, threading, acknowledgement, retry, and formatting constraints.
- **Delivery Outcome**: The result of attempting to render or send an outbound canonical message through a concrete channel.
- **Channel Audit Event**: Immutable evidence of normalization, refusal, delivery, duplicate suppression, and capability registration.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Contract tests validate at least one inbound and one outbound canonical message fixture for Telegram, email, and web chat.
- **SC-002**: Duplicate-event tests prove that two native events with the same idempotency identity produce no more than one canonical message.
- **SC-003**: Boundary tests prove adapters cannot receive raw counterparty records, canonical transcripts, hidden Parley run state, or unfiltered dossier internals through the public channel-core interface.
- **SC-004**: Conformance tests cover every required delivery outcome and reason code defined for F16.
- **SC-005**: Capability tests demonstrate at least three adapter profiles: rich realtime chat, async threaded email, and minimal plain-text fallback.
- **SC-006**: Unsupported dashboard/direct-negotiation intents are rejected or safely downgraded in 100% of test cases.
- **SC-007**: A staged F16 dev run exercises canonical message normalization, duplicate suppression, delivery outcome reporting, and unsupported-intent refusal.

## Assumptions

- `@spyglass/channels-core` already exists as an F01 placeholder and is the implementation target for F16.
- F16 produces shared contracts and conformance utilities only; concrete Telegram, email, and web-chat adapters ship in F17, F18, and F19.
- Seeker channel messages ultimately feed the seeker advocate/product flow, but F16 does not implement the full F20 conversational onboarding workflow.
- Clerk remains the source of human account identity for web chat and channel-link verification.
- The existing privacy filter remains responsible for actual projection/redaction decisions; channel-core records disclosure posture and rejects missing approved projections.
- A2A seeker-delegate is a future smart-channel shape, not part of the v0 customer flow for this feature.
- Email provider and threading strategy remain open until F18, per PRD Open Question #7.
