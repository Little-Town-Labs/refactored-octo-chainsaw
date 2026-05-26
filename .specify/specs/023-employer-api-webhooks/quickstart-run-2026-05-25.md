# F23 Quickstart Run: 2026-05-25

## Scenario 1: Validate the API Contract

Command:

```bash
pnpm --filter @spyglass/api-contracts test -- employer-api-contract
```

Result: Passed. Contract tests validate OpenAPI versioning, service credential auth, idempotency, common error response, deprecation/sunset metadata, webhook endpoint lifecycle operations, supported major versions, and prohibited surface exclusions.

## Scenario 2-6: REST and Webhook Focused Evidence

Command:

```bash
pnpm --filter @spyglass/web test -- employer-api employer-console
```

Result: Passed. 23 test suites and 60 tests covered employer API auth, idempotency, req route handlers, cross-org authz, webhook endpoint lifecycle, URL validation, HMAC verification, replay rejection, delivery retry/terminal behavior, dossier fail-closed behavior, credential lifecycle, signing-secret rotation, and employer console integration views/actions.

## Type and Principal Coverage

Commands:

```bash
pnpm --filter @spyglass/web type-check
pnpm --filter @spyglass/db build
bash scripts/check-principal-coverage.sh
```

Result: Passed. Principal coverage checked 26 route handlers and all were green.

## Workspace Verification

Commands:

```bash
pnpm format:check
pnpm type-check
pnpm lint
pnpm build
```

Result: Passed. `pnpm type-check` completed 41 tasks, `pnpm lint` completed 24 tasks, and `pnpm build` completed 24 tasks.
