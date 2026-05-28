# Feature Specification: PTH14 Canary Workflow Hardening

**Feature Branch**: `039-product-harness-canary-hardening`
**Created**: 2026-05-28
**Status**: Implemented
**Input**: Product harness roadmap PTH14: require and validate canary URL, Browserbase credentials, result-store DB URL, and artifact storage config for preview/prod canaries.

## User Scenarios & Testing

### Primary User Story

As a Spyglass operator running preview or production Alpha canaries, I need the canary workflow to fail fast when required runtime configuration is missing and to declare the Browserbase, Neon, and artifact-storage inputs used for deployed replay.

### Acceptance Scenarios

1. **Given** an alpha canary workflow run targeting preview or production, **When** any required URL, Browserbase, Neon result-store, or artifact-storage value is missing, **Then** the workflow stops before build/report generation with a redacted missing-config summary.
2. **Given** a manual canary run is intentionally dry-run, **When** `dry_run` is true, **Then** the workflow allows the existing deterministic dry-run sample path and labels that mode explicitly.
3. **Given** a canary target URL contains query params or credentials, **When** reports and validation messages are generated, **Then** only a safe host label is recorded and no raw URL secrets appear.
4. **Given** product harness command metadata is queried, **When** `product:canary` is inspected, **Then** the required environment list includes canary URL, Browserbase credentials, Neon result-store URL, and artifact-storage config.
5. **Given** local unit tests run without external secrets, **When** canary validation tests execute, **Then** they use synthetic env maps and do not contact Neon, Browserbase, or durable artifact storage.

### Edge Cases

- Deployment-status events use the deployment target URL, while scheduled runs use repository/environment vars.
- `PRODUCT_CANARY_DRY_RUN=true` bypasses preview/prod required secret checks only for explicitly requested dry runs.
- Missing config messages list variable names but never values.
- Invalid target URLs are rejected for preview/prod canaries instead of being labeled as deployed runs.

## Requirements

### Functional Requirements

- **FR-001**: The harness MUST expose a canary environment validation helper for preview/prod canary runs.
- **FR-002**: Preview/prod canary validation MUST require `PRODUCT_CANARY_URL`, `BROWSERBASE_PROJECT_ID`, `BROWSERBASE_API_KEY`, `PRODUCT_HARNESS_DATABASE_URL`, and durable artifact storage config.
- **FR-003**: The validation helper MUST support an explicit dry-run mode that skips preview/prod required secret checks and returns a dry-run label.
- **FR-004**: Validation output MUST include safe target labels and missing variable names without exposing secret values.
- **FR-005**: `product:canary` command metadata MUST list the hardened required environment inputs.
- **FR-006**: `alpha-canary.yml` MUST run the validation before workspace build/report generation and feed the relevant env from GitHub vars/secrets.
- **FR-007**: The workflow MUST keep report upload behavior on failure so validation failures remain inspectable in Actions logs/artifacts when report files exist.

### Non-Functional Requirements

- **NFR-001**: Tests MUST remain deterministic and require no live Browserbase, Neon, Vercel, or object-store credentials.
- **NFR-002**: Secrets and credential-bearing URLs MUST not be printed by validation or reports.
- **NFR-003**: Existing local `pnpm product:canary` dry-run behavior MUST remain available outside the hardened workflow path.
- **NFR-004**: PTH14 MUST preserve current report JSON/Markdown artifact names.

## Success Criteria

- **SC-001**: Unit tests cover valid preview/prod config, missing config, explicit dry-run, safe URL labels, and command metadata.
- **SC-002**: `alpha-canary.yml` contains a pre-build validation step and declares all required preview/prod env/secret inputs.
- **SC-003**: Existing reporting sample tests continue to pass without external credentials.
- **SC-004**: Roadmap and Spec Kit artifacts identify PTH14 as the active implementation slice.
