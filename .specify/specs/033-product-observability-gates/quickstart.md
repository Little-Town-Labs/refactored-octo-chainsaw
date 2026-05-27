# Quickstart: Observability and Incident Gate Scenarios

Run the focused PTH08 tests:

```bash
pnpm --filter @spyglass/product-test-harness test -- observability-gates
```

Run the full product harness test suite:

```bash
pnpm --filter @spyglass/product-test-harness test
```

Run the local deterministic sample:

```bash
pnpm --filter @spyglass/product-test-harness run:observability-gates
```

Expected sample evidence:

- audit signal coverage passes with stable actor, subject, action, outcome, and evidence refs
- monitoring signals capture latency and cost within declared bounds
- Sentry-style configuration validates release, environment, redacted DSN ref, enabled status, and sample rate without live Sentry access
- incident readiness records severity, owner, trigger refs, and response status
- unsafe logs fail closed with deterministic forbidden paths and no raw secret persistence
- observability assertion records persist through the local result store

Verified on 2026-05-27:

- `pnpm --filter @spyglass/product-test-harness test -- observability-gates`
- `pnpm --filter @spyglass/product-test-harness test`
- `pnpm --filter @spyglass/product-test-harness type-check`
- `pnpm --filter @spyglass/product-test-harness build`
- `pnpm --filter @spyglass/product-test-harness lint`
- `pnpm --filter @spyglass/product-test-harness run:observability-gates`
- `pnpm format:check`
