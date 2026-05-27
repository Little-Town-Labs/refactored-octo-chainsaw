# Feature Specification: Playwright Product Browser Runner

**Feature Branch**: `031-product-browser-gate-runner`

**Created**: 2026-05-27

**Status**: Draft

**Input**: User description: "PTH06: Playwright product browser runner"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Define Browser Gate Journeys (Priority: P1)

An engineer can describe required product browser journeys for seeker, employer, operator, Alpha consent, and informational-only surfaces using stable journey ids and expected route coverage.

**Why this priority**: Product readiness gates need a consistent list of browser journeys before live Playwright, Vercel preview, or Browserbase execution can be trusted.

**Independent Test**: Load the default browser journey registry and verify it includes seeker landing, seeker auth/profile, employer console/req/candidate review, operator credential/audit views, Alpha consent, and informational-only surfaces.

**Acceptance Scenarios**:

1. **Given** the default browser journey registry is loaded, **When** it is inspected, **Then** every required PTH06 journey has a stable id, title, route list, viewport list, and artifact policy.
2. **Given** an invalid journey is provided, **When** validation runs, **Then** missing ids, app URLs, routes, viewports, or artifact policies fail before execution.

---

### User Story 2 - Execute Browser Journeys and Capture Artifacts (Priority: P1)

An engineer can run browser journeys against a local or preview app URL and capture screenshot, video, trace, console, and network artifact references for result-store persistence.

**Why this priority**: Browser failures need durable artifacts and safe metadata so engineering can diagnose product-readiness regressions after the command exits.

**Independent Test**: Run the browser journey sample with the deterministic synthetic driver and verify each journey returns passing steps, browser artifacts, safe metadata, and local result-store snapshots.

**Acceptance Scenarios**:

1. **Given** a valid browser journey and app URL, **When** the runner executes it, **Then** the result includes route visit evidence, viewport evidence, and artifact records for screenshots, videos, traces, console logs, and network logs.
2. **Given** browser execution fails, **When** the runner records the result, **Then** failure artifacts are still attached and no raw credentials or production data appear in output.
3. **Given** the local result store reloads a run, **When** a caller filters by browser gate mode, **Then** the stored journey snapshots are queryable with browser artifacts intact.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST define typed browser journey contracts with id, title, app URL, route steps, viewport list, artifact policy, and optional tags.
- **FR-002**: System MUST include a default PTH06 journey registry covering seeker landing, seeker sign-in/sign-up/profile, employer console, employer req creation, employer candidate review, operator credential/audit views, Alpha consent, and informational-only surfaces.
- **FR-003**: System MUST validate browser journeys before execution and reject missing route, viewport, app URL, or artifact policy fields.
- **FR-004**: System MUST execute journeys through a Playwright-compatible driver interface so local Playwright and future Browserbase-backed Playwright can share one contract.
- **FR-005**: System MUST provide a deterministic synthetic browser driver for offline package tests and samples.
- **FR-006**: System MUST capture screenshot, video, trace, console log, and network log artifact refs according to each journey artifact policy.
- **FR-007**: System MUST persist browser artifacts in `ProductResultStoreSnapshot.browser_artifacts`.
- **FR-008**: System MUST expose browser journey runner helpers and a sample runner through the product harness public API.
- **FR-009**: System MUST include tests covering journey validation, default registry coverage, artifact capture, result-store persistence, and safe metadata rejection.
- **FR-010**: System MUST not require Browserbase credentials, live Clerk sessions, live Vercel URLs, or Playwright browser binaries for package unit tests.

### Key Entities

- **Browser Journey**: A named product browser path with route steps, viewports, artifact policy, and tags.
- **Browser Driver**: Playwright-compatible execution boundary for visiting routes and capturing artifacts.
- **Browser Journey Result**: Run result, browser artifacts, and result-store snapshot for one journey execution.

## Success Criteria *(mandatory)*

- **SC-001**: Default PTH06 browser journey registry covers every required PRD §7.4 journey category.
- **SC-002**: Running the synthetic browser sample persists reloadable browser artifact snapshots without external services.
- **SC-003**: Journey validation rejects unsafe or incomplete journey definitions before execution.
- **SC-004**: Package tests prove screenshot, video, trace, console log, and network log artifact refs are captured and queryable.

## Assumptions

- PTH06 establishes browser runner contracts and artifact persistence before live authenticated Clerk/Browserbase runs.
- Browserbase remote execution remains optional and can be layered behind the same driver contract later.
- Real app login/session orchestration and seeded authenticated browser state can expand in later PTH slices or follow-up browser-gate work.
