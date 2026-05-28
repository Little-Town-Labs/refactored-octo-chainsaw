# Feature Specification: PTH10 Reports, Dashboard, and CI/Canary Workflows

**Feature Branch**: `035-product-harness-reporting-ci`
**Created**: 2026-05-28
**Status**: Implemented
**Input**: Product harness roadmap PTH10: commands and workflows for product gate, persona eval, and alpha canary reports.

## User Scenarios & Testing

### Primary User Story

As a Spyglass engineer preparing Alpha readiness, I need product-harness outputs to roll up into readable and machine-queryable reports and to run from explicit CI/canary workflows so readiness decisions can be reviewed without digging through raw scenario logs.

### Acceptance Scenarios

1. **Given** multiple product-harness result-store snapshots, **When** a suite report is rendered, **Then** JSON and Markdown outputs summarize run status, assertions, artifacts, agent invocations, webhooks, browser artifacts, observability assertions, and trend points.
2. **Given** the product harness package, **When** operators inspect command metadata, **Then** `product:gate`, `product:eval`, and `product:canary` each describe mode, scenarios, required environment, and output artifacts.
3. **Given** a manual GitHub workflow dispatch, **When** product gate, persona eval, or alpha canary is selected, **Then** the workflow builds the workspace, runs the appropriate harness command, and uploads report artifacts.
4. **Given** a Vercel preview or production URL is supplied to canary mode, **When** the canary workflow runs, **Then** the report records the target URL label without exposing secrets.

### Edge Cases

- Empty snapshot sets produce an invalid report with zero counts, not an exception.
- Eval failures remain visible as informational/non-release-blocking unless the selected command is gate or canary.
- Optional live credentials are declared in metadata but not printed in reports.
- GitHub workflow files remain manually runnable even when optional secrets are not configured.

## Requirements

### Functional Requirements

- **FR-001**: The harness MUST expose typed suite-report contracts for aggregate status, run counts, assertion counts, artifact counts, scenario coverage, command mode, and trend points.
- **FR-002**: The harness MUST render aggregate reports as stable JSON and readable Markdown.
- **FR-003**: The harness MUST provide metadata for `product:gate`, `product:eval`, and `product:canary` commands.
- **FR-004**: The package MUST include a deterministic reporting/CI sample command that produces both report forms from result-store-backed snapshots.
- **FR-005**: The repository MUST define GitHub Actions workflows for product gate, persona eval, and alpha canary execution.
- **FR-006**: Workflow and report outputs MUST avoid raw secrets, database URLs, API keys, and credential values.
- **FR-007**: Root package scripts MUST expose the product harness commands proposed by the roadmap.

### Non-Functional Requirements

- **NFR-001**: Report generation MUST be deterministic for identical snapshot input.
- **NFR-002**: PTH10 additions MUST not introduce network access for local unit tests.
- **NFR-003**: Workflow defaults MUST be safe for manual/dry-run execution in CI.
- **NFR-004**: Report rendering MUST remain dependency-light and use existing package patterns.

## Success Criteria

- **SC-001**: Unit tests cover aggregate report JSON/Markdown rendering, command metadata, workflow metadata, and sample output.
- **SC-002**: `pnpm product:gate`, `pnpm product:eval`, and `pnpm product:canary` resolve to product-test-harness commands.
- **SC-003**: GitHub workflows upload report artifacts for each command family.
- **SC-004**: Spec Kit artifacts, roadmap, tests, and implementation agree on PTH10 scope.
