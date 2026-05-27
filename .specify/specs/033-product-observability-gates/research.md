# Research: Observability and Incident Gate Scenarios

## Decision: Keep PTH08 fully deterministic and offline

**Rationale**: PTH08 needs to prove harness contracts before live monitoring, Sentry, or incident tooling is wired into CI/canary workflows. Offline fixtures make package tests reliable and keep Alpha-readiness gates runnable without credentials.

**Alternatives considered**:

- Query live Sentry or monitoring vendors in unit tests: rejected because package tests must not require external services or credentials.
- Store only run-level assertions: rejected because the result store already has a dedicated observability assertion bucket that should be exercised.

## Decision: Model Sentry readiness as configuration evidence

**Rationale**: The first gate can validate release, environment, DSN redaction, sample-rate bounds, and enabled status without contacting Sentry. This proves safe persistence and readiness shape while avoiding live vendor coupling.

**Alternatives considered**:

- Require a real DSN and project lookup: rejected because it would introduce secrets and network requirements.
- Skip Sentry until canaries: rejected because the roadmap names Sentry production-like config as PTH08 scope.

## Decision: Reject unsafe content with recursive metadata scanning

**Rationale**: Secrets can appear in nested log metadata, not only in top-level excerpts. Recursive scanning matches result-store safety expectations and catches database URLs, token assignments, credential keys, protected-class markers, and private seeker content.

**Alternatives considered**:

- Scan only message strings: rejected because metadata often carries the sensitive values.
- Redact unsafe logs silently: rejected because gates should fail closed and produce deterministic evidence.
