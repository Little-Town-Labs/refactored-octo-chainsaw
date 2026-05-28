# Quickstart: PTH16 Alpha Harness Operations Runbook

## Review the Runbook

```bash
sed -n '1,260p' docs/runbooks/product-harness-alpha-operations.md
```

Confirm it covers:

- Neon `test_harness` setup and `PRODUCT_HARNESS_DATABASE_URL`
- Browserbase setup and `BROWSERBASE_PROJECT_ID` / `BROWSERBASE_API_KEY`
- Canary target setup and `PRODUCT_CANARY_URL`
- Artifact storage setup and `PRODUCT_ARTIFACT_STORE_*`
- Gate, eval, and canary commands/workflows
- Report interpretation and eval trend guidance
- Operational response matrix

## Validate Formatting

```bash
pnpm format:check
```

## Validate Searchable Required Strings

```bash
rg "PRODUCT_CANARY_URL|BROWSERBASE_PROJECT_ID|PRODUCT_HARNESS_DATABASE_URL|PRODUCT_ARTIFACT_STORE_PROVIDER|product:canary|alpha-canary.yml|test_harness" docs/runbooks/product-harness-alpha-operations.md
```
