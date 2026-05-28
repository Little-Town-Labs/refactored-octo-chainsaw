# Feature Specification: PTH13 Browserbase Preview/Prod Replay Driver

**Feature Branch**: `038-product-harness-browserbase-driver`
**Created**: 2026-05-28
**Status**: Implemented
**Input**: Product harness roadmap PTH13: add Browserbase-backed headless Playwright execution for preview/prod replay and canaries.

## User Scenarios & Testing

### Primary User Story

As a Spyglass engineer operating preview, production replay, and canary runs, I need browser journeys to execute through a Browserbase-backed headless Playwright driver so deployed surfaces can be replayed with managed browser sessions and durable evidence references.

### Acceptance Scenarios

1. **Given** Browserbase session and Playwright connector dependencies, **When** a browser journey route is visited, **Then** the driver creates a Browserbase session, runs the visit at the requested viewport, and returns evidence refs for the session and any replay/artifact links.
2. **Given** Browserbase credentials are missing, **When** the driver is built from environment, **Then** it fails fast with a missing-config error instead of falling back silently to synthetic execution.
3. **Given** a Browserbase visit fails, **When** the browser journey runner processes the result, **Then** the result is marked failed and retains safe session, console, network, and error evidence.
4. **Given** unit tests run locally without Browserbase credentials, **When** the Browserbase driver tests execute, **Then** they use fake session and Playwright connectors without network access.
5. **Given** PTH14 canary workflows later provide Browserbase secrets, **When** they instantiate the driver, **Then** the same `BrowserJourneyDriver` contract works without changing browser journey definitions.

### Edge Cases

- Missing project ID, API key, or connector dependency is rejected before the first visit.
- Session cleanup runs after each visit when the session client supports it.
- Driver metadata must not expose raw API keys, session secrets, or credential-bearing URLs.
- Browserbase session identifiers and replay URLs are recorded as evidence refs only.

## Requirements

### Functional Requirements

- **FR-001**: The harness MUST expose a Browserbase-backed `BrowserJourneyDriver` implementation.
- **FR-002**: The Browserbase driver MUST accept injectable session and Playwright connector dependencies so local tests do not require network access.
- **FR-003**: The driver MUST create a Browserbase session per visit and pass route URL, viewport, expected status/text, and metadata to the connector.
- **FR-004**: The driver MUST return safe evidence refs including Browserbase session refs and optional replay/artifact refs.
- **FR-005**: The driver MUST close Browserbase sessions after visits when the session client supports cleanup.
- **FR-006**: The package MUST expose environment parsing/validation helpers for Browserbase driver configuration.
- **FR-007**: The driver MUST integrate with the existing browser journey runner without changing `BrowserJourneyDriver` consumers.

### Non-Functional Requirements

- **NFR-001**: Unit tests MUST be deterministic and use fake Browserbase/Playwright dependencies.
- **NFR-002**: Browserbase metadata MUST avoid raw secrets and credential-bearing URLs.
- **NFR-003**: PTH13 MUST not add live Browserbase or Playwright network requirements to local tests.
- **NFR-004**: Driver errors MUST be converted to failed visit results with safe messages.

## Success Criteria

- **SC-001**: Focused tests cover successful visits, failed visits, missing config, session cleanup, and runner integration.
- **SC-002**: Public exports allow PTH14 canary workflows to construct a Browserbase driver from configured secrets.
- **SC-003**: Roadmap and Spec Kit artifacts identify PTH13 as the active implementation slice.
- **SC-004**: Existing synthetic browser journey behavior remains backward compatible.
