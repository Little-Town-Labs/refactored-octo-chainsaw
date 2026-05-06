# @spyglass/api-contracts

**Status:** alpha — F01 placeholder; populated in F23 (Employer REST
API + signed-webhook delivery).

OpenAPI 3.1 specifications for Spyglass external surfaces — primarily
the employer REST API and webhook payloads. Generated TypeScript types
exported for consumption by `apps/web/` and downstream consumers.

Per Constitution §III.2, agent-facing semantics are the source of
truth; the human-facing API docs are derived from these specs.

## Public API

- `./openapi/*.yaml` — hand-authored OpenAPI specs (F23+).
- `./` — generated TypeScript types from the OpenAPI specs.

## Dependencies

`openapi-typescript` for type generation. No runtime deps.

## Stability tier

Versioning per Constitution §III.3 (semver, N-2 backwards-compat,
RFC 8594/9745 deprecation headers).
