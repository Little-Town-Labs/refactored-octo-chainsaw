# Data Model: PTH16 Alpha Harness Operations Runbook

## Alpha Harness Configuration

Represents the operator-controlled configuration needed for product harness commands and canaries.

Fields:

- `PRODUCT_CANARY_URL`: Vercel preview or production target URL.
- `PRODUCT_CANARY_DRY_RUN`: explicit local/manual dry-run marker.
- `BROWSERBASE_PROJECT_ID`: Browserbase project identifier.
- `BROWSERBASE_API_KEY`: Browserbase credential reference.
- `PRODUCT_HARNESS_DATABASE_URL`: non-production Neon result-store database URL.
- `PRODUCT_ARTIFACT_STORE_PROVIDER`: durable object storage provider identifier.
- `PRODUCT_ARTIFACT_STORE_BUCKET`: durable storage bucket/container name.
- `PRODUCT_ARTIFACT_STORE_PREFIX`: storage prefix for product harness artifacts.
- `PRODUCT_ARTIFACT_STORE_CREDENTIAL_REF`: env-var reference for the storage credential.

Validation rules:

- Preview/prod canaries require all preview/prod env names.
- Dry-run mode requires explicit dry-run intent and does not prove preview/prod readiness.
- Credential refs must be documented by env name only, not raw values.

## Canary Run

Represents a `product:canary` execution against a target environment.

Fields:

- `target_url_label`: safe label derived from the target host.
- `mode`: preview/prod or dry-run.
- `command`: `product:canary`.
- `workflow`: `.github/workflows/alpha-canary.yml`.
- `report_artifacts`: JSON/Markdown product harness report outputs.

Validation rules:

- Preview/prod runs fail fast on missing required env.
- Dry-run output cannot be used as launch evidence.

## Harness Report

Represents product harness report output used by operators.

Fields:

- suite status and summary
- scenario and assertion summaries
- run artifacts and browser artifacts
- webhook and observability evidence
- eval trend summary when present

Validation rules:

- Gate/canary report failures require triage before Alpha promotion.
- Eval trends remain informational until explicit thresholds are approved.

## Operational Response

Represents the action path for a failure class.

Fields:

- failure class
- owner
- first checks
- evidence to preserve
- escalation path

Validation rules:

- Privacy, credential, jurisdiction, and cross-side leakage signals escalate to incident response.
- Operators preserve references rather than copying raw personal data or secrets.
