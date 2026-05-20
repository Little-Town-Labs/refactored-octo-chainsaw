# Research: F08.5 Tool Surface & Dispatcher

## Decision: Tool catalog versions are immutable policy artifacts

**Rationale**: F07a contracts pin `tool_surface_ref` values and Parley runs must be reconstructable. A catalog version therefore needs the same immutability guarantees used by contracts and rubrics: stable ids, versions, content hashes, publication state, deprecation without deletion, and canonical audit refs.

**Alternatives considered**:

- Mutable tool registry keyed by name only: rejected because older contracts would silently gain or lose tools.
- Runtime discovery from adapter modules: rejected because module availability is not reviewable compliance evidence.

## Decision: Descriptors are independently versioned and joined into a surface version

**Rationale**: A surface is the advertised set for a contract, while a descriptor defines one tool's schemas and disclosure policy. Separating them allows a later surface to reuse an unchanged descriptor and lets review reads answer both "what did this contract advertise?" and "what did this tool mean at that version?"

**Alternatives considered**:

- Inline full descriptor bodies into every surface: rejected because it duplicates policy bodies and makes review diffs noisy.
- Surface version as only a tag over current descriptors: rejected because descriptor drift would break historical reconstruction.

## Decision: Dispatcher owns every invocation path

**Rationale**: The dispatcher is where contract availability, principal scope, side, turn limits, schema validation, disclosure routing, unsupported-tool behavior, and audit evidence meet. Any direct adapter, SDK, or tRPC call from side-runner code bypasses at least one of those controls.

**Alternatives considered**:

- Rely on code review to prevent direct calls: rejected because the roadmap requires CI/type-level enforcement.
- Let adapters self-enforce authorization: rejected because each adapter would need to reimplement shared Parley policy.

## Decision: Unsupported calls are structured non-terminal outcomes

**Rationale**: Parley §10.3 requires unsupported tool calls to return `tool_unsupported` and continue the turn. This keeps the runner robust when a model asks for a non-advertised tool, while still preserving evidence for debugging and policy review.

**Alternatives considered**:

- Throw an exception for unsupported calls: rejected because it terminates otherwise recoverable turns.
- Silently ignore unsupported calls: rejected because it loses accountability evidence.

## Decision: Disclosure-class routing is enforced before F09 exists

**Rationale**: F09 owns the privacy filter implementation, but F08.5 owns the first routing decision for tool outputs. `counterparty_filtered` must have a hard boundary now so raw output cannot become counterparty-visible before the filter module lands.

**Alternatives considered**:

- Allow raw counterparty output until F09: rejected because it violates secure-by-default and would normalize a bypass.
- Implement the full F09 privacy filter here: rejected because it expands F08.5 beyond the roadmap slice.

## Decision: CI gate combines type/import boundary checks with fixture tests

**Rationale**: Type-level enforcement in a TypeScript monorepo is most durable when package exports, lint/import rules, and explicit bad-fixture tests all agree. F08.5 should add a small fixture that intentionally attempts direct adapter access and is expected to fail under the guard command.

**Alternatives considered**:

- Runtime-only detection: rejected because bypassing code may ship before it is exercised.
- Broad forbidden-import rules without fixtures: rejected because the gate could drift silently.

## Decision: Initial adapters are fixtures/test doubles

**Rationale**: The goal is the dispatcher surface, not production business tool behavior. Fixture adapters can validate schema, routing, unsupported behavior, failures, timeouts, and audit evidence without coupling this feature to CRM, email, or external service integrations.

**Alternatives considered**:

- Add production business tools in F08.5: rejected because it increases blast radius and hides the dispatcher boundary work.
- No adapters at all: rejected because the dispatcher must be verified end-to-end with a successful supported invocation path.
