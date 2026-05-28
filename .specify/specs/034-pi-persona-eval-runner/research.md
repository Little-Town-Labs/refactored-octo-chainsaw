# Research: Pi Persona Eval Adapter

## Decision: Start with a deterministic Pi-compatible driver

**Rationale**: PTH09 needs stable result-store and evaluator contracts before introducing live Pi sessions, credentials, cost variability, or nondeterministic model output. A synthetic driver can exercise the same interface and persist the required evidence.

**Alternatives considered**:

- Call live Pi services in package tests: rejected because tests must not require credentials, network, or nondeterminism.
- Hard-code eval results without a driver interface: rejected because the roadmap explicitly calls for a `PiAgentDriver` adapter.

## Decision: Persist normalized agent invocation records plus run artifacts

**Rationale**: The result store already supports `agent_invocations`, and run artifacts support `agent_transcript`. Using both preserves summary queryability and transcript/evidence references without expanding the result-store schema.

**Alternatives considered**:

- Add a new persona-specific result-store bucket: rejected because existing agent invocation records are enough for PTH09.
- Store transcripts inline in invocation metadata: rejected because transcript artifacts should remain references and safe excerpts.

## Decision: Treat persona evals as informational eval mode

**Rationale**: The roadmap separates deterministic gates from persona/LLM/Pi evals. PTH09 should produce measurable evidence without blocking Alpha promotion by default.

**Alternatives considered**:

- Make failed persona encounters hard gate failures: rejected until governance defines stable thresholds and live-model variance handling.
