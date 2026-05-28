# Contract: Neon Result Store

## Public API

```ts
interface ProductResultStoreSqlClient {
  query<T = Record<string, unknown>>(
    text: string,
    values?: readonly unknown[],
  ): Promise<{ rows: readonly T[] }>;
}

interface NeonProductResultStoreOptions {
  client: ProductResultStoreSqlClient;
  schema?: string;
  createSchema?: boolean;
}

class NeonProductResultStore implements ProductResultStore {
  ensureSchema(): Promise<void>;
  saveRun(snapshot: ProductResultStoreSnapshot): Promise<ProductResultStoreSaveResult>;
  getRun(runId: string): Promise<ProductResultStoreSnapshot | undefined>;
  listRuns(filters?: ProductResultStoreFilters): Promise<readonly ProductResultRunSummary[]>;
}
```

## SQL Boundary

- Values are always passed as parameters.
- Schema/table identifiers are interpolated only after strict validation.
- The default schema is `test_harness`.
- Production-like schema names such as `public`, `prod`, `production`, and `app` are rejected.

## Error Behavior

- Invalid snapshots throw `HarnessValidationError` before SQL writes.
- Identical duplicate writes return `{ created: false, idempotent: true }`.
- Conflicting duplicate writes throw `ProductResultStoreError` with code `duplicate_conflict`.
- Read/write SQL failures throw `ProductResultStoreError` with `read_failed` or `write_failed`.
