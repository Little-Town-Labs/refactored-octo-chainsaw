# Research: PTH15 Eval Trend and Cost Monitoring

## Decisions

- **Trend source**: derive eval trends from `ProductResultStoreSnapshot.agent_invocations`.
  - **Rationale**: PTH09 already persists persona id, provider/model, usage, cost, latency, outcome, tool traces, and evaluator summaries there.
  - **Alternative considered**: introduce a new eval table now. Rejected because PTH11 result-store snapshots already provide durable metadata and this slice is report-focused.

- **Report schema**: add an additive `eval_trends` field to suite reports.
  - **Rationale**: keeps existing report consumers compatible while making eval-specific trend data first-class.

- **Gating behavior**: keep suite status unchanged.
  - **Rationale**: roadmap decision says evals remain informational until stability and cost thresholds are measured.

- **Safety boundary**: omit transcript excerpts, prompt refs, and raw tool payloads from trend points.
  - **Rationale**: trend data should be safe to include in CI artifacts and later dashboards.

## Open Follow-Up

- PTH16 should document how operators interpret trend movement and when to propose a release-blocking threshold.
