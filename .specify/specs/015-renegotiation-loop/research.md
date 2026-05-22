# Research: Re-negotiation Loop

## Decision: Implement F15 as a Parley package policy gate

**Rationale**: The existing Parley package already owns dispatch requests, trigger events, run allocation, and active-run protection. Keeping F15 in `@spyglass/parley` makes re-negotiation a harness policy rather than a UI, advocate, or ticket-store side effect.

**Alternatives considered**: Implementing in `@spyglass/tickets` would make run isolation harder to prove. Implementing in advocate packages would mix side-specific persuasion logic with platform eligibility controls.

## Decision: Accepted re-negotiation creates a fresh dispatch request

**Rationale**: The spec requires a fresh `run_id` and no state inheritance. The clean boundary is a new `match_ticket.renegotiation_requested` dispatch request with a new correlation/run identifier and incremented attempt metadata for the same match ticket.

**Alternatives considered**: Resuming a prior Parley run or retrying a failed run was rejected because it could preserve prompt history, tool logs, or scratch state.

## Decision: Prior evidence is referenced, not rehydrated

**Rationale**: Prior run identifiers, dossier identifiers, rubric versions, prompt versions, and match-ticket facts are immutable inputs for audit and eligibility. They cannot be used to reconstruct conversational state.

**Alternatives considered**: Copying prior transcript excerpts into the new run was rejected because it would violate isolation and increase disclosure risk.

## Decision: Effective cap is the strictest available cap

**Rationale**: The effective re-negotiation cap is `min(seeker contract cap, employer contract cap, platform default cap of 3)`. This respects both sides' contracts and keeps the platform default as a hard ceiling.

**Alternatives considered**: Using the requester side's cap alone was rejected because it could force the other side into more rounds than contracted. Using the maximum cap was rejected for abuse and cost reasons.

## Decision: Cost ceiling is evaluated before dispatch and during runtime

**Rationale**: Preflight protects against starting known-over-budget runs; runtime observation protects against cost drift while agents are active. Both paths need refusal or termination plus an operator-visible alarm record.

**Alternatives considered**: Only checking cost after dossier production was rejected because it would allow unbounded spending before detection.

## Decision: Duplicate requests resolve idempotently

**Rationale**: Event replay and delivery retry are normal distributed-system behavior. Processing duplicates must return the existing decision or active attempt without creating another run.

**Alternatives considered**: Treating duplicates as independent refusals was rejected because it would obscure the original accepted decision and complicate audit.

## Decision: Non-cleared-side silence is the default

**Rationale**: F15 is an orchestration feature, not a channel feedback feature. Refused or pending requests can create pressure or leak sentiment if mirrored to the non-cleared side.

**Alternatives considered**: Sending automatic counterparty notifications was rejected until later channel features define explicit opt-in semantics.
