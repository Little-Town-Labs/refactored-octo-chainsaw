# Monitoring Signals

F24 normalizes security-relevant observations into `MonitoringSignal` records before an incident is opened. The signal envelope carries source, category, severity, dedupe key, affected reference, minimal evidence reference, and escalation hint.

## Sources

- `privacy_filter`: bypass attempts and cross-side leakage markers.
- `audit_log`: hash-chain verification failures and integrity anomalies.
- `auth`: repeated authentication failures or suspicious assurance changes.
- `credential_lifecycle`: revoked credential use, credential compromise drills, and rotation anomalies.
- `employer_api`: organization-scoped API abuse or unexpected idempotency conflict patterns.
- `webhook_delivery`: replay, signature abuse, or endpoint abuse.
- `notification_deadline`: approaching or missed breach-notification deadlines.

## Severity Rules

- `cross_side_leakage` is always `sev1`.
- `audit_chain_integrity_failure` is always `sev1`.
- Credential misuse, webhook signature abuse, monitoring sink failure, and approaching notification deadlines default to `sev2`.
- Auth anomalies and employer API abuse default to `sev3` unless the caller explicitly raises severity.

## Evidence

Signals store evidence references, not copied payloads. References may point to audit events, hash-chain verification output, credential events, webhook events, API request IDs, match tickets, dossiers, external issues, or runbook exercise artifacts.
