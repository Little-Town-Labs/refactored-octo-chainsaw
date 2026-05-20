# Research: F11 Candidate Notification Artifact System

## Decision: Notification artifacts are immutable compliance evidence, not channel messages

**Rationale**: Roadmap F11 is Parley primitive 4 and must exist before channel adapters. The durable object should capture what notice obligation was satisfied, against which template/policy version, and when delivery becomes eligible. Actual Telegram/email/web transport belongs to F16-F19.

**Alternatives considered**:

- Direct email/SMS notification records: rejected because it couples F11 to channel delivery and makes later adapters harder to reason about.
- Store only a boolean notice flag: rejected because counsel and auditors need reconstructable content/timing evidence.

## Decision: Template versions are immutable and artifacts pin exact refs

**Rationale**: Candidate notice obligations change by jurisdiction and over time. Existing Spyglass patterns for contracts, rubrics, privacy rulesets, and dossiers all use immutable version evidence. F11 should follow the same pattern.

**Alternatives considered**:

- Mutable templates with latest lookup: rejected because historical notices would become ambiguous.
- Inline full template text in every artifact: rejected for duplication; artifacts store content refs and hashes while template versions store content metadata.

## Decision: Delivery gate evaluates artifact readiness separately from artifact creation

**Rationale**: A notice artifact may exist but not be eligible for delivery until an advance-notice window is satisfied. Keeping gate evidence append-only allows repeated checks without mutating the artifact.

**Alternatives considered**:

- Store readiness only on the artifact row: rejected because it loses historical gate decisions and reason codes.
- Let F08 infer readiness from timestamps: rejected because F11 owns notice compliance semantics.

## Decision: Timing evidence uses injected business-day metadata in F11

**Rationale**: F11 needs to record notice-by and eligible-delivery timestamps but full jurisdiction holiday calendars can evolve later. Injected business-day metadata keeps tests deterministic while preserving the evidence shape for future calendar expansion.

**Alternatives considered**:

- Hard-code NYC-only 10-business-day logic: rejected because F11 must support multiple jurisdictions.
- Defer timing evidence to F08: rejected because notification artifacts must be reviewable independently.

## Decision: Delivery commands are deterministic channel-agnostic intents

**Rationale**: Later channel adapters can consume a stable command with artifact refs, recipient refs, content hashes, windows, and idempotency keys. F11 should not send messages or import channel adapter packages.

**Alternatives considered**:

- Send through email/Telegram directly: rejected because channel transport is out of F11 scope.
- Omit delivery commands until F16: rejected because F11 needs a testable handoff contract for downstream delivery.
