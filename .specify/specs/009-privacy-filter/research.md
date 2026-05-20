# Research: F09 Privacy Filter

## Decision: Privacy filter has no model or gateway dependency

**Rationale**: Constitution I.1 makes the privacy filter non-bypassable. If the filter can call a model, the model can become a disclosure decision-maker and prompt-injection target. F09 must remain deterministic and CI-verifiable.

**Alternatives considered**:

- LLM-assisted redaction: rejected because Parley §15.2 explicitly forbids model invocation in the privacy filter.
- External DLP API: rejected for initial F09 because it adds network reachability and policy opacity.

## Decision: Rulesets are immutable versioned policy artifacts

**Rationale**: Filter decisions and dossier projections must be reconstructable. A projection records the exact `(ruleset_id, version)` and disclosure stage used. Changes publish a new version rather than mutating an active one.

**Alternatives considered**:

- Mutable JSON rules in environment config: rejected because historical projections would drift.
- Hard-coded rules only: rejected because counsel/policy review needs versioned artifacts.

## Decision: Sentinel envelopes are nonce-bound per run and input class

**Rationale**: A malicious untrusted payload must not forge a closing sentinel. Binding sentinels to a per-run nonce and input class makes sentinel mismatches detectable before prompt construction.

**Alternatives considered**:

- Static sentinel strings: rejected because payloads can copy the delimiter.
- Escaping only: rejected because escaping bugs are hard to prove and do not create audit-ready failure evidence.

## Decision: Filtering returns projection refs and summaries, not raw evidence payloads

**Rationale**: Review and compliance need reconstruction metadata without spreading raw sensitive text into more storage surfaces. F09 stores decision metadata, redaction summaries, content hashes/refs, and audit ids by default.

**Alternatives considered**:

- Store raw before/after payloads in filter evidence: rejected because it increases breach blast radius.
- Store only an allow/deny boolean: rejected because compliance review needs reason codes and redaction counts.

## Decision: F08.5 integration is a port, not a package cycle

**Rationale**: F08.5 owns tool dispatch; F09 owns privacy filtering. F09 can implement the `PrivacyFilterPort` shape consumed by tool-dispatcher without requiring tool-dispatcher to import privacy-filter.

**Alternatives considered**:

- Make tool-dispatcher depend on privacy-filter: rejected because it creates tighter coupling and makes F08.5 less standalone.
- Duplicate filtering inside tool-dispatcher: rejected because it creates two privacy policy engines.

## Decision: Boundary guards use explicit fixture failures plus source scanning

**Rationale**: Both no-gateway-reachability and counterparty-access restrictions need a durable CI signal. A scanner plus expected failing fixtures prevents the guard from silently becoming inert.

**Alternatives considered**:

- Code review only: rejected because the roadmap requires CI-gated enforcement.
- Runtime-only checks: rejected because bypassing code can ship before it is exercised.
