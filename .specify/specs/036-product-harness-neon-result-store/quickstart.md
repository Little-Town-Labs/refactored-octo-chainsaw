# Quickstart: PTH11 Neon Test Harness Schema Persistence

## Local Validation

```bash
pnpm --filter @spyglass/product-test-harness test -- result-store
pnpm --filter @spyglass/product-test-harness type-check
pnpm --filter @spyglass/product-test-harness lint
pnpm --filter @spyglass/product-test-harness build
pnpm format:check
```

## Runtime Wiring

Create a Neon/Postgres client in the canary or replay runtime and pass a minimal query adapter to the store:

```ts
import { NeonProductResultStore } from "@spyglass/product-test-harness";

const store = new NeonProductResultStore({
  client: {
    query: (text, values) => neonClient.query(text, values),
  },
  schema: "test_harness",
});

await store.ensureSchema();
await store.saveRun(snapshot);
```

Use `PRODUCT_HARNESS_DATABASE_URL` or an equivalent non-production Neon URL for this client. Do not point harness persistence at the production application schema.
