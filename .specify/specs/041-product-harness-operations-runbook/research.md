# Research: PTH16 Alpha Harness Operations Runbook

## Decision: Put the operator runbook under `docs/runbooks/`

**Rationale**: The document is an operational procedure used during setup, canary execution, triage, and escalation. Existing operational guidance lives in `docs/runbooks/`, while `docs/testing/product-harness/` contains the PRD and roadmap.

**Alternatives considered**: Adding the runbook under `docs/testing/product-harness/` would keep harness docs together but would make the operational index less complete.

## Decision: Document exact env names without example secret values

**Rationale**: PTH14 canary validation already defines the required env names. The runbook should preserve exact strings for operator searchability while avoiding secret leakage and secret-shaped examples.

**Alternatives considered**: Providing sample URLs or tokens was rejected because fixtures can trigger scanners or encourage copying values into docs.

## Decision: Treat eval trend guidance as informational

**Rationale**: The roadmap decision says LLM/persona evals stay informational until stability and cost are measured. The runbook should tell operators how to read trend movement and when to escalate, not turn trends into a release gate.

**Alternatives considered**: Adding provisional thresholds was rejected because threshold approval is outside PTH16 scope.

## Decision: Use a response matrix for common failure classes

**Rationale**: Operators need fast classification. A matrix maps missing config, Neon persistence, Browserbase, artifact storage, report regression, and privacy/security signals to first checks, evidence, and escalation paths.

**Alternatives considered**: A narrative-only troubleshooting section was rejected because it is slower to scan during an incident.
