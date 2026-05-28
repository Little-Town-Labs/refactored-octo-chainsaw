# Feature Specification: PTH16 Alpha Harness Operations Runbook

**Feature Branch**: `041-product-harness-operations-runbook`

**Created**: 2026-05-28

**Status**: Implemented

**Input**: User description: "PTH16 Alpha harness operations runbook: Document Neon schema setup, Browserbase, canary URLs, artifact retention, report interpretation, and operational response."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configure Alpha Harness Operations (Priority: P1)

As a Spyglass operator preparing preview or production canaries, I need one runbook that lists every required environment variable, secret, provider configuration, and verification command so I can configure the harness without reading implementation code.

**Why this priority**: PTH16 closes the operational gap left after Neon, artifact storage, Browserbase, canary hardening, and eval trend monitoring shipped.

**Independent Test**: A reviewer can open the runbook and identify the exact Neon, Browserbase, canary URL, artifact storage, and command configuration required for preview/prod canaries.

**Acceptance Scenarios**:

1. **Given** a new test_harness database project, **When** the operator follows the setup section, **Then** they know which database URL, schema name, and initialization behavior are expected.
2. **Given** GitHub Actions, Vercel, Neon, Browserbase, and artifact storage settings, **When** the operator reviews the configuration matrix, **Then** every PTH14 required env/secret has an owner and usage note.
3. **Given** an operator wants a dry run, **When** they inspect the runbook, **Then** dry-run behavior is separated from preview/prod canary requirements.

---

### User Story 2 - Operate Canaries and Interpret Reports (Priority: P2)

As an engineer or product reviewer, I need the runbook to explain which commands and workflows to run and how to interpret gate, canary, and eval trend reports.

**Why this priority**: Canaries and eval trends are useful only if reviewers can distinguish release-blocking failures from informational trend movement.

**Independent Test**: A reviewer can use the runbook to choose the correct command/workflow, identify generated report artifacts, and classify report sections into gate status, evidence, artifact, browser, and eval trend signals.

**Acceptance Scenarios**:

1. **Given** a failing canary report, **When** the reviewer reads the report interpretation section, **Then** they can identify status, scenario, assertion, artifact, and target-url evidence to inspect first.
2. **Given** eval trend output, **When** the reviewer reads the eval guidance, **Then** they understand that eval trends remain informational until explicit thresholds are approved.

---

### User Story 3 - Respond to Operational Failures (Priority: P3)

As an operator responding to Alpha readiness failures, I need clear escalation and recovery guidance for missing config, Browserbase failures, Neon persistence failures, artifact storage issues, report regressions, and privacy/security signals.

**Why this priority**: The harness must produce actionable response steps, not just pass/fail output.

**Independent Test**: A reviewer can map each common failure class to an owner, immediate response, evidence to preserve, and escalation path.

**Acceptance Scenarios**:

1. **Given** a canary fails because required preview/prod configuration is missing, **When** the operator reads the troubleshooting section, **Then** they can distinguish configuration repair from product regression response.
2. **Given** a report indicates privacy, jurisdiction, credential, or raw-secret leakage, **When** the operator reads the escalation section, **Then** they know to preserve minimal evidence refs and invoke the incident response runbook.

### Edge Cases

- Preview/prod canary URL is missing, malformed, or points to the wrong environment.
- Browserbase credentials are present but remote browser session creation fails.
- Neon result-store URL is missing, points to the wrong project, or lacks access to the isolated `test_harness` schema.
- Artifact storage metadata is configured but the credential reference points to a missing env variable.
- Eval trend movement looks concerning but no release-blocking threshold has been approved.
- A report contains privacy, credential, or cross-side leakage signals that require escalation outside the product-harness runbook.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The runbook MUST document the required preview/prod canary configuration for `PRODUCT_CANARY_URL`, Browserbase credentials, `PRODUCT_HARNESS_DATABASE_URL`, and artifact storage env.
- **FR-002**: The runbook MUST document Neon `test_harness` setup expectations, including isolated schema use outside production app schemas.
- **FR-003**: The runbook MUST document Browserbase setup and explain that local Playwright/dry-run behavior is separate from preview/prod canaries.
- **FR-004**: The runbook MUST document artifact retention expectations, including DB metadata, durable object storage for large artifacts, retention class, checksum, redaction status, and credential refs.
- **FR-005**: The runbook MUST document commands and workflows for `product:gate`, `product:eval`, `product:canary`, `product-gate.yml`, `persona-eval.yml`, and `alpha-canary.yml`.
- **FR-006**: The runbook MUST document report interpretation for suite status, assertions, artifacts, browser artifacts, observability assertions, and eval trend summaries.
- **FR-007**: The runbook MUST state that eval trends are informational until explicit stability and cost thresholds are approved.
- **FR-008**: The runbook MUST include an operational response matrix for missing config, Neon persistence, Browserbase execution, artifact storage, report regressions, and privacy/security signals.
- **FR-009**: The runbook MUST avoid storing or displaying raw secrets and MUST describe credential references by env variable name only.
- **FR-010**: The roadmap MUST mark PTH16 as active during implementation and identify PTH17 Camofox as optional follow-up only.

### Key Entities

- **Alpha Harness Configuration**: Required env/secret names and their purpose across local, preview, and production canary modes.
- **Canary Run**: A `product:canary` execution against a Vercel preview/prod target with Browserbase, Neon result-store persistence, and artifact storage configured.
- **Harness Report**: JSON/Markdown report generated by product harness commands, including status, assertion, artifact, observability, and eval trend sections.
- **Operational Response**: A troubleshooting path that maps a failure class to owner, first checks, evidence to preserve, and escalation path.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A reviewer can find every PTH14 preview/prod required env name in the runbook.
- **SC-002**: A reviewer can follow one runbook to identify Neon schema setup, Browserbase setup, canary URL setup, artifact storage setup, and report interpretation.
- **SC-003**: The runbook distinguishes dry-run/local behavior from preview/prod canaries in separate sections.
- **SC-004**: The runbook contains at least one response path for each major failure class: configuration, Neon persistence, Browserbase, artifact storage, report regression, and privacy/security.
- **SC-005**: The runbook contains no raw credential values or secret-shaped examples.

## Assumptions

- Operators will configure secrets through GitHub Actions, Vercel, Neon, Browserbase, and the available durable object storage provider rather than committing values to the repository.
- `PRODUCT_HARNESS_DATABASE_URL` points to the dedicated testing project or another non-production Neon database with the isolated `test_harness` schema.
- Vercel and Neon are the intended deployment/database platforms for Alpha operations.
- Artifact storage provider names may evolve, so the runbook should describe provider-neutral requirements and current expected env names.
