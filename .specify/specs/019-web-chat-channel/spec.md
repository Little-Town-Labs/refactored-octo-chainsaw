# Feature Specification: Web-Chat Channel Adapter

**Feature Branch**: `019-web-chat-channel`

**Created**: 2026-05-23

**Status**: Draft

**Input**: User description: "F19 Web-chat channel adapter / `19-web-chat-channel`: create the Clerk-authenticated first-touch web-chat transport that conforms to the F16 channel-core contract, normalizes seeker web-chat messages into canonical `ChannelMessage` envelopes, renders approved outbound seeker messages for web chat, supports channel-link/session verification, duplicate suppression, delivery/status outcomes, WCAG 2.2 AA-facing interaction contracts, privacy-filtered disclosure boundaries, and audit-ready evidence before the full F20 conversational onboarding and seeker product flows are implemented."

## Clarifications

### Session 2026-05-23

- Q: Is F19 responsible for the full seeker web app and conversational onboarding flow? -> A: No. F19 owns the reusable web-chat adapter and UI contract consumed by the future web surface; full onboarding, seeker dashboard-like flows, and product action execution remain F20 or later.
- Q: Can unauthenticated first-touch web visitors create canonical seeker-agent input? -> A: No. Unauthenticated web visitors may receive a sign-in or resume prompt only; canonical inbound `ChannelMessage` input requires Clerk-authenticated session binding or an explicit pending channel-link verification posture.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Accept Authenticated Web-Chat Input (Priority: P1)

A Clerk-authenticated seeker can send first-touch or returning web-chat messages from the marketing-site web surface and have supported inputs normalized into canonical seeker-channel messages only when the session, participant, and channel-link posture are valid.

**Why this priority**: Web chat is the v0 first-touch channel from the marketing site. It must safely bridge human web interaction into the shared F16 channel contract before F20 uses it for richer onboarding or product flows.

**Independent Test**: Can be tested by submitting representative web-chat client events for authenticated, pending-link, unauthenticated, expired-session, wrong-participant, duplicate, malformed, unsupported-action, and paused-seeker cases, then verifying canonical messages or structured refusals without invoking seeker product state.

**Acceptance Scenarios**:

1. **Given** a Clerk-authenticated seeker with a verified web-chat channel link, **When** the seeker submits supported free text or acknowledgement input, **Then** the adapter produces one valid inbound `ChannelMessage` with participant binding, session binding, thread identity, idempotency key, untrusted content classification, and audit correlation.
2. **Given** a Clerk-authenticated visitor in a pending web-chat channel-link flow, **When** the visitor submits a valid verification or resume response, **Then** the adapter produces a canonical verification-channel message without treating the link as fully verified until the link authority accepts it.
3. **Given** an unauthenticated, expired, disabled, wrong-participant, paused, malformed, over-size, or unsupported web-chat event, **When** the adapter receives it, **Then** it refuses the event with a provider-neutral reason and does not create seeker-agent conversation input.
4. **Given** the browser retries the same message after a network failure, **When** the adapter sees the same client event identity and session/thread context, **Then** duplicate suppression prevents more than one canonical message or downstream action.

---

### User Story 2 - Render Approved Web-Chat Responses (Priority: P2)

Spyglass can render approved outbound messages and delivery/status feedback for the web-chat surface using only channel-safe content that has already passed disclosure and product-flow decisions outside the adapter.

**Why this priority**: Web chat is interactive and visible at first touch, so outbound rendering must preserve privacy-filtered disclosure boundaries, useful status feedback, and accessible interaction states without becoming a product decision layer.

**Independent Test**: Can be tested by rendering canonical outbound messages with approved projection content, system notices, rich-card safe projections, unsupported parts, unavailable disclosure posture, disabled action controls, delivery acknowledgements, retryable failures, and terminal failures.

**Acceptance Scenarios**:

1. **Given** an outbound `ChannelMessage` containing approved projection or system-generated content for a verified web-chat participant, **When** the adapter renders it, **Then** it produces a web-chat render model with bounded text, safe metadata, accessible labels, stable action identities, and audit correlation.
2. **Given** outbound content requires an approved projection but the projection is unavailable or unapproved, **When** the adapter is asked to render it, **Then** rendering is refused before any web-chat model is emitted.
3. **Given** approved rich content cannot be represented safely in web chat for the target context, **When** approved fallback text or disabled-action posture is available, **Then** the adapter degrades to the approved fallback without changing the underlying message intent.
4. **Given** the web surface acknowledges, displays, retries, fails, expires, or cancels a message, **When** the adapter records the result, **Then** it reports a channel-neutral delivery/status outcome with retry posture and bounded native references.

---

### User Story 3 - Preserve Web-Chat Adapter and Accessibility Boundaries (Priority: P3)

A channel maintainer can verify the web-chat adapter conforms to the F16 channel-core interface, enforces the PRD no-dashboard boundary, and provides a WCAG 2.2 AA-facing UI contract without inheriting full seeker onboarding, account management, Parley negotiation control, scoring, dossier construction, or web application routing.

**Why this priority**: The PRD explicitly limits v0 web to Clerk account management and chat first-touch, with no seeker dashboard, ticket list, analytics UI, or recommended-jobs UI. The adapter must make those boundaries testable while providing enough accessible interaction semantics for the web app to consume safely.

**Independent Test**: Can be tested by running web-chat-specific conformance fixtures against the shared channel-core contract and by validating unsupported dashboard intents, prohibited data surfaces, keyboard/focus/status contract requirements, and unsafe action controls are refused or safely downgraded.

**Acceptance Scenarios**:

1. **Given** inbound web-chat text resembles a product command, **When** the adapter normalizes it, **Then** it preserves the canonical intent family without executing the product action inside the adapter.
2. **Given** a web-chat event asks to browse jobs, list tickets, inspect hidden run state, directly message a counterparty, override a Parley run, view analytics, or expose raw dossier internals, **When** the adapter classifies it, **Then** the result is unsupported or safely downgraded without exposing prohibited state.
3. **Given** an outbound render model contains actions, status updates, errors, retries, or disabled controls, **When** accessibility contract fixtures inspect the model, **Then** every interactive element has keyboard, focus, label, disabled, and live-status semantics sufficient for WCAG 2.2 AA implementation by the web surface.
4. **Given** a test attempts to pass raw counterparty records, canonical transcripts, hidden Parley scratch state, unfiltered dossier internals, Clerk secrets, or web session tokens into web-chat rendering, **When** the adapter boundary is exercised, **Then** the public adapter surface provides no valid path for that data.

---

### Edge Cases

- A web visitor is unauthenticated, has an expired Clerk session, has multiple browser tabs, resumes from a stale tab, or switches Clerk accounts mid-thread.
- A Clerk-authenticated principal has no linked seeker participant, has a disabled link, is paused, has withdrawn, or is not authorized for the requested thread.
- The browser retries a message after a timeout, sends the same client message identifier from two tabs, or reconnects after an offline period.
- Client-provided timestamps, locale, user agent, route, referrer, attachment names, and free text contain prompt-injection text, control characters, markup, sentinel-like strings, or malformed Unicode.
- A web-chat input is too long, empty after normalization, contains unsupported attachments, references unknown actions, or submits an action that expired or belongs to another message.
- Outbound content includes approved rich cards, disabled actions, acknowledgement controls, status updates, errors, or fallback text that must remain accessible and privacy-filtered.
- A render request lacks approved disclosure posture, references a closed or unsendable thread, or includes data that belongs to a dashboard, ticket list, analytics view, recommended-jobs UI, or direct Parley control.
- Delivery/status events arrive out of order, repeat after a terminal status, or reference an unknown outbound message.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a web-chat adapter that declares and satisfies the F16 `ChannelAdapter` contract for the `web_chat` channel.
- **FR-002**: System MUST normalize supported Clerk-authenticated web-chat client events into canonical inbound `ChannelMessage` envelopes without exposing browser, Clerk, or route-specific payload fields as semantic content.
- **FR-003**: System MUST require Clerk-authenticated session binding or explicit pending channel-link verification posture before a web-chat event can become seeker-agent conversation input.
- **FR-004**: System MUST refuse unauthenticated, expired-session, unknown-principal, wrong-participant, disabled-link, paused, withdrawn, malformed, over-size, expired-action, wrong-thread, and unsupported web-chat events with provider-neutral reason codes and audit-ready evidence.
- **FR-005**: System MUST derive stable web-chat idempotency keys from bounded client event identity, session identity, participant identity, thread identity, action identity when present, and event kind so browser retries do not create duplicate canonical messages or downstream actions.
- **FR-006**: System MUST classify all client-controlled text, labels, locale, route, referrer, attachment names, and user-agent-adjacent values as untrusted user input and preserve the existing privacy and sentinel-handling posture.
- **FR-007**: System MUST support the v0 web-chat action set needed before F20, including free text, acknowledgement actions, verification or resume responses, pause/resume request intents, bounded attachment references, status acknowledgements, and delivery/status events.
- **FR-008**: System MUST explicitly reject or safely downgrade dashboard-like and direct-negotiation intents, including browse-all-jobs, list-all-match-tickets, analytics-view, recommended-jobs-view, inspect-hidden-run-state, direct-counterparty-message, override-Parley-run, and expose-raw-dossier.
- **FR-009**: System MUST render outbound web-chat models only from canonical outbound `ChannelMessage` envelopes that carry approved projection or system-generated content.
- **FR-010**: System MUST refuse web-chat outbound rendering when approved projection content is unavailable, participant binding is invalid, the target thread is not sendable, the action has expired, or the content cannot be represented safely.
- **FR-011**: System MUST provide safe fallback rendering for approved rich-card or structured content when web-chat-specific controls cannot represent the preferred shape.
- **FR-012**: System MUST report channel-neutral delivery/status outcomes for web-chat render and client status events, including rendered, displayed, acknowledged, retryable failure, terminal failure, expired, cancelled, refused, unsupported, and duplicate.
- **FR-013**: System MUST keep Clerk identifiers, session references, client event IDs, browser metadata, route/referrer hints, and native status metadata bounded and non-semantic in canonical messages and audit events.
- **FR-014**: System MUST emit audit-ready event shapes for web-chat inbound normalization, inbound refusal, duplicate suppression, outbound rendering, delivery/status recording, accessibility contract validation, unsupported-intent refusal, and capability registration.
- **FR-015**: System MUST expose web-chat adapter capability metadata covering supported content parts, maximum text/action limits, pending-link posture, unauthenticated prompt posture, acknowledgement behavior, accessibility contract posture, retry behavior, and delivery/status behavior.
- **FR-016**: System MUST provide web-chat-specific conformance fixtures that can run against the shared F16 channel-core checks.
- **FR-017**: System MUST provide a WCAG 2.2 AA-facing render contract that carries keyboard activation semantics, focus order hints, visible-label requirements, accessible-name requirements, disabled-control posture, error/status announcement posture, and reduced-motion-safe status behavior for the consuming web surface.
- **FR-018**: System MUST keep seeker onboarding execution, account management UI, Clerk-hosted profile editing, threshold tuning, match notification handling, ticket lists, analytics, recommended-jobs views, dossier review execution, demographic opt-in persistence, Parley run control, scoring, dossier construction, web route hosting, and Clerk administration outside the web-chat adapter.
- **FR-019**: System MUST document that web chat is the v0 first-touch Clerk-authenticated channel and that Telegram and email behavior remain in F17 and F18 respectively.

### Key Entities *(include if feature involves data)*

- **Web-Chat Channel Link**: The binding between a Clerk principal or pending session and a Spyglass seeker participant, including verified, pending, disabled, paused, withdrawn, and unknown states.
- **Web-Chat Session Binding**: A bounded representation of the authenticated Clerk session, web-chat thread, and participant posture used for authorization and audit correlation without exposing secrets.
- **Web-Chat Client Event**: A bounded representation of a client-submitted message, action, verification response, acknowledgement, retry, or status event that can be normalized, refused, duplicate-suppressed, or recorded.
- **Web-Chat Render Model**: A channel-safe outbound view model derived from approved canonical messages, including text, controls, labels, status semantics, fallback posture, and bounded native references.
- **Web-Chat Delivery/Status Result**: Channel-neutral result of rendering, displaying, acknowledging, failing, expiring, cancelling, refusing, suppressing, or duplicate-suppressing a web-chat message or action.
- **Web-Chat Adapter Capability**: Declaration of supported content, action controls, maximum lengths, pending-link behavior, unauthenticated prompt behavior, accessibility posture, and retry/status behavior.
- **Web-Chat Audit Event**: Immutable evidence for normalization, refusal, duplicate suppression, outbound rendering, delivery/status result, accessibility contract validation, unsupported-intent refusal, and capability registration.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Web-chat conformance tests validate at least one authenticated inbound text event, one pending-link verification event, one unauthenticated prompt/refusal, one wrong-participant refusal, one expired-action refusal, and one duplicate event.
- **SC-002**: Duplicate-event tests prove repeated client event identities or retried action submissions produce no more than one canonical inbound message or status transition.
- **SC-003**: Outbound tests prove approved web-chat messages render successfully while unavailable or unapproved disclosure content is refused before any render model is emitted.
- **SC-004**: Delivery/status tests cover rendered, displayed, acknowledged, retryable failure, terminal failure, expired, cancelled, refused, unsupported, and duplicate outcomes.
- **SC-005**: Accessibility contract tests cover keyboard activation semantics, focus order hints, accessible-name posture, disabled-control posture, error/status announcements, and reduced-motion-safe status behavior for all interactive render models.
- **SC-006**: Boundary tests prove the web-chat adapter cannot receive raw counterparty records, canonical transcripts, hidden Parley run state, scoring internals, unfiltered dossier internals, Clerk secrets, or web session tokens through its public surface.
- **SC-007**: Unsupported dashboard/direct-negotiation web-chat intents are rejected or safely downgraded in 100% of covered cases.
- **SC-008**: A staged F19 dev run exercises authenticated inbound normalization, pending-link handling, duplicate suppression, outbound rendering, accessibility contract validation, delivery/status reporting, unauthenticated refusal, and unsupported-intent refusal.

## Assumptions

- F16 `@spyglass/channels-core` is complete and provides the canonical `ChannelMessage`, `ChannelAdapter`, delivery outcome, reason-code, capability, audit, and conformance utilities used by F19.
- F19 implements the web-chat transport boundary and render contract only; the full F20 conversational onboarding and seeker product flow remain outside this feature.
- Clerk remains the source of human account identity for web chat and channel-link verification, while the adapter receives bounded principal/session posture and never owns Clerk administration or profile editing.
- Channel-link persistence, session validation decisions, pause/resume authority, and participant authorization are owned by existing or future identity/channel-linking surfaces; the web-chat adapter reports posture but does not become the identity authority.
- The existing privacy filter remains responsible for projection and redaction decisions; the web-chat adapter requires approved outbound posture and treats inbound browser/client text as untrusted.
- The consuming web surface is responsible for actual DOM implementation, route hosting, and Clerk-hosted account pages; F19 provides the adapter package and testable render/accessibility contract.
- Telegram and email adapters remain separate features, F17 and F18.
