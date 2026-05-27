# Research: Product Harness Results Store

## Decision 1: Use a Result Store Interface with Local File Implementation First

**Decision**: Define `ProductResultStore` as the stable persistence interface and deliver `LocalFileProductResultStore` for PTH03.

**Rationale**: The PRD allows a dedicated test-control database or isolated schema, but the roadmap calls for early development support through a local implementation. A local store keeps package tests deterministic and avoids adding deployment secrets before the result contract stabilizes.

**Alternatives considered**:

- **Direct Neon control DB adapter now**: Rejected for PTH03 because it would add schema/migration/secrets scope before evidence contracts are proven.
- **Reports only**: Rejected because CI and Alpha readiness need queryable results, duplicate handling, and future database adapter compatibility.

## Decision 2: Persist Normalized Snapshots Instead of Raw Runner Results Only

**Decision**: Persist a `ProductResultStoreSnapshot` that includes the existing `ScenarioRunResult` plus normalized evidence arrays for seeds, agent invocations, browser artifacts, webhook captures, and observability assertions.

**Rationale**: PTH01/PTH02 results are sufficient for current runs, but later roadmap slices need stable categories. Including empty arrays now gives future features clear extension points without changing store semantics.

**Alternatives considered**:

- **Store only `ScenarioRunResult`**: Rejected because specialized evidence categories would later require incompatible schema changes.
- **Fully normalized relational model in code now**: Rejected because the local file backend benefits from a single snapshot shape, while database normalization can be mapped later.

## Decision 3: Fail Closed on Unsafe Metadata

**Decision**: Validate snapshots before write and reject known credential-bearing URLs, missing artifact fields, missing redaction notes for sensitive synthetic data, and duplicate run id conflicts.

**Rationale**: Stored harness evidence becomes compliance and product readiness evidence. Invalid or unsafe evidence should never be partially written.

**Alternatives considered**:

- **Best-effort redaction at store time**: Rejected because PTH02 already owns database URL redaction and silent mutation can hide upstream failures.
- **Allow partial writes with invalid records skipped**: Rejected because incomplete evidence would make readiness decisions unreliable.

## Decision 4: Query Filters Match Alpha Gate Questions

**Decision**: Support filtering by mode, status, scenario id, environment label, git ref, and time window, returning newest-first results.

**Rationale**: These filters answer the near-term questions: latest gate result, failed gates by scenario, environment-specific failures, and branch/ref-specific runs.

**Alternatives considered**:

- **Free-form predicate API only**: Rejected because future remote adapters need serializable, portable filters.
- **No query API until DB adapter**: Rejected because the local store must be useful in CI and quickstarts.
