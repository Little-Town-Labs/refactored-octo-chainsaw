# Contract: Alpha Harness Operations Runbook

The PTH16 runbook is considered complete when it exposes the following operator-facing sections and exact searchable strings.

## Required Sections

- Purpose and scope
- Configuration matrix
- Neon `test_harness` setup
- Browserbase setup
- Canary target setup
- Durable artifact storage and retention
- Running commands and workflows
- Reading reports
- Eval trend and cost monitoring
- Operational response matrix
- Escalation and closure checklist

## Required Searchable Strings

- `PRODUCT_CANARY_URL`
- `PRODUCT_CANARY_DRY_RUN`
- `BROWSERBASE_PROJECT_ID`
- `BROWSERBASE_API_KEY`
- `PRODUCT_HARNESS_DATABASE_URL`
- `PRODUCT_ARTIFACT_STORE_PROVIDER`
- `PRODUCT_ARTIFACT_STORE_BUCKET`
- `PRODUCT_ARTIFACT_STORE_PREFIX`
- `PRODUCT_ARTIFACT_STORE_CREDENTIAL_REF`
- `BLOB_READ_WRITE_TOKEN`
- `product:gate`
- `product:eval`
- `product:canary`
- `product-gate.yml`
- `persona-eval.yml`
- `alpha-canary.yml`
- `test_harness`

## Non-Disclosure Contract

- The runbook must not include raw secret values.
- The runbook must not include production database URLs.
- The runbook must not instruct operators to copy personal data into tickets or docs.
- Credential examples must use env-var references only.
