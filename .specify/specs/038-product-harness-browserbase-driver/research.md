# Research: PTH13 Browserbase Preview/Prod Replay Driver

## Decisions

### Injectable Browserbase and Playwright dependencies

**Decision**: Implement the driver against small `BrowserbaseSessionClient` and `BrowserbasePlaywrightConnector` interfaces.

**Rationale**: The current package does not carry Browserbase or Playwright runtime dependencies. Dependency injection preserves deterministic unit tests and lets PTH14 decide how live credentials and SDKs are loaded.

### Session-per-visit behavior

**Decision**: Create and close a Browserbase session for each route/viewport visit.

**Rationale**: The existing `BrowserJourneyDriver.visit` contract is scoped to one route and viewport. Per-visit sessions make cleanup explicit and keep evidence refs granular.

### Fail fast on missing Browserbase env

**Decision**: `browserbaseDriverConfigFromEnv` requires project ID and API key and throws a typed config error when missing.

**Rationale**: Preview/prod replay should not silently fall back to synthetic execution once Browserbase is requested.

### Evidence refs, not raw artifacts

**Decision**: PTH13 returns safe Browserbase session, replay, and artifact refs in visit evidence.

**Rationale**: PTH12 owns durable artifact storage and PTH14 owns workflow wiring. PTH13 should produce refs that can be persisted without embedding secrets or bytes.

## Alternatives Considered

- **Add Browserbase SDK and Playwright dependencies now**: Deferred because CI should remain credential-free and the package already uses driver interfaces.
- **Reuse one Browserbase session for an entire suite**: Deferred because the existing driver contract is visit-scoped and per-visit cleanup is easier to prove.
- **Store screenshots/traces directly in the driver**: Deferred to PTH14/PTH12 integration so storage credentials are configured in one workflow layer.
