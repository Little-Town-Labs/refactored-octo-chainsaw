# Research: PTH12 Durable Artifact Storage

## Decisions

### Provider-neutral artifact store contract

**Decision**: Define product-harness artifact storage around a typed store interface and metadata model instead of importing a Vercel Blob dependency directly.

**Rationale**: The user expects Vercel/available durable storage for large artifacts, but local tests and CI should not need live credentials. A provider-neutral contract lets PTH14 wire Vercel Blob or another object store when secrets are present.

### Local-file implementation as deterministic baseline

**Decision**: Provide `LocalFileProductArtifactStore` for tests and local development.

**Rationale**: It proves atomic persistence, checksums, idempotency, validation, and result snapshot compatibility without network access.

### RunArtifact metadata remains the snapshot boundary

**Decision**: Durable storage returns metadata that converts into existing `RunArtifact` records rather than replacing current artifact contracts.

**Rationale**: PTH03-PTH11 result stores, reports, browser artifacts, and persona evals already depend on `RunArtifact` references. PTH12 should strengthen references, not fork them.

### SHA-256 checksums for duplicate detection

**Decision**: Use `sha256:<hex>` checksums for stored artifact bytes.

**Rationale**: SHA-256 is deterministic, easy to test, compatible with object-storage integrity metadata, and sufficient for idempotency/conflict checks.

## Alternatives Considered

- **Store artifact bytes in Neon JSONB**: Rejected because the roadmap explicitly keeps Neon for metadata and large artifacts in object storage.
- **Add Vercel Blob dependency now**: Deferred until workflow hardening because credentialed preview/prod storage should be configured with canary secrets.
- **Only rely on GitHub Actions artifacts**: Rejected because GitHub artifact retention is not durable enough for canary history and later trend/debug workflows.
