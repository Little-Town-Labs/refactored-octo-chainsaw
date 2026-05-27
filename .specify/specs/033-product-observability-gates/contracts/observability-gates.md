# Observability Gate Contracts

PTH08 introduces typed library contracts for deterministic observability and incident gate execution.

## Signal Contract

- signal id
- signal type: audit, monitoring, sentry, log, incident, or other
- status
- severity
- observed timestamp
- safe evidence refs
- safe metadata

## Audit Contract

- audit action
- actor ref
- subject ref
- outcome
- evidence refs

## Monitoring Contract

- metric name
- value
- unit
- budget
- comparison
- evidence refs

## Sentry Config Contract

- release ref
- environment label
- redacted DSN ref
- enabled flag
- sample-rate metadata

Raw DSN values are never persisted.

## Incident Evidence Contract

- incident ref
- severity
- owner ref
- trigger refs
- response status
- safe metadata

## Log Safety Contract

- valid boolean
- deterministic reason code when invalid
- forbidden paths for unsafe nested values
