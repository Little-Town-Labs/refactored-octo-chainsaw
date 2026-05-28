# Research: PTH14 Canary Workflow Hardening

## Decisions

- **Validation location**: implement canary validation in `@spyglass/product-test-harness` and call it from `runReportingCiScenarioSample`.
  - **Rationale**: keeps workflow behavior and command metadata driven by the same package contract.
  - **Alternative considered**: shell-only GitHub Actions checks. Rejected because tests would be weaker and metadata would drift.

- **Dry-run semantics**: require `PRODUCT_CANARY_DRY_RUN=true` for workflow dry runs.
  - **Rationale**: preview/prod workflows should fail safe by default, while local manual dry runs remain explicit.
  - **Alternative considered**: infer dry-run from missing URL. Rejected because scheduled production canaries could silently pass without testing deployed surfaces.

- **Artifact storage config**: require provider, bucket/container, prefix, and provider credential ref for deployed canaries.
  - **Rationale**: PTH12 is provider-neutral, so PTH14 should validate the common shape and allow Vercel-backed storage credentials.
  - **Alternative considered**: require a concrete Vercel Blob implementation now. Deferred to a provider-specific storage slice/runbook.

- **URL handling**: validate URL syntax but expose only host labels.
  - **Rationale**: canary URLs can include deployment tokens or preview query params; reports should not retain them.

## Open Follow-Up

- PTH16 should document the exact provider values used for Vercel/Neon environments once production secrets are installed.
