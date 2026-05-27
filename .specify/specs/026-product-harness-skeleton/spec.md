# Feature Specification: Product Harness Skeleton

**Feature Branch**: `026-product-harness-skeleton`

**Created**: 2026-05-27

**Status**: Draft

**Input**: User description: "Use the Spec Kit driven development process to start the testing harness from the product harness PRD and roadmap. Begin with PTH01: harness skeleton plus scenario and result contracts."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Define a Product Scenario Contract (Priority: P1)

An engineer can describe a product-readiness scenario using a shared contract that captures scenario identity, mode, steps, assertions, artifacts, and final outcome without needing to build the full Neon, browser, or persona systems first.

**Why this priority**: Every later harness feature depends on stable scenario and result semantics. Neon lifecycle, seed factories, Playwright flows, observability assertions, and Pi persona evals all need a common result shape.

**Independent Test**: Can be tested by creating and running a no-op scenario that emits a valid run result with scenario metadata, ordered steps, assertions, artifacts, and a pass/fail outcome.

**Acceptance Scenarios**:

1. **Given** a no-op product-readiness scenario, **When** the harness runner executes it, **Then** it produces a valid run result with a run id, scenario id, scenario version, mode, start/end timestamps, steps, assertions, and final status.
2. **Given** a scenario with multiple steps, **When** the runner records step outcomes, **Then** each step keeps its order, name, status, timing, and evidence references.
3. **Given** a failed assertion, **When** the run completes, **Then** the overall scenario result is failed and the failing assertion is visible in the machine-readable result and human-readable summary.

---

### User Story 2 - Produce Human and Machine Reports (Priority: P1)

An engineer or product reviewer can read a concise summary of a harness run while automation can consume the same run as structured data.

**Why this priority**: Alpha-readiness evidence must be understandable by product, engineering, and compliance reviewers, while CI and future dashboards require structured output.

**Independent Test**: Can be tested by running the sample scenario and verifying that it emits both a JSON result and a Markdown summary containing the same scenario id, status, step count, assertion count, and artifact references.

**Acceptance Scenarios**:

1. **Given** a passed sample scenario, **When** the report writer runs, **Then** the Markdown summary shows the run status, scenario name, mode, duration, steps, assertions, and artifacts.
2. **Given** a failed sample scenario, **When** the report writer runs, **Then** the Markdown summary highlights failed assertions before listing supporting details.
3. **Given** a generated JSON result, **When** it is parsed by tests, **Then** required fields are present and have stable names for future persistence.

---

### User Story 3 - Keep Scope Safe for Later Harness Work (Priority: P2)

A maintainer can add future Neon, Playwright, Browserbase, observability, or Pi persona adapters without changing the basic scenario/result contract.

**Why this priority**: PTH01 is the foundation for the remaining product-harness roadmap. It should define extension points without prematurely implementing later features.

**Independent Test**: Can be tested by adding lightweight placeholder adapters in tests that attach artifact references and metadata to a scenario result without requiring real external services.

**Acceptance Scenarios**:

1. **Given** a scenario that records an artifact reference, **When** the run completes, **Then** the artifact reference is included without requiring the harness to know the artifact storage backend.
2. **Given** a scenario that records metadata for a future agent or browser run, **When** reports are generated, **Then** metadata is preserved in structured output and summarized safely.

### Edge Cases

- A scenario has no steps: the runner should reject it or mark the result invalid before producing a passing report.
- A step throws an error: the runner should record the step as failed, redact unsafe error details if needed, and mark the scenario failed.
- A scenario emits an artifact without a label or type: the runner should reject the artifact reference as invalid.
- A run has mixed passed and failed assertions: the final scenario status should be failed.
- A report is generated for an invalid result: the report writer should fail with a clear validation error rather than producing misleading evidence.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST define a product scenario contract with stable identifiers for scenario id, scenario version, title, mode, owner, tags, and description.
- **FR-002**: System MUST support at least two scenario modes: deterministic gate mode and exploratory eval mode.
- **FR-003**: System MUST define a run result contract that records run id, scenario identity, commit/ref metadata when available, environment label, start time, end time, duration, status, steps, assertions, artifacts, and summary.
- **FR-004**: System MUST define step records with name, order, status, start/end timing, optional evidence references, and optional safe metadata.
- **FR-005**: System MUST define assertion records with name, status, expected result, actual result summary, severity, and optional evidence references.
- **FR-006**: System MUST define artifact records with id, label, type, storage reference, redaction status, and optional checksum or metadata.
- **FR-007**: System MUST provide a runner capable of executing a scenario and producing a run result even when the scenario performs no external service calls.
- **FR-008**: System MUST include a sample scenario that demonstrates passing steps, passing assertions, artifact references, and report generation.
- **FR-009**: System MUST include a negative sample or test fixture that demonstrates failed assertions and verifies failed status propagation.
- **FR-010**: System MUST generate a machine-readable report for every completed sample run.
- **FR-011**: System MUST generate a human-readable report for every completed sample run.
- **FR-012**: System MUST validate required fields before accepting scenario definitions, step records, assertion records, and artifact records.
- **FR-013**: System MUST preserve extension metadata for future Neon, browser, observability, webhook, and persona-agent adapters without coupling PTH01 to those services.
- **FR-014**: System MUST avoid storing real production data or secrets in sample scenarios, results, or reports.
- **FR-015**: System MUST expose package-level commands or documented entry points that allow maintainers to type-check, test, and run the sample scenario.

### Key Entities *(include if feature involves data)*

- **Product Scenario**: A versioned description of a product-readiness or eval journey, including mode, owner, tags, and executable steps.
- **Scenario Run**: A single execution of a product scenario, including metadata about environment, timing, status, and summary.
- **Scenario Step**: An ordered unit of scenario execution with its own status, timing, evidence, and metadata.
- **Scenario Assertion**: A verifiable expectation checked during or after a run.
- **Run Artifact**: A reference to supporting evidence such as reports, traces, screenshots, webhook captures, agent transcripts, or structured JSON.
- **Run Report**: Human-readable and machine-readable output summarizing the scenario run.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A maintainer can run the sample scenario from a clean checkout and receive both JSON and Markdown run outputs in under 30 seconds, excluding dependency installation.
- **SC-002**: The sample scenario output includes 100% of required run, step, assertion, and artifact fields defined by the spec.
- **SC-003**: A failed assertion in a sample fixture causes the overall scenario status to be failed in both JSON and Markdown outputs.
- **SC-004**: The package exposes tests that verify scenario validation, status propagation, and report generation.
- **SC-005**: No sample output contains real secrets, production user data, or production database identifiers.
- **SC-006**: Future roadmap features can add at least one adapter-specific metadata block without changing the required top-level run result fields.

## Assumptions

- This feature is PTH01 from `docs/testing/product-harness/roadmap.md`.
- Existing `packages/test-harness` remains the lower-level utility package for Neon and integration primitives; this feature creates the product-level harness foundation.
- Neon branch lifecycle, persistent result storage, Playwright execution, Browserbase, observability checks, API/webhook flows, and Pi persona evals are out of scope for PTH01 and are planned for later PTH features.
- Sample scenarios use synthetic data only.
- The initial report format can be file-based; database persistence is addressed by PTH03.
