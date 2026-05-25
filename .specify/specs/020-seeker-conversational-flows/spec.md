# Feature Specification: Conversational Onboarding and Seeker Product Flows

**Feature Branch**: `020-seeker-conversational-flows`

**Created**: 2026-05-25

**Status**: Draft

**Input**: User description: "F20 Conversational onboarding & seeker product flows / `20-seeker-conversational-flows`: implement the seeker product as a conversation across Telegram, email, and Clerk-authenticated web chat. Use the F16-F19 channel adapters to orchestrate onboarding, resume import, conversational profile completion, threshold tuning, match notifications, dossier review, pause/resume/withdraw, aggregate insight reports, work-jurisdiction attestation, and optional demographic opt-in with segregated storage and counsel-gated UX. Preserve the PRD no-dashboard boundary, keep Parley run-to-completion separate from interactive seeker chat, and provide audit-ready evidence."

## Clarifications

### Session 2026-05-25

- Q: Does F20 add a seeker dashboard, ticket list, analytics view, or recommended-jobs UI? -> A: No. F20 is the conversational product layer only; any account-management web surface remains Clerk/profile-owned and dashboard-like views remain prohibited.
- Q: Can F20 pause an in-flight Parley negotiation run to ask the seeker for input? -> A: No. Seeker chat is interactive outside Parley runs; Parley run-to-completion remains intact, and missing run information surfaces through product follow-up proposals or later fresh events.
- Q: How should demographic opt-in ship in F20 given counsel gating? -> A: F20 defines explicit consent, refusal, withdrawal, segregation, and audit semantics, but activation of production copy/jurisdiction-specific consent UX remains counsel-gated before Phase 1 use.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Complete Conversational Seeker Onboarding (Priority: P1)

A seeker can start in any supported channel, authenticate or verify channel ownership, provide resume/profile information conversationally, attest work jurisdiction, set initial preferences and thresholds, and reach an active seeker-ticket posture without using a dashboard.

**Why this priority**: Onboarding is the entry point for the whole seeker product. Without an active seeker ticket and minimal profile/threshold posture, matching and later channel notifications cannot operate safely.

**Independent Test**: Can be tested by sending canonical inbound `ChannelMessage` fixtures from Telegram, email, and web chat through onboarding scenarios for new, returning, incomplete, paused, duplicate, malformed, and unsupported users, then verifying state transitions, prompts, audit events, and refusal outcomes.

**Acceptance Scenarios**:

1. **Given** a verified seeker channel link with no active seeker ticket, **When** the seeker starts onboarding and provides required profile inputs, **Then** the flow opens or resumes one seeker ticket, stores only required profile fields, records work-jurisdiction attestation, and sends the next approved prompt through the same channel.
2. **Given** a seeker provides resume text, a resume file reference, or incremental profile answers, **When** the flow validates the input, **Then** it records bounded untrusted profile material, asks only for missing required fields, and does not expose raw content to employer-side surfaces.
3. **Given** a seeker sets threshold and preference values conversationally, **When** the values pass validation, **Then** the flow records the current preference/threshold posture with audit evidence and confirms the change through the channel.
4. **Given** duplicate channel events or retry submissions arrive during onboarding, **When** the flow processes them, **Then** it is idempotent and does not create duplicate seeker tickets, duplicate profile entries, or duplicate prompts.

---

### User Story 2 - Handle Match Notifications and Dossier Review (Priority: P2)

A seeker receives channel-native notifications when a match clears the configured threshold and can review a privacy-filtered dossier summary, acknowledge, ask bounded follow-up questions, request a threshold adjustment, pause, resume, withdraw, or decline without accessing hidden run state.

**Why this priority**: Match notification and dossier review are the primary product value after onboarding. The seeker must be able to understand and act on results while disclosure, audit, and Parley boundaries remain intact.

**Independent Test**: Can be tested by submitting threshold-cleared, one-side-cleared, neither-cleared, inconclusive, stale, duplicate, and closed-ticket match events, then verifying approved outbound channel messages, dossier-review prompts, action handling, and forbidden-data refusals.

**Acceptance Scenarios**:

1. **Given** a match clears seeker notification policy with an approved seeker projection, **When** the flow receives the event, **Then** it sends an approved channel notification with bounded dossier summary, review actions, correlation, and audit evidence.
2. **Given** a seeker responds to a dossier review prompt, **When** the response is supported, **Then** the flow records the review decision or request intent without mutating Parley run internals.
3. **Given** a seeker asks to inspect raw counterparty data, hidden run state, full transcripts, scoring internals, or direct counterparty messaging, **When** the flow classifies the request, **Then** it refuses or safely redirects using approved explanation text.
4. **Given** a match event is stale, duplicated, closed, unauthorized, missing approved projection, or blocked by jurisdiction policy posture, **When** the flow processes it, **Then** it fails closed with no seeker notification and emits audit-ready evidence.

---

### User Story 3 - Maintain Ongoing Seeker Control and Insight (Priority: P3)

A seeker can use conversation to pause/resume/withdraw, tune thresholds over time, receive aggregate insight reports, and optionally consent to demographic data collection with explicit segregation and withdrawal semantics.

**Why this priority**: Ongoing control is required for trust, human oversight, compliance-as-UX, and retention. Aggregate insights and threshold check-ins keep the conversation useful even when no match clears.

**Independent Test**: Can be tested by running scheduled insight/check-in fixtures, threshold-tuning dialogues, pause/resume/withdraw commands, demographic consent/decline/withdrawal events, and no-match/starvation scenarios across supported channels.

**Acceptance Scenarios**:

1. **Given** an active seeker has no recent threshold-cleared matches, **When** a scheduled insight/check-in window arrives, **Then** the flow sends an approved aggregate report and optional threshold check-in without exposing ticket lists, dashboards, or raw employer records.
2. **Given** a seeker requests pause, resume, or withdraw, **When** the request is authorized and validated, **Then** the flow records the requested state transition, sends confirmation, and prevents unauthorized future product actions.
3. **Given** a seeker chooses to provide, decline, or withdraw demographic data consent, **When** the flow receives the answer, **Then** it records explicit consent posture and audit evidence, stores demographic data only in segregated form when consent is active, and never blocks core matching if the seeker declines.
4. **Given** production demographic consent copy or jurisdiction-specific posture is not counsel-approved, **When** the demographic opt-in flow would activate, **Then** it remains disabled or routes to non-collection explanation posture while preserving the rest of F20.

---

### Edge Cases

- A seeker starts onboarding in one channel and continues in another verified channel.
- A seeker has multiple verified channel links, stale links, paused links, or disabled links.
- A seeker sends malformed resume text, over-size file references, prompt-injection text, unsupported attachments, or contradictory profile answers.
- A seeker attempts to browse jobs, request a ticket list, view analytics, request recommended jobs, inspect hidden match state, or directly message an employer.
- A match notification event arrives after the seeker paused, withdrew, changed threshold, lost channel authorization, or closed the seeker ticket.
- A dossier projection is unavailable, stale, jurisdiction-blocked, unsigned, or not approved for seeker disclosure.
- Scheduled insight reports overlap with onboarding, pause/withdrawal, or active dossier review prompts.
- A demographic consent answer is ambiguous, withdrawn, jurisdiction-disabled, counsel-disabled, duplicated, or submitted from an unauthorized channel.
- Parley produces an inconclusive dossier with flags that suggest missing seeker information.
- Channel delivery fails, retries, or duplicates after a product action was already recorded.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a seeker conversation orchestrator that consumes canonical inbound `ChannelMessage` values from Telegram, email, and web-chat adapters and emits canonical outbound channel messages for those adapters.
- **FR-002**: System MUST open, resume, and advance one seeker ticket per seeker identity through conversational onboarding without creating dashboard, ticket-list, analytics, or recommended-jobs UI surfaces.
- **FR-003**: System MUST support resume import and conversational profile completion from bounded text answers and bounded file references while treating all seeker-supplied content as untrusted input.
- **FR-004**: System MUST collect and audit work-jurisdiction attestation before a seeker becomes active for matching.
- **FR-005**: System MUST support threshold and preference tuning through conversation with validation, confirmation, and audit evidence.
- **FR-006**: System MUST use verified channel-link posture and participant authorization before accepting product actions or sending product messages.
- **FR-007**: System MUST suppress duplicate inbound channel events, duplicate scheduled prompts, and duplicate match notifications so product state and messages are idempotent.
- **FR-008**: System MUST send match notifications only when a policy-authorized match event and approved seeker projection are available.
- **FR-009**: System MUST support dossier review actions through conversation, including acknowledge, decline, request-human-follow-up, request-threshold-change, pause, resume, and withdraw intents.
- **FR-010**: System MUST refuse or safely redirect dashboard-like and prohibited intents, including browse-all-jobs, list-all-match-tickets, analytics-view, recommended-jobs-view, inspect-hidden-run-state, direct-counterparty-message, override-Parley-run, expose-raw-dossier, and expose-transcript.
- **FR-011**: System MUST keep Parley run-to-completion intact; interactive seeker chat cannot pause an in-flight negotiation run or mutate Parley run internals.
- **FR-012**: System MUST transform inconclusive or one-side-cleared outcomes into approved seeker-facing explanation, missing-information, or threshold-check-in prompts without exposing hidden run state.
- **FR-013**: System MUST support pause, resume, and withdraw conversational requests with authorization, state-transition guardrails, confirmation prompts, and audit evidence.
- **FR-014**: System MUST generate aggregate insight reports and threshold check-ins from approved aggregate data only, without exposing employer records, hidden match tickets, or dashboards.
- **FR-015**: System MUST support optional demographic data consent, decline, and withdrawal semantics with explicit audit evidence and no penalty for declining.
- **FR-016**: System MUST store demographic data only in segregated bias-audit-ready form when active consent and counsel-approved UX posture are present.
- **FR-017**: System MUST disable or non-collect demographic opt-in prompts when counsel-approved production copy or jurisdiction posture is unavailable.
- **FR-018**: System MUST emit audit-ready events for onboarding state changes, profile/resume updates, jurisdiction attestations, threshold changes, match notifications, dossier review actions, pause/resume/withdraw transitions, aggregate reports, demographic consent decisions, duplicate suppression, refusals, and channel delivery outcomes.
- **FR-019**: System MUST provide channel-agnostic contract fixtures covering Telegram, email, and web chat for every supported flow family.
- **FR-020**: System MUST document that account management remains Clerk/profile-owned and that F20 does not implement the F21 landing/profile web surface.

### Key Entities *(include if feature involves data)*

- **Seeker Conversation Session**: Channel-agnostic flow context linking a seeker participant, verified channel link, active flow family, current prompt, idempotency posture, and audit correlation.
- **Seeker Ticket Product State**: Conversational projection of seeker-ticket lifecycle, including onboarding, active, paused, in-conversation, hired, withdrawn, and closed posture.
- **Seeker Profile Draft**: Bounded untrusted resume/profile material plus validated structured fields required for matching.
- **Preference and Threshold Posture**: Current seeker preferences and threshold settings, including validation history and audit evidence.
- **Work Jurisdiction Attestation**: Explicit seeker attestation used for policy gating and compliance posture.
- **Match Notification Event**: Product event derived from threshold/policy results and approved seeker projection.
- **Dossier Review Decision**: Seeker response to an approved dossier summary or follow-up prompt.
- **Aggregate Insight Report**: Approved summary of aggregate matching/evaluation activity for a seeker.
- **Demographic Consent Posture**: Consent, decline, withdrawal, counsel-gate, jurisdiction posture, and segregated data reference for optional demographic collection.
- **Seeker Conversation Audit Event**: Immutable evidence for every flow transition, refusal, prompt, action, and delivery result.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Onboarding fixtures across Telegram, email, and web chat open or resume exactly one seeker ticket and reach active posture only after required profile, threshold, and jurisdiction inputs are accepted.
- **SC-002**: Duplicate-event tests prove repeated channel messages, scheduled prompts, and match events produce no duplicate seeker tickets, duplicate product actions, or duplicate outbound prompts.
- **SC-003**: Match notification tests prove notifications are sent only with approved seeker projections and are refused for stale, unauthorized, closed, or projection-missing events.
- **SC-004**: Dossier review tests prove supported review actions are recorded while hidden run state, raw dossiers, transcripts, scoring internals, and direct-counterparty requests are refused in 100% of covered cases.
- **SC-005**: Pause/resume/withdraw tests prove authorized state transitions update product posture and block inappropriate future actions.
- **SC-006**: Aggregate insight tests prove reports contain only approved aggregate counts/scores and never emit dashboards, ticket lists, analytics views, recommended-jobs lists, or raw employer records.
- **SC-007**: Demographic consent tests prove decline and withdrawal are supported, collection is disabled without counsel-approved posture, and consented data writes are segregated from operational profile state.
- **SC-008**: A staged F20 dev run exercises onboarding, resume/profile completion, threshold tuning, match notification, dossier review, pause/resume/withdraw, aggregate insight, demographic consent posture, duplicate suppression, and unsupported-intent refusal.

## Assumptions

- F16-F19 channel packages are complete and provide canonical channel input/output, delivery, duplicate, refusal, and render semantics.
- F20 owns product-flow orchestration and narrow persistence abstractions, not concrete production route hosting for Telegram/email/web-chat providers.
- Existing seeker advocate, employer advocate, Parley, privacy-filter, dossier, ticket, audit, policy-gate, and notification packages remain the source of their domain decisions.
- Clerk remains the human account identity source; F20 consumes verified principal/channel posture and does not implement Clerk-hosted account/profile screens.
- Demographic opt-in production activation requires counsel-approved copy and jurisdiction posture before Phase 1 use; F20 still defines the disabled/non-collection and consent/withdrawal mechanics.
- Work-jurisdiction attestation is required before active matching posture, while Phase 1 jurisdiction set resolution remains a roadmap/legal decision outside this feature.
