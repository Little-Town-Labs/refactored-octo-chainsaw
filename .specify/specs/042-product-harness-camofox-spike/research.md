# Research: PTH17 Camofox Browser Evaluation Spike

## Decision: Defer a Camofox adapter unless Browserbase or stock Playwright shows first-party friction

**Rationale**: Browserbase is already implemented for preview/prod replay and canaries. Camofox/Camoufox has interesting fingerprint-resistance properties, but adding it now would introduce a second browser stack before Spyglass has evidence that first-party preview/prod surfaces need it.

**Alternatives considered**: Building an adapter immediately was rejected because the spike is optional and the existing canary path is complete.

## Decision: Use `BrowserJourneyDriver` as the future adapter boundary

**Rationale**: Product harness browser journeys already run through `BrowserJourneyDriver`, and Browserbase was added behind that contract. A future Camofox driver should follow the same pattern with deterministic fake-backed tests.

**Alternatives considered**: Adding a separate Camofox command or workflow was rejected because it would duplicate canary plumbing.

## Decision: Treat upstream maintenance as a material risk

**Rationale**: Current upstream notes say active browser development is split across repositories, checkpoint releases are used as the source of truth, and the project has had maintenance/performance caveats. That risk matters for Alpha canary infrastructure.

**Alternatives considered**: Treating Camofox as a drop-in replacement was rejected because a Firefox fork with fingerprint rotation has different upkeep and behavior risk than managed Browserbase.

## Decision: Restrict scope to first-party testing

**Rationale**: Spyglass needs reliable evidence for its own preview/prod surfaces, not third-party scraping. Any future Camofox use must be limited to first-party testing where anti-bot friction interferes with legitimate canary execution.

**Alternatives considered**: Evaluating third-party anti-bot bypass performance was rejected as outside product-harness scope.

## Source Notes

- Camoufox docs describe Playwright compatibility and browser initialization changes.
- Camoufox docs describe fingerprint spoofing, Firefox basis, and humanized interaction features.
- Upstream GitHub README notes active browser development locations, checkpoint releases, and maintenance/performance caveats.
