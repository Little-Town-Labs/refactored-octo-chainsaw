# Feature Specification: PTH17 Camofox Browser Evaluation Spike

**Feature Branch**: `042-product-harness-camofox-spike`

**Created**: 2026-05-29

**Status**: Implemented

**Input**: User description: "PTH17 Camofox browser evaluation spike: optional follow-up only if Browserbase or stock Playwright exposes bot-detection friction on first-party Spyglass preview/prod surfaces."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Decide Whether Camofox Fits Spyglass Harness Needs (Priority: P1)

As a Spyglass engineer, I need a bounded evaluation of Camofox/Camoufox against the existing browser journey contract so we can decide whether to build a fallback adapter without adding unnecessary browser dependencies.

**Why this priority**: Browserbase is already the preview/prod canary path. Camofox should remain optional unless it materially improves first-party preview/prod testing reliability.

**Independent Test**: A reviewer can open the evaluation document and understand the recommendation, decision criteria, risks, and next action without installing Camofox.

**Acceptance Scenarios**:

1. **Given** the product harness already has `BrowserJourneyDriver`, **When** the evaluation is reviewed, **Then** it explains how a Camofox adapter would fit that contract.
2. **Given** Browserbase remains healthy, **When** the decision matrix is reviewed, **Then** Camofox is not recommended as release-blocking infrastructure.
3. **Given** first-party preview/prod bot-detection friction appears, **When** the evaluation is reviewed, **Then** it identifies the conditions for opening an adapter build.

---

### User Story 2 - Compare Camofox With Browserbase and Stock Playwright (Priority: P2)

As an operator, I need a practical comparison of Camofox, Browserbase, and stock Playwright across setup cost, artifacts, reliability, security posture, and maintenance risk.

**Why this priority**: The optional spike should inform a future build/no-build decision instead of becoming unbounded research.

**Independent Test**: The comparison matrix lists each browser option and scores or qualifies the evaluation dimensions from the roadmap.

**Acceptance Scenarios**:

1. **Given** the comparison matrix, **When** a reviewer scans it, **Then** they can see where Camofox is stronger, weaker, or still unknown.
2. **Given** the maintenance-risk section, **When** a reviewer reads it, **Then** they understand that current upstream state and Firefox-fork maintenance are material risks.

---

### User Story 3 - Define A Future Adapter Plan Without Implementing It (Priority: P3)

As a future implementer, I need clear adapter scope and validation criteria so a later Camofox implementation can be planned safely if the spike recommends it.

**Why this priority**: The spike should preserve momentum without committing the current roadmap to new dependencies.

**Independent Test**: The evaluation document includes adapter boundaries, required tests, env/config expectations, artifact expectations, and security constraints for a future feature.

**Acceptance Scenarios**:

1. **Given** a future adapter feature is approved, **When** the implementer reads the spike, **Then** they know which files/contracts would be touched.
2. **Given** a future adapter is not approved, **When** the roadmap is reviewed, **Then** PTH17 remains documented as optional and non-blocking.

### Edge Cases

- Browserbase is unavailable, but first-party product journeys still need canary evidence.
- Stock Playwright works locally but fails only on deployed preview/prod surfaces.
- Camofox/Camoufox package naming differs between upstream docs, Python package, JS wrappers, and informal "Camofox" references.
- Camofox adds anti-detection features that are unnecessary or inappropriate for first-party Spyglass testing.
- A future adapter would require network, browser binary, or provider dependencies that make CI less deterministic.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The evaluation MUST compare Camofox/Camoufox, Browserbase, and stock Playwright for first-party Spyglass preview/prod testing.
- **FR-002**: The evaluation MUST assess setup cost, pass rate evidence, artifact support, security posture, maintenance risk, and fit with `BrowserJourneyDriver`.
- **FR-003**: The evaluation MUST produce a clear recommendation: build adapter now, defer, or reject.
- **FR-004**: The evaluation MUST document trigger conditions for a future adapter build.
- **FR-005**: The evaluation MUST document a future adapter contract boundary without adding runtime dependencies in this spike.
- **FR-006**: The evaluation MUST preserve Browserbase as the primary preview/prod canary path unless evidence supports changing it.
- **FR-007**: The roadmap MUST mark PTH17 active during the spike and keep it optional/non-blocking.
- **FR-008**: The evaluation MUST cite current upstream Camofox/Camoufox documentation or source notes used for the recommendation.

### Key Entities

- **Browser Option**: A candidate browser execution path: Browserbase, stock Playwright, or Camofox/Camoufox.
- **Evaluation Criterion**: A decision dimension such as setup cost, artifact support, reliability, security, or maintenance risk.
- **Adapter Decision**: The build/defer/reject recommendation and trigger conditions for changing it later.
- **Future Adapter Boundary**: The contract shape a later Camofox driver would need to satisfy.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The evaluation document includes a comparison row for Browserbase, stock Playwright, and Camofox/Camoufox.
- **SC-002**: The evaluation document includes at least six decision criteria.
- **SC-003**: The recommendation clearly states whether to build a Camofox adapter now.
- **SC-004**: The spike adds no package dependency or live browser/network requirement.
- **SC-005**: The roadmap reflects PTH17 as active while preserving its optional status.

## Assumptions

- Browserbase remains the current managed preview/prod replay provider.
- Camofox/Camoufox is evaluated only for first-party Spyglass preview/prod testing, not for third-party scraping or bypassing access controls.
- A future adapter would use the existing `BrowserJourneyDriver` contract and deterministic fake-backed tests before any live browser dependency is introduced.
