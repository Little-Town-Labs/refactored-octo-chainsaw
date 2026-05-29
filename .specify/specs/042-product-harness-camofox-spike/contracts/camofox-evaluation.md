# Contract: PTH17 Camofox Evaluation

The PTH17 evaluation is complete when `docs/testing/product-harness/camofox-evaluation.md` contains the following sections.

## Required Sections

- Recommendation
- Scope and non-goals
- Current harness baseline
- Camofox/Camoufox upstream notes
- Comparison matrix
- Build/defer/reject decision criteria
- Future adapter boundary
- Validation plan for a future adapter
- Security and compliance constraints
- Sources

## Required Comparison Options

- Browserbase
- Stock Playwright
- Camofox/Camoufox

## Required Decision Criteria

- setup cost
- pass-rate evidence
- artifact support
- security posture
- maintenance risk
- CI determinism
- `BrowserJourneyDriver` fit
- operational fit

## Non-Goals

- Do not add a package dependency.
- Do not add a live Camofox browser run.
- Do not add a new GitHub Actions workflow.
- Do not make Camofox release-blocking.
- Do not evaluate third-party scraping or access-control bypass.
