# @spyglass/api-contracts

**Status:** alpha — F23 publishes the initial Employer REST API and
signed-webhook delivery contracts.

OpenAPI 3.1 specifications for Spyglass external surfaces — primarily
the employer REST API and webhook payloads. Generated TypeScript types
exported for consumption by `apps/web/` and downstream consumers.

Per Constitution §III.2, agent-facing semantics are the source of
truth; the human-facing API docs are derived from these specs.

## Public API

- `./openapi/employer-api.v1.yaml` — Employer REST API v1 for
  organization-scoped requisition management and webhook endpoint
  lifecycle.
- `./openapi/webhook-events.v1.yaml` — signed employer webhook event
  payload schema for match notifications and dossier delivery.
- `./src/employer-api.ts` — contract metadata, supported major
  versions, required headers, and scope names.
- `./src/webhook-events.ts` — webhook schema version, event type, and
  signature header exports.

## Compatibility

`EMPLOYER_API_SUPPORTED_MAJOR_VERSIONS` is the machine-readable N-2
support surface. Deprecated operations must continue to emit
`Deprecation` and `Sunset` response headers until their sunset date.

Mutation operations require `Idempotency-Key` and return the same
resource response for exact request replays. Mismatched replays with the
same key are contract conflicts.

## Validation

Run the focused contract tests after changing either OpenAPI file or
the TypeScript metadata:

```bash
pnpm --filter @spyglass/api-contracts test -- employer-api-contract
```

## Dependencies

`openapi-typescript` for type generation. No runtime deps.

## Stability tier

Versioning per Constitution §III.3 (semver, N-2 backwards-compat,
RFC 8594/9745 deprecation headers).
