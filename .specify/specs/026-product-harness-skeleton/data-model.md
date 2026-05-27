# Data Model: Product Harness Skeleton

## ProductScenario

Represents a versioned product-readiness or eval scenario.

**Fields**: `scenario_id`, `version`, `title`, `description`, `mode`, `owner`, `tags`, `steps`.

**Validation**:

- `scenario_id` is required and stable across runs.
- `version` is required and changes when scenario meaning changes.
- `mode` is one of `gate` or `eval`.
- At least one step is required.
- Tags are optional but must be safe labels, not secrets or personal data.

## ScenarioRun

Represents one execution of a scenario.

**Fields**: `run_id`, `scenario`, `environment`, `git`, `started_at`, `ended_at`, `duration_ms`, `status`, `steps`, `assertions`, `artifacts`, `summary`, `metadata`.

**Validation**:

- `status` is one of `passed`, `failed`, or `invalid`.
- `ended_at` must not precede `started_at`.
- Failed or invalid steps/assertions force the run status to `failed` or `invalid`.
- Metadata must be safe for logs and reports.

## ScenarioStep

Represents an ordered action or checkpoint inside a run.

**Fields**: `step_id`, `order`, `name`, `status`, `started_at`, `ended_at`, `duration_ms`, `evidence_refs`, `metadata`, `error`.

**Validation**:

- `order` is unique within a run.
- `status` is one of `passed`, `failed`, or `skipped`.
- Failed steps may include a redacted error summary.
- Evidence refs must be opaque references, not raw sensitive data.

## ScenarioAssertion

Represents an expected condition checked by a scenario.

**Fields**: `assertion_id`, `name`, `severity`, `status`, `expected`, `actual`, `evidence_refs`, `metadata`.

**Validation**:

- `severity` is one of `blocker`, `major`, `minor`, or `info`.
- `status` is one of `passed`, `failed`, or `skipped`.
- Failed blocker or major assertions fail the run.
- Expected and actual values should be summaries safe for reports.

## RunArtifact

Represents a pointer to supporting evidence.

**Fields**: `artifact_id`, `label`, `type`, `uri`, `redaction_status`, `checksum`, `metadata`.

**Validation**:

- `type` is one of `json`, `markdown`, `screenshot`, `video`, `trace`, `webhook_capture`, `agent_transcript`, `log_excerpt`, or `other`.
- `label` and `uri` are required.
- `redaction_status` is one of `not_required`, `redacted`, or `contains_sensitive_synthetic_data`.
- Artifact content is referenced, not embedded in the run result.

## RunReport

Represents generated outputs for a run.

**Fields**: `json_result`, `markdown_summary`, `artifact_refs`.

**Validation**:

- JSON output must preserve all required top-level run fields.
- Markdown output must include scenario id, scenario title, mode, status, duration, steps, assertions, artifacts, and failed assertions when present.
