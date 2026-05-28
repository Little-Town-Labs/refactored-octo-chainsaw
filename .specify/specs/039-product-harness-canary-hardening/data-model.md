# Data Model: PTH14 Canary Workflow Hardening

## CanaryEnvironmentValidation

- `mode`: `preview-prod` or `dry-run`
- `target_url_label`: safe report label, e.g. `canary:alpha.example.com` or `canary:dry-run`
- `missing_env`: required variable names missing from the supplied env
- `issues`: non-secret validation issues, such as invalid URL syntax
- `required_env`: required variable names for the selected mode

## CanaryRequiredEnvironment

Preview/prod canary runs require:

- `PRODUCT_CANARY_URL`
- `BROWSERBASE_PROJECT_ID`
- `BROWSERBASE_API_KEY`
- `PRODUCT_HARNESS_DATABASE_URL`
- `PRODUCT_ARTIFACT_STORE_PROVIDER`
- `PRODUCT_ARTIFACT_STORE_BUCKET`
- `PRODUCT_ARTIFACT_STORE_PREFIX`
- `PRODUCT_ARTIFACT_STORE_CREDENTIAL_REF`
- the env variable named by `PRODUCT_ARTIFACT_STORE_CREDENTIAL_REF` when it uses `env:NAME`

Dry-run canary runs require:

- `PRODUCT_CANARY_DRY_RUN=true`

## Safety Rules

- Validation errors contain env var names only.
- Target URL labels use hostnames only.
- Raw URLs, credentials, database URLs, and provider tokens are never returned.
