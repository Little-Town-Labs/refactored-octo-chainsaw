# Research: Product Harness Skeleton

## Decision 1: Create a New Product-Level Harness Package

**Decision**: Add `packages/product-test-harness` for scenario contracts, runner, validation, and report generation.

**Rationale**: Existing `packages/test-harness` is deliberately low-level and focused on integration primitives such as Neon branches, migrations, fake clocks, and audit sinks. Product-readiness scenarios need higher-level concepts: scenario identity, mode, steps, assertions, artifacts, summaries, and future adapters.

**Alternatives considered**:

- Extend `packages/test-harness`: rejected because it would mix low-level utilities with product-workflow semantics.
- Put scenarios directly under `tests/product` first: rejected because later scenarios need shared typed contracts and report generation.

## Decision 2: Keep PTH01 External-Service Free

**Decision**: PTH01 will not call Neon, Vercel, Browserbase, Sentry, Pi, live models, or product APIs.

**Rationale**: The first slice must stabilize contracts and runner behavior before adding expensive or nondeterministic systems. This keeps the foundation fast, deterministic, and easy to review.

**Alternatives considered**:

- Start with Neon branch lifecycle: rejected because result contracts should be settled first.
- Start with Playwright: rejected because browser outputs need artifact and assertion contracts first.

## Decision 3: Generate Both JSON and Markdown Reports

**Decision**: Every sample run emits machine-readable JSON and human-readable Markdown.

**Rationale**: CI, future dashboards, and persistent result storage need stable structured output. Product, engineering, and compliance reviewers need readable summaries that do not require parsing logs.

**Alternatives considered**:

- JSON only: rejected because Alpha-readiness evidence must be readable by non-engineering reviewers.
- Markdown only: rejected because future persistence and trend reporting need structured records.

## Decision 4: Stable Result Model Before Persistence

**Decision**: PTH01 defines a complete run-result model but writes only local reports. Database persistence is deferred to PTH03.

**Rationale**: A storage-backed result model should not be designed before sample runs prove the shape. PTH03 can map the stable PTH01 result model to tables without changing callers.

**Alternatives considered**:

- Create result tables immediately: rejected because storage decisions are still open in the harness roadmap.
- Store loosely structured blobs only: rejected because assertions, steps, artifacts, and evidence refs need queryable identities later.

## Decision 5: Fail Closed on Invalid Scenario Evidence

**Decision**: Invalid scenario definitions, invalid artifact refs, thrown step errors, or failed assertions must not produce a passing result.

**Rationale**: The harness exists to support Alpha readiness. Misleading pass reports would violate fail-safe defaults and undermine reviewer trust.

**Alternatives considered**:

- Best-effort reporting with warnings: rejected for gate-mode scenarios because warnings can hide release-blocking evidence gaps.
