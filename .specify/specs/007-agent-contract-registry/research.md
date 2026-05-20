# Research: F07a Agent Contract Registry

## Package Boundary

**Decision**: Implement F07a in a new `@spyglass/agent-contracts` package with DB schema in `@spyglass/db` and canonical evidence in `@spyglass/audit-log`.

**Rationale**: Agent contracts are durable policy artifacts used by Parley dispatch, transcript evidence, dossiers, and compliance review. A dedicated package mirrors the F06 policy-gates shape and avoids coupling registry policy to the future F08 runner.

**Alternatives considered**: Embedding in `@spyglass/parley` was rejected because F07a must land before the runner and remain independently reviewable. Embedding in `@spyglass/auth` was rejected because contracts are not credentials.

## Immutability Model

**Decision**: Store one row per `(contract_id, version)` in `agent_contract_versions` and reject any attempt to publish a different definition for an existing pair.

**Rationale**: Parley requires `(contract_id, version)` to resolve to one definition for all time. A unique key plus content hash comparison gives deterministic idempotency while preserving mutation rejection.

**Alternatives considered**: Mutable active rows with history were rejected because they make audit reconstruction depend on temporal joins and can accidentally affect in-flight runs.

## Dependency Validation

**Decision**: Validate dependency refs through package-local resolver interfaces at both publish time and dispatch time. F07a stores refs, not prompt/rubric/tool bodies.

**Rationale**: F07b, F08.5, and prompt registry work own their artifact stores. F07a can still fail closed through dependency checkers without inventing those registries.

**Alternatives considered**: Storing prompt or rubric snapshots directly on contract rows was rejected because Parley separates contracts from prompt templates and rubrics.

## Audit Evidence

**Decision**: Successful publish and deprecate operations append canonical F05 audit events using event names `agent_contract.published` and `agent_contract.deprecated`.

**Rationale**: Contract changes are policy release events. F05 already provides the canonical hash-chained evidence spine and evidence export path.

**Alternatives considered**: A separate audit buffer was rejected because it would duplicate F05 and weaken evidence export consistency.

## Runtime Ceilings

**Decision**: Contract runtime settings are resolved against caller-provided dispatch ceilings. Values above ceilings are clamped and returned in the resolution result for later audit.

**Rationale**: Parley allows contracts to contribute runtime bounds but harness configuration remains the operational ceiling. The registry should compute effective settings for dispatch while preserving the original contract definition.

**Alternatives considered**: Rejecting every over-ceiling contract at publish time was rejected because deployment-level ceilings may change without making the historical contract invalid.
