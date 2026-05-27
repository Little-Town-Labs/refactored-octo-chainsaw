# Quickstart: Employer API and Webhook Gate Scenarios

Run the focused PTH07 tests:

```bash
pnpm --filter @spyglass/product-test-harness test -- api-webhook-gates
```

Run the full product harness test suite:

```bash
pnpm --filter @spyglass/product-test-harness test
```

Run the local deterministic sample:

```bash
pnpm --filter @spyglass/product-test-harness run:api-webhook-gates
```

Expected sample evidence:

- authorized req create, update, and close operations pass with scoped synthetic credentials
- missing-scope operation is denied with a stable reason code
- signed webhook delivery verifies successfully
- duplicate delivery is marked idempotent without a second accepted capture
- failure delivery records reviewable retry/failure evidence
- forbidden payload fields are rejected before accepted capture persistence

Verified on 2026-05-27:

- `pnpm --filter @spyglass/product-test-harness test -- api-webhook-gates`
- `pnpm --filter @spyglass/product-test-harness test`
- `pnpm --filter @spyglass/product-test-harness type-check`
- `pnpm --filter @spyglass/product-test-harness build`
- `pnpm --filter @spyglass/product-test-harness lint`
- `pnpm --filter @spyglass/product-test-harness run:api-webhook-gates`
- `pnpm format:check`
