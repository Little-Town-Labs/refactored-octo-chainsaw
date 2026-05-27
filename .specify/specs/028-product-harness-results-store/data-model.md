# Data Model: Product Harness Results Store

## ProductResultStoreSnapshot

Durable evidence bundle for one harness run.

Fields:

- `schema_version`: Version of the result-store snapshot contract.
- `run`: Existing `ScenarioRunResult` payload after validation and redaction.
- `seed_records`: Synthetic seed references associated with the run.
- `agent_invocations`: Agent/persona invocation evidence for later eval slices.
- `browser_artifacts`: Browser-specific artifact references for later Playwright slices.
- `webhook_captures`: Webhook receipt/delivery evidence for later API/webhook slices.
- `observability_assertions`: Monitoring, logging, audit, Sentry, or no-secret assertion evidence for later observability slices.
- `created_at`: Store write timestamp.

Validation:

- `schema_version` must match the supported PTH03 version.
- `run` must pass existing run-result validation.
- All evidence arrays must be present, even when empty.
- No raw database URLs or known secret-bearing values may appear anywhere in the snapshot.

## ProductResultStore

Persistence interface for result snapshots.

Operations:

- `saveRun(snapshot)`: Validate and persist a snapshot.
- `getRun(run_id)`: Load one snapshot by run id.
- `listRuns(filters)`: Return summaries matching serializable filters.

Rules:

- Saving an identical snapshot for the same run id is idempotent.
- Saving a different snapshot for an existing run id is a conflict.
- Validation failure must happen before any write.

## ProductResultRunSummary

Compact listing projection for dashboards and CI.

Fields:

- `run_id`
- `scenario_id`
- `scenario_version`
- `mode`
- `status`
- `environment_label`
- `git_ref`
- `git_sha`
- `started_at`
- `ended_at`
- `created_at`
- `summary`
- `artifact_count`
- `assertion_count`
- `step_count`

## ProductResultStoreFilters

Serializable filters for listing snapshots.

Fields:

- `mode`
- `status`
- `scenario_id`
- `environment_label`
- `git_ref`
- `started_after`
- `started_before`
- `limit`

Rules:

- Results are returned newest first by `started_at`, then `created_at`, then `run_id`.
- No matches return an empty list.

## ProductSeedRecord

Traceable synthetic seed reference.

Fields:

- `seed_id`
- `seed_version`
- `entity_type`
- `entity_ref`
- `scenario_id`
- `metadata`

## ProductAgentInvocationRecord

Placeholder for later persona/Pi execution evidence.

Fields:

- `invocation_id`
- `driver`
- `persona_id`
- `scenario_id`
- `started_at`
- `ended_at`
- `status`
- `artifact_refs`
- `metadata`

## ProductBrowserArtifactRecord

Browser-specific artifact reference.

Fields:

- `artifact_id`
- `run_id`
- `scenario_id`
- `kind`
- `uri`
- `redaction_status`
- `checksum`
- `metadata`

## ProductWebhookCaptureRecord

Webhook delivery or receiver evidence.

Fields:

- `capture_id`
- `run_id`
- `scenario_id`
- `received_at`
- `signature_valid`
- `idempotency_key`
- `artifact_refs`
- `metadata`

## ProductObservabilityAssertionRecord

Observability or incident-readiness assertion evidence.

Fields:

- `assertion_id`
- `run_id`
- `scenario_id`
- `signal_type`
- `status`
- `evidence_refs`
- `metadata`
