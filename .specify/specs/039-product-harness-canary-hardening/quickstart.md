# Quickstart: PTH14 Canary Workflow Hardening

## Local Dry Run

```bash
PRODUCT_CANARY_DRY_RUN=true pnpm product:canary
```

## Preview/Production Canary Requirements

Set these values as GitHub environment vars/secrets before running `alpha-canary.yml` without dry-run:

```text
PRODUCT_CANARY_URL
BROWSERBASE_PROJECT_ID
BROWSERBASE_API_KEY
PRODUCT_HARNESS_DATABASE_URL
PRODUCT_ARTIFACT_STORE_PROVIDER
PRODUCT_ARTIFACT_STORE_BUCKET
PRODUCT_ARTIFACT_STORE_PREFIX
PRODUCT_ARTIFACT_STORE_CREDENTIAL_REF
BLOB_READ_WRITE_TOKEN
```

For Vercel-backed artifact storage, `PRODUCT_ARTIFACT_STORE_CREDENTIAL_REF` should point to the configured secret name instead of embedding the raw secret in reports. The default workflow value is `env:BLOB_READ_WRITE_TOKEN`.

## Validation

```bash
pnpm --filter @spyglass/product-test-harness test -- reporting-ci
pnpm --filter @spyglass/product-test-harness type-check
pnpm --filter @spyglass/product-test-harness lint
pnpm --filter @spyglass/product-test-harness build
```
