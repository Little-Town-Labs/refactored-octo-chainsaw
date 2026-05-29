# PTH17 Camofox Browser Evaluation

## Recommendation

Defer building a Camofox/Camoufox adapter now.

Browserbase remains the primary preview/prod browser execution path for Alpha canaries. Stock Playwright remains acceptable for local development and deterministic synthetic browser coverage. Camofox/Camoufox should be revisited only if first-party Spyglass preview/prod surfaces show browser-automation friction that Browserbase cannot resolve with acceptable reliability, artifact coverage, and cost.

This spike does not add dependencies, workflows, or release gates.

## Scope And Non-Goals

Scope:

- Evaluate whether Camofox/Camoufox should become an optional fallback behind the existing `BrowserJourneyDriver` contract.
- Compare Camofox/Camoufox with Browserbase and stock Playwright for first-party Spyglass preview/prod testing.
- Define trigger conditions and a future adapter boundary.

Non-goals:

- No package dependency changes.
- No live Camofox/Camoufox browser run.
- No new GitHub Actions workflow.
- No third-party scraping or access-control bypass evaluation.
- No change to Alpha release-blocking criteria.

## Current Harness Baseline

The product harness already has three relevant browser layers:

| Layer | Current role |
| --- | --- |
| `SyntheticBrowserJourneyDriver` | Deterministic local/package test coverage without browser or network dependencies. |
| Stock Playwright-compatible journey contract | Stable `BrowserJourneyDriver` shape for local or provider-backed execution. |
| `BrowserbaseBrowserJourneyDriver` | Managed preview/prod replay and canary path with session refs, safe evidence, cleanup, env validation, and fake-backed tests. |

The key adapter boundary is `BrowserJourneyDriver`. Any future Camofox/Camoufox implementation should follow the Browserbase pattern: injectable launch/session dependencies, deterministic fake tests, safe evidence refs, and no live browser requirement in default CI.

## Camofox/Camoufox Upstream Notes

The project name appears in two common forms:

- **Camoufox**: upstream browser/docs spelling.
- **Camofox**: shorthand used in the roadmap and some community/package references.

Current upstream documentation describes Camoufox as Playwright-compatible with only browser initialization changes, and it accepts Playwright Firefox launch options plus fingerprint, humanization, headless, locale, and related configuration. The docs also describe engine-level fingerprint spoofing, a Firefox foundation, human-like mouse movement, and device/fingerprint consistency goals.

The upstream GitHub README also calls out maintenance realities: active browser development is split across other repositories, the visible repo is used for checkpoint releases, alpha releases use a separate package, and the README warns that Camoufox had a maintenance gap and performance/fingerprint consistency issues while active development resumes.

Those notes make Camofox/Camoufox interesting as a fallback, but not a low-risk default for Alpha canary infrastructure.

## Comparison Matrix

| Criterion | Browserbase | Stock Playwright | Camofox/Camoufox |
| --- | --- | --- | --- |
| Primary Spyglass role | Preview/prod canaries and managed replay. | Local development and deterministic browser contract validation. | Optional fallback if first-party preview/prod surfaces expose bot-detection friction. |
| Setup cost | Moderate; already integrated through PTH13/PTH14 env and driver contracts. | Low; existing ecosystem and local workflow. | Medium to high; likely new package/binary, Firefox-fork behavior, and CI/runtime installation decisions. |
| Pass-rate evidence | Existing fake-backed tests and canary workflow integration; live pass rate still measured through operations. | Strong for local deterministic journeys; may diverge from deployed provider behavior. | Unknown for Spyglass until a controlled first-party trial exists. |
| Artifact support | Strong fit; session refs, replay/artifact refs, screenshots/traces can map to existing metadata. | Strong in standard Playwright contexts. | Unknown until adapter trial; should map artifacts through existing browser artifact metadata. |
| Security posture | Managed provider credentials are already modeled and redacted. | No provider credentials for local use. | Must be first-party only; anti-detection features need explicit policy boundaries. |
| Maintenance risk | Provider dependency and cost risk, but current roadmap accepts it. | Low to moderate; mainstream test tooling. | High enough to defer: Firefox fork, fingerprint rotation upkeep, package naming/development split, and upstream maintenance caveats. |
| CI determinism | Good when fake-backed; live canaries run only when configured. | Good for local deterministic tests. | Must be fake-backed by default; live binary install in CI would be a risk. |
| `BrowserJourneyDriver` fit | Proven by current implementation. | Proven by synthetic and Playwright-compatible contracts. | Likely feasible because Camoufox is Playwright-compatible, but needs a small proof adapter before adoption. |
| Operational fit | Already documented in Alpha operations runbook. | Useful for development, not sufficient as managed preview/prod evidence. | Only useful if it improves first-party friction enough to justify added upkeep. |

## Decision Criteria

Build a Camofox/Camoufox adapter only if at least one trigger occurs:

1. Browserbase preview/prod canaries repeatedly fail due to browser/provider fingerprint friction rather than product defects.
2. Stock Playwright and Browserbase produce materially different first-party journey outcomes that cannot be resolved through configuration.
3. A specific Alpha-critical journey needs a Firefox/fingerprint-resistant run to produce reliable evidence.
4. The team accepts the maintenance, security, and CI costs of a second live browser path.

Reject or continue deferring if:

1. Browserbase canaries are stable enough for Alpha operations.
2. Failures are product regressions, environment config issues, or artifact storage issues rather than browser-detection friction.
3. The only proposed use case is third-party scraping, bypassing access controls, or generalized anti-bot work.

## Future Adapter Boundary

A future Camofox/Camoufox adapter should be a separate feature and should not reuse this spike as an implementation shortcut.

Expected scope:

- Add a `CamofoxBrowserJourneyDriver` or similarly named adapter behind `BrowserJourneyDriver`.
- Keep all live Camofox/Camoufox launcher dependencies injectable.
- Add env/config parsing only for first-party preview/prod use.
- Reuse existing `BrowserJourneyVisitInput` and `BrowserJourneyVisitResult`.
- Reuse existing browser artifact and run artifact metadata shapes.
- Return safe evidence refs only.
- Keep Browserbase as the default preview/prod canary path unless a later decision changes it.

Files likely touched in a future build:

- `packages/product-test-harness/src/browser/`
- `packages/product-test-harness/src/__tests__/`
- `packages/product-test-harness/src/index.ts`
- `docs/testing/product-harness/roadmap.md`
- A new Spec Kit feature directory

## Future Validation Plan

A future adapter build should include:

1. Fake-backed unit tests for launch/session creation, visit delegation, failure mapping, cleanup, and safe evidence refs.
2. Compatibility tests proving existing browser journeys can run through the adapter contract.
3. Config validation tests for missing/unsafe env.
4. A local opt-in smoke command that is skipped unless explicitly configured.
5. A first-party preview trial comparing Browserbase, stock Playwright, and Camofox/Camoufox on the same journey set.
6. Artifact comparison for screenshots, traces, videos, console logs, network refs, and run metadata.

No default CI job should download or launch Camofox/Camoufox unless a later roadmap decision approves the cost and reliability tradeoff.

## Security And Compliance Constraints

- Use only first-party Spyglass preview/prod surfaces.
- Do not use Camofox/Camoufox for third-party scraping or access-control bypass.
- Do not store raw browser credentials, proxy credentials, or credential-bearing URLs.
- Preserve evidence refs rather than copying personal data into docs or tickets.
- Keep eval/canary gating behavior unchanged until explicitly approved.

## Sources

- Camoufox documentation: https://camoufox.com/
- Camoufox Python usage documentation: https://camoufox.com/python/usage/
- Camoufox GitHub README: https://github.com/daijro/camoufox
