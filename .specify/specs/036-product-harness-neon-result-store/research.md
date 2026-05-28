# Research: PTH11 Neon Test Harness Schema Persistence

## Decisions

### Use a caller-provided SQL client

**Decision**: Implement the Neon result store against a minimal Postgres-compatible SQL client interface instead of adding a Neon-specific runtime dependency to `@spyglass/product-test-harness`.

**Rationale**: The harness already keeps test dependencies local and deterministic. Browserbase, canary workflows, and preview/prod replay can inject the Neon or `pg` client they need without forcing network setup into unit tests.

### Store full snapshots as JSONB with indexed summary columns

**Decision**: Persist the complete `ProductResultStoreSnapshot` as JSONB and duplicate the existing summary fields into scalar columns.

**Rationale**: PTH03-PTH10 snapshot categories remain intact for report regeneration, while common dashboard/canary queries can filter without parsing every JSON document.

### Default and prefer the `test_harness` schema

**Decision**: Default schema creation and writes to `test_harness`, and reject production-like schema names.

**Rationale**: The user decision was explicit: result persistence belongs outside production application schemas. A hard default and guard reduce accidental writes to `public` or app-owned schemas.

### Metadata only for artifact persistence

**Decision**: Persist artifact references, checksums, redaction status, and summary counts in Neon; keep large artifacts in durable object storage later.

**Rationale**: This matches the roadmap decision that Neon holds metadata while Vercel/durable object storage will hold larger screenshots, videos, traces, and transcripts.

## Alternatives Considered

- **Use local-file store only with upload later**: Rejected because canaries and trend reporting need a queryable shared result history.
- **Add a package-level `pg` or Neon dependency now**: Deferred because the current package can expose a stable adapter contract without new install or network requirements.
- **Normalize every snapshot category into separate tables**: Deferred because JSONB plus summaries satisfies PTH11 while keeping future schema migration simple.
