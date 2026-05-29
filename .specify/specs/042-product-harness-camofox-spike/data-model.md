# Data Model: PTH17 Camofox Browser Evaluation Spike

## Browser Option

Represents one browser execution option under evaluation.

Fields:

- `name`: Browserbase, stock Playwright, or Camofox/Camoufox.
- `primary_use`: Intended role in Spyglass product harness.
- `dependency_shape`: Managed provider, package dependency, or local browser binary.
- `artifact_support`: Screenshots, traces, videos, replay/session refs, and logs.
- `security_posture`: Credential handling and first-party-only suitability.
- `maintenance_risk`: Upgrade and ecosystem risk.

## Evaluation Criterion

Represents a decision dimension for the comparison matrix.

Fields:

- `criterion`: Setup cost, pass-rate evidence, artifact support, security posture, maintenance risk, CI determinism, contract fit, or operational fit.
- `browser_option`: Candidate being evaluated.
- `rating`: Strong, acceptable, weak, or unknown.
- `notes`: Evidence and rationale.

## Adapter Decision

Represents the spike outcome.

Fields:

- `recommendation`: Build now, defer, or reject.
- `trigger_conditions`: Conditions that would reopen adapter work.
- `non_goals`: Explicitly excluded use cases.
- `next_feature_scope`: What a future adapter implementation would include.

## Future Adapter Boundary

Represents how a future Camofox adapter would fit the product harness.

Fields:

- `contract`: `BrowserJourneyDriver`.
- `config_source`: Environment or explicit constructor options.
- `test_strategy`: Fake-backed deterministic unit tests first.
- `artifact_strategy`: Reuse existing browser artifact and run artifact metadata.
- `security_constraints`: No raw secrets, no credential-bearing URLs, first-party URLs only.
