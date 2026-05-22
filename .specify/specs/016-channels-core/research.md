# Research: Channel Adapter Framework

## Decision: F16 Defines Contracts, Not Concrete Transports

**Rationale**: The roadmap separates F16 from F17 Telegram, F18 Email, and F19 Web Chat. Keeping F16 as the shared contract avoids provider decisions leaking into core semantics and lets later adapters prove conformance independently.

**Alternatives considered**:
- Implement Telegram first and generalize later: rejected because it would bias the canonical contract toward realtime chat.
- Implement all v0 adapters at once: rejected because it would combine four feature slices and delay the Stage 6 foundation.

## Decision: `ChannelMessage` Is the Stable Semantic Envelope

**Rationale**: PRD §5.3 says all channels conform to a shared `ChannelMessage` interface. The envelope must carry direction, channel, participant, thread, content, intent, idempotency, disclosure, delivery, and audit metadata so downstream seeker-agent flows can ignore provider payload shapes.

**Alternatives considered**:
- Use provider-native payloads through the stack: rejected because it couples product and agent code to transport quirks.
- Define separate inbound and outbound top-level contracts: rejected for F16 because most audit, thread, content, idempotency, and disclosure fields are shared; direction-specific subfields are enough.

## Decision: Adapters Are Thin Transport Boundaries

**Rationale**: PRD §5.3 defines adapters as translators. They should normalize inbound native events, render outbound approved projections, acknowledge events, and report delivery outcomes. They should not own profile state machines, Parley run state, scoring, or dossier construction.

**Alternatives considered**:
- Let adapters call product services directly: rejected because it creates hidden authorization and audit paths.
- Let adapters own per-channel conversation state: rejected because it fragments seeker product behavior before F20.

## Decision: All Free Text Is Untrusted

**Rationale**: Parley adaptation §6 and SPEC §15.1 treat free-text inputs as adversarial even when they arrive through legitimate channels. Channel-core must preserve that classification so downstream prompt construction and privacy filtering can apply sentinels and deterministic rules.

**Alternatives considered**:
- Trust authenticated user messages: rejected because authenticated principals can still send prompt-injection content.
- Sanitize at adapter level only: rejected because provider-specific sanitization is insufficient for agent-facing prompt safety.

## Decision: Outbound Adapters Receive Approved Projections Only

**Rationale**: Constitution I.1 and Parley privacy invariants require cross-side disclosure only through approved projections. Channel-core should make it impossible for adapters to receive raw counterparty records, canonical transcripts, hidden run scratch state, or unfiltered dossier internals through its public interface.

**Alternatives considered**:
- Let adapters ask the dossier package for fields: rejected because adapter code would become a disclosure policy surface.
- Pass raw data plus display hints: rejected because any adapter bug could become a cross-side leakage incident.

## Decision: Delivery Outcomes Are Canonical and Provider-Neutral

**Rationale**: Telegram, email, and web chat expose different delivery semantics. F16 needs a bounded outcome vocabulary so retries, alerts, and audit records can be provider-neutral while preserving native provider details as bounded metadata.

**Alternatives considered**:
- Treat delivery as boolean success/failure: rejected because async email and provider throttling require distinct handling.
- Preserve provider-specific error strings as primary state: rejected because it prevents consistent downstream handling.

## Decision: Email Provider and Threading Details Are Deferred to F18

**Rationale**: PRD Open Question #7 explicitly leaves inbound email parsing and threading unresolved. F16 defines the contract hooks an email adapter must satisfy but does not choose Resend, Postmark, SES, or a threading algorithm.

**Alternatives considered**:
- Pick Resend in F16: rejected because that is an F18 implementation decision.
- Omit email threading from core: rejected because `ChannelMessage` needs a provider-neutral thread identity shape.

## Decision: A2A Is Modeled as Future Smart Channel, Not v0 Execution

**Rationale**: PRD §3.3 says A2A seeker-delegate is v1 and acts as a smart channel, not as a replacement advocate. F16 should leave room for a future `a2a_delegate` channel type but keep it disabled/out of executable v0 adapter scope.

**Alternatives considered**:
- Include A2A as a v0 channel: rejected by PRD scope.
- Ignore A2A completely: rejected because the channel model should not require a breaking change when Mode 1 ships.
