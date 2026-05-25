# Research: Conversational Onboarding and Seeker Product Flows

## Decision: Implement F20 as `@spyglass/seeker-flows`

**Rationale**: The roadmap places F20 after F16-F19 so channel adapters are ready before product orchestration. A dedicated package keeps the seeker product layer reusable across Telegram, email, and web chat while preserving adapter thinness and avoiding `apps/web` UI drift.

**Alternatives considered**: Adding orchestration to each channel adapter would duplicate state, prompts, idempotency, and audit logic. Adding it directly to `apps/web` would fail Telegram/email parity and blur F20 with F21.

## Decision: Consume canonical channel messages, not provider payloads

**Rationale**: F16 established `ChannelMessage` and adapter conformance; F17-F19 normalize provider-specific details. F20 should operate on canonical inbound/outbound contracts so every flow can be tested once across supported channels.

**Alternatives considered**: Provider-specific handlers were rejected because they would couple product flow semantics to Telegram, email, or browser-specific transport details.

## Decision: Use repository interfaces and in-memory test fakes first

**Rationale**: The existing ticket, dossier, policy, notification, privacy, and audit packages own their domain decisions. F20 needs narrow product-flow persistence abstractions without taking over production schema ownership prematurely.

**Alternatives considered**: Adding database migrations immediately was rejected unless implementation finds a concrete schema gap; direct imports of package internals were rejected because they would make flow tests brittle.

## Decision: Gate every action on verified principal and channel posture

**Rationale**: Constitution Article I.5 requires authentication and authorization for every mutating action. Channel adapters can supply verified link/session posture; F20 must refuse stale, disabled, unauthorized, wrong-participant, or unknown posture before product mutation or outbound messages.

**Alternatives considered**: Trusting prior conversation state without fresh posture was rejected because channel links and sessions can be revoked or disabled.

## Decision: Keep Parley run-to-completion separate

**Rationale**: Parley guidance allows interactive seeker chat outside negotiation runs but prohibits pausing an in-flight run for human input. F20 can collect future information, threshold requests, or follow-up proposals, but it cannot mutate run internals.

**Alternatives considered**: Adding a "wait for seeker" Parley hook was rejected because it violates the run-to-completion harness design.

## Decision: Require approved projections for match notifications

**Rationale**: F10/F11 provide audience-specific projections and notification artifacts. F20 should only send seeker-facing notification content when threshold/policy and approved projection inputs are present.

**Alternatives considered**: Building messages directly from match tickets or raw dossiers was rejected because it risks leaking hidden run state and counterparty-confidential records.

## Decision: Treat aggregate insight reports as approved aggregate inputs

**Rationale**: PRD §4.9 frames aggregate insights and threshold check-ins as compliance-as-UX. F20 can render approved aggregate counts and explanations, but it must not expose ticket lists, analytics dashboards, raw employer records, or hidden match details.

**Alternatives considered**: A dashboard or queryable analytics view was rejected by PRD §3.4 and the F20 clarifications.

## Decision: Ship demographic consent mechanics disabled by default

**Rationale**: F20 must define explicit consent, refusal, withdrawal, segregation, and audit semantics. Production collection still requires counsel-approved copy and jurisdiction posture, so the default implementation should support non-collection explanation and disabled posture.

**Alternatives considered**: Omitting demographic flow semantics would leave the bias-audit-ready obligation underspecified. Enabling production collection by default was rejected because counsel gating is explicit in the roadmap and constitution.

## Decision: Stable idempotency keys precede side effects

**Rationale**: Channel retries, browser retries, email replays, scheduled prompts, and match notification duplicates are expected. Idempotency has to run before ticket creation, profile writes, prompts, notifications, and audit emission that represents product decisions.

**Alternatives considered**: Deduplicating after domain writes was rejected because it still permits duplicate tickets, prompts, or consent records.
