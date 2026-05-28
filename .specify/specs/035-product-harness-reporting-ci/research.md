# Research: PTH10 Reports, Dashboard, and CI/Canary Workflows

## Decisions

### Aggregate reports use result-store snapshots

**Decision**: Build suite reports from `ProductResultStoreSnapshot` records instead of inventing a new persistence model.

**Rationale**: PTH03 already established durable run, seed, browser, webhook, observability, and agent invocation shapes. Aggregation can stay additive and deterministic.

### Workflow commands default to local/dry-run behavior

**Decision**: `product:gate`, `product:eval`, and `product:canary` invoke package sample/report commands by default.

**Rationale**: CI workflows must be runnable before live Neon, Browserbase, Vercel, or Pi credentials are configured. Live mode can layer on top of the same metadata later.

### Trend summary is metadata-level in PTH10

**Decision**: Include typed trend points and aggregate deltas in reports without building a visual dashboard UI yet.

**Rationale**: The immediate need is machine-queryable and Markdown evidence for PRs and canary runs. A UI can consume the JSON contract later.

## Alternatives Considered

- **External dashboard dependency**: Rejected for PTH10 because it adds operational surface before stable JSON contracts exist.
- **Parsing Markdown for CI summaries**: Rejected because JSON should remain canonical and Markdown should be presentation-only.
