# Research: Product Harness Neon Seeds

## Decision: Product lifecycle orchestration lives in `@spyglass/product-test-harness`

**Rationale**: PTH01 established product scenario/result semantics in this package. PTH02 needs to attach branch, migration, seed, and cleanup metadata to the same run result shape. Keeping orchestration here avoids coupling product gate behavior to low-level test utility internals.

**Alternatives considered**:

- Extend `@spyglass/test-harness`: rejected because that package is intentionally low-level and should not own product scenario metadata or Alpha gate behavior.
- Create a new package: rejected because PTH01 already created the product harness package and PTH02 is a direct extension of it.

## Decision: Reuse `@spyglass/test-harness` for Neon branch and migration adapters

**Rationale**: Existing `NeonBranchManager` and `applyMigrations` already encapsulate Neon API and Drizzle migration details. PTH02 should wrap those primitives rather than reimplementing REST calls or migration execution.

**Alternatives considered**:

- Reimplement Neon REST calls in the product package: rejected as duplication and a larger maintenance surface.
- Shell out to Neon CLI and Drizzle CLI: rejected for unit-testability and portability.

## Decision: Dependency injection for lifecycle tests

**Rationale**: Core lifecycle behavior must be testable without Neon credentials or network access. Injecting branch manager, migration runner, seed callback, and scenario callback lets tests verify ordering, failure behavior, cleanup attempts, and redaction offline.

**Alternatives considered**:

- Require live Neon integration tests for PTH02: rejected because developers and CI should be able to validate package behavior without secrets.
- Mock global network calls: rejected because it makes tests brittle and couples them to Neon API details owned by `@spyglass/test-harness`.

## Decision: Store lifecycle data in result metadata for PTH02

**Rationale**: PTH03 owns persistent result-store tables. PTH02 can still make branch lifecycle auditable by attaching safe metadata to PTH01 run results and report output.

**Alternatives considered**:

- Add DB result tables in PTH02: rejected because it overlaps with PTH03.
- Only log lifecycle data: rejected because logs are not durable machine-readable harness evidence.

## Decision: Redact raw database URLs at the product-harness boundary

**Rationale**: Database URLs contain credentials and must never appear in reports, assertions, artifacts, or general metadata. The lifecycle runner should give raw URLs only to explicit callbacks and record redacted metadata everywhere else.

**Alternatives considered**:

- Trust callbacks not to emit URLs: rejected because the harness should enforce safe defaults.
- Omit database metadata entirely: rejected because branch identity and cleanup state are required evidence.

## Decision: Seed lifecycle callback only, not full seed factories

**Rationale**: PTH02 must establish when seeding runs and how seed metadata is recorded. Full deterministic factories for principals, seekers, employers, tickets, consents, rubrics, policies, keys, and webhooks are explicitly PTH04 scope.

**Alternatives considered**:

- Start building product seed factories now: rejected because it would make PTH02 too large and blur roadmap boundaries.
- Defer all seed behavior: rejected because later seed factories need a lifecycle insertion point and metadata contract.
