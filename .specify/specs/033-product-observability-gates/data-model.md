# Data Model: Observability and Incident Gate Scenarios

## Observability Signal

- `signal_id`: stable synthetic identifier.
- `signal_type`: audit, monitoring, sentry, log, incident, or other.
- `status`: passed, failed, or skipped.
- `severity`: blocker, major, minor, or info.
- `observed_at`: ISO timestamp.
- `evidence_refs`: safe evidence references.
- `metadata`: safe structured details.

Validation rules:

- Identifiers, timestamp, status, severity, and evidence refs must be present.
- Metadata must not contain raw secrets, credentials, database URLs, protected-class data, or private seeker content.

## Audit Signal

- `action`: stable product action.
- `actor_ref`: principal or service ref.
- `subject_ref`: ticket, req, match, or incident subject ref.
- `outcome`: allowed, denied, emitted, suppressed, or failed.

Validation rules:

- Required audit gates fail when any expected action is missing.
- Actor and subject refs are required for accountability.

## Monitoring Signal

- `metric_name`: stable metric identifier.
- `value`: numeric synthetic measurement.
- `unit`: ms, usd, count, or ratio.
- `budget`: numeric threshold.
- `comparison`: max or min.

Validation rules:

- Signals fail when values violate their declared budget.
- Latency and cost metadata must persist in safe form.

## Sentry Config Evidence

- `release`: release ref.
- `environment`: environment label.
- `dsn_ref`: redacted DSN reference, never raw DSN.
- `traces_sample_rate`: number from 0 through 1.
- `enabled`: whether reporting is enabled.

Validation rules:

- Release, environment, redacted DSN ref, enabled status, and sample rate are required.
- Raw DSN strings are forbidden.

## Incident Evidence

- `incident_ref`: stable synthetic incident reference.
- `severity`: sev1, sev2, sev3, or sev4.
- `owner_ref`: accountable owner reference.
- `trigger_refs`: one or more signal references.
- `response_status`: opened, acknowledged, mitigated, or closed.

Validation rules:

- Incident readiness fails when owner, severity, trigger refs, or response status are missing.

## Log Safety Result

- `valid`: whether content is safe to persist.
- `reason_code`: deterministic reason for failure when invalid.
- `forbidden_paths`: JSON-style paths to unsafe content.

Validation rules:

- Unsafe values are reported by path and are never copied into persisted result metadata.
