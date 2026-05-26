# F24 Threat Model

## Scope

Incident-response primitives, monitoring-signal classification, breach-notification deadline tracking, evidence references, runbooks, and tabletop evidence.

## Key Threats

| Threat | Control | Residual risk |
| --- | --- | --- |
| Sev-1 signal downgraded or missed | Cross-side leakage and audit-chain failures hard-classify as sev-1 in code and tests | Upstream subsystem may fail to emit source event |
| Alert fatigue or dedupe collision hides repeated abuse | Dedupe key includes source, category, and affected subject | Future sinks need rate-limit review |
| Breach clock miscalculated | GDPR supervisory deadline computed from awareness + 72 hours with tests | Counsel still determines applicability |
| Evidence overcollection creates secondary PII store | Evidence helper rejects raw payload-shaped refs; runbooks require minimal references | Human operators can still paste sensitive text into external systems |
| Unauthorized incident mutation | Package requires principal IDs on timeline entries; no anonymous route surface is added | Future UI/API must pass principal coverage gate |
| Sentry outage or missing config | Production-like `SENTRY_DSN` assertion and monitoring sink failure category | Out-of-band paging setup remains operational work |

## Residual Findings

- No CRITICAL or HIGH residual risks in the package slice.
- MEDIUM: future operator UI/API must repeat AAA and principal-coverage review.
- MEDIUM: upstream emitters still need integration wiring after this package-first slice.
