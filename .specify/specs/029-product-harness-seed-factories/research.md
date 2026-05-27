# Research: Product Harness Seed Factories

## Decision: Deterministic helpers live inside the product harness package

**Rationale**: The seed factories depend on PTH01 scenario identity, PTH02 lifecycle metadata, and PTH03 seed records. Keeping them in `@spyglass/product-test-harness` avoids a second package boundary while the contracts are still stabilizing.

**Alternatives considered**: A separate `@spyglass/product-seeds` package was rejected for PTH04 because it would create package churn before any other consumer exists.

## Decision: Use stable string derivation instead of random identifiers

**Rationale**: Gate scenarios need byte-stable seed output. Deterministic ids derived from seed version, fixture name, scenario id, entity type, and local key are sufficient and avoid new dependencies.

**Alternatives considered**: UUID v4 and wall-clock timestamps were rejected because they are nondeterministic. Database-generated ids were rejected for offline tests and replay.

## Decision: Validate the seed graph before application

**Rationale**: Missing consent, missing jurisdiction posture, missing bias evidence, duplicate ids, and dangling references would produce false confidence in Alpha gates. Validation before application prevents partial or misleading state.

**Alternatives considered**: Letting database constraints catch invalid data was rejected because PTH04 must work offline and because semantic fixture errors need clearer messages than low-level constraint failures.

## Decision: Start with offline application evidence

**Rationale**: The immediate need is deterministic fixture generation and lifecycle/result-store integration. An offline application adapter proves ordering and evidence without requiring Neon credentials in the package test suite.

**Alternatives considered**: Implementing complete live database inserts in PTH04 was rejected as too broad. PTH05 scenarios can add narrow live adapters as they consume each fixture.

## Decision: Include three initial fixtures

**Rationale**: One complete Alpha happy-path fixture and two denial fixtures, missing consent and jurisdiction kill switch, cover the minimum state required by the next Alpha gate slice while proving that denial states are valid when explicit.

**Alternatives considered**: A single happy-path fixture was rejected because it would not exercise consent and jurisdiction posture. A broad persona matrix was deferred to PTH09.
