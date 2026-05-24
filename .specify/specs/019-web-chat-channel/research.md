# Research: Web-Chat Channel Adapter

## Decision: Package-Level Adapter, Web App as Consumer

**Rationale**: The PRD describes channel adapters as thin transports that translate channel-specific messages into canonical envelopes and back. F19 should therefore create a reusable `@spyglass/web-chat-channel` package and render/accessibility contract, while future `apps/web` work consumes it for routes, Clerk pages, and conversational onboarding.

**Alternatives considered**:

- Implement `apps/web` routes in F19: rejected because it would mix transport adaptation with route hosting and F20 product flow work.
- Put web chat directly in `@spyglass/channels-core`: rejected because F16 intentionally keeps concrete transports out of the shared contract package.

## Decision: Clerk-Authenticated Canonical Input Only

**Rationale**: PRD v0 web surface uses Clerk-hosted signup/login/profile and the constitution forbids anonymous mutating actions. F19 permits unauthenticated prompt posture but requires bounded Clerk-authenticated session binding or pending-link verification posture before producing canonical seeker-agent input.

**Alternatives considered**:

- Anonymous first-touch canonical messages: rejected because they would violate AAA and create identity ambiguity.
- Adapter-owned Clerk validation: rejected because the adapter should consume bounded principal/session posture and leave auth validation to the web/auth integration layer.

## Decision: Render Model with WCAG-Facing Semantics

**Rationale**: F19 must support WCAG 2.2 AA for the human web-chat surface without implementing DOM routes. A typed render model can require accessible names, focus order hints, keyboard activation semantics, disabled-control posture, live status semantics, and reduced-motion-safe status behavior for downstream web UI implementation.

**Alternatives considered**:

- Leave accessibility to `apps/web`: rejected because the adapter would not provide testable evidence for F19’s WCAG scope.
- Implement full React components in the adapter: rejected because it would pull the reusable transport package into UI framework concerns.

## Decision: Browser Retry Idempotency Before Product Work

**Rationale**: Web clients retry after offline periods, timeouts, tab duplication, and reconnects. F19 derives duplicate keys from bounded client event id, session id, participant id, thread id, action id, and event kind before downstream work so repeated messages cannot create duplicate canonical input or status transitions.

**Alternatives considered**:

- Server-generated idempotency only: rejected because client retries need stable identity across transport retries.
- Product-layer duplicate handling only: rejected because adapters should suppress duplicates before product orchestration.

## Decision: No Dashboard or Product Execution Semantics

**Rationale**: PRD v0 explicitly excludes seeker dashboard, ticket list, analytics UI, and recommended jobs UI. F19 classifies dashboard-like/direct-negotiation intents as unsupported or safely downgraded and never executes product actions inside the adapter.

**Alternatives considered**:

- Support limited dashboard commands in web chat: rejected because it conflicts with the PRD no-dashboard boundary.
- Execute pause/resume directly in the adapter: rejected because the adapter can normalize request intents, but authority and state changes belong to product flow layers.
