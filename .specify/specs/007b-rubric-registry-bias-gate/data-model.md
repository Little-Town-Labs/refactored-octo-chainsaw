# Data Model: F07b Rubric Registry + Bias-Test Dispatch Gate

## Rubric Version

Immutable scoring policy artifact addressed by `(rubric_id, version)`.

**Fields**:

- `rubric_version_id`: stable internal identifier
- `rubric_id`: external rubric family id
- `version`: semantic or calendar version string
- `side`: `seeker`, `employer`, or `both`
- `status`: `draft`, `published`, `deprecated`, or `retired`
- `dimensions`: ordered list of rubric dimensions
- `aggregation_policy`: deterministic score aggregation rules
- `bias_test_ref`: nullable reference to a bias-test artifact; required for production dispatch
- `content_hash`: canonical hash of the rubric definition
- `description`: non-empty release description
- `author_principal_id`: publishing author
- `reviewer_principal_id`: reviewer required for publication
- `published_at`: timestamp required for published versions
- `deprecated_after`: optional cutoff for new dispatch
- `audit_event_id`: canonical F05 audit event id
- `created_at`: creation timestamp

**Validation rules**:

- `(rubric_id, version)` is unique and immutable.
- Published rubrics require reviewer, publication timestamp, audit event, and `bias_test_ref`.
- Dimension ids are unique within a rubric version.
- Dimension weights must be non-negative and have a non-zero total.
- Prompt text, scoring guidance for prompt rendering, and model instructions are not stored in the rubric version.

## Rubric Dimension

Dimension-level scoring unit embedded in a rubric version.

**Fields**:

- `dimension_id`: stable id within the rubric version
- `label`: human-readable label
- `description`: reviewer-facing purpose
- `min_score`: lower bound
- `max_score`: upper bound
- `weight`: numeric weight before normalization
- `evidence_expectations`: short description of expected evidence
- `required`: whether missing score fails aggregation

**Validation rules**:

- `min_score` must be lower than `max_score`.
- Required dimensions must have a submitted score before weighted totals are computed.
- Scores outside the allowed range fail closed.

## Bias-Test Artifact

Compliance evidence that a rubric version completed a declared bias-test process.

**Fields**:

- `bias_test_artifact_id`: stable artifact identifier
- `rubric_id`: rubric family id
- `rubric_version`: rubric version string
- `rubric_content_hash`: hash this artifact validates
- `methodology_ref`: versioned methodology policy artifact
- `status`: `draft`, `completed`, `rejected`, `superseded`, or `expired`
- `jurisdiction_coverage`: declared posture or jurisdiction set covered
- `reviewer_principal_id`: compliance reviewer
- `completed_at`: completion timestamp for completed artifacts
- `expires_at`: optional expiration timestamp
- `artifact_uri`: evidence package location or durable ref
- `audit_event_id`: canonical F05 audit event id
- `created_at`: creation timestamp

**Validation rules**:

- Dispatch-eligible artifacts must be `completed`.
- Completed artifacts require reviewer, completion timestamp, methodology ref, jurisdiction coverage, artifact URI, and audit event.
- Artifact `rubric_content_hash` must match the resolved rubric version.
- Expired, rejected, superseded, or draft artifacts do not unlock production dispatch.

## Rubric Event

Append-only evidence row for rubric publication and deprecation.

**Fields**:

- `rubric_event_id`: stable event identifier
- `rubric_version_id`: associated rubric version
- `event_type`: `published` or `deprecated`
- `reason_code`: closed-list release reason
- `principal_id`: actor
- `reviewer_principal_id`: reviewer if applicable
- `correlation_id`: workflow correlation id
- `audit_event_id`: canonical F05 audit event id
- `created_at`: event timestamp

## Rubric Dispatch Gate Event

Append-only evidence row for dispatch gate decisions, especially refusals.

**Fields**:

- `gate_event_id`: stable event identifier
- `rubric_id`: attempted rubric id
- `rubric_version`: attempted version
- `decision`: `allow` or `deny`
- `reason_code`: stable dispatch reason
- `bias_test_artifact_id`: artifact used when available
- `audit_event_id`: canonical F05 audit event id
- `correlation_id`: dispatch or workflow correlation id
- `created_at`: event timestamp

**Reason codes**:

- `rubric_missing`
- `rubric_unpublished`
- `rubric_deprecated`
- `rubric_invalid`
- `rubric_missing_bias_test`
- `rubric_bias_test_incomplete`
- `rubric_bias_test_mismatched_hash`
- `rubric_bias_test_expired`
- `rubric_bias_test_insufficient_coverage`
- `rubric_gate_allowed`

## Weighted Score Result

Pure computed output for one rubric-scored response.

**Fields**:

- `rubric_id`
- `rubric_version`
- `dimension_scores`: submitted per-dimension scores
- `normalized_weights`: normalized weights used for aggregation
- `total_score`: deterministic weighted total
- `rounding_policy`: named rounding rule
- `model_holistic_score_ignored`: boolean
- `regression_signal_ref`: audit/regression ref when model holistic score appears

**Validation rules**:

- Required dimension scores must be present.
- Scores must fall within each dimension range.
- Final total is computed only from dimension scores and normalized weights.
- Model holistic score never contributes to `total_score`.

## Relationships

- One rubric version can reference one dispatch-eligible bias-test artifact.
- One rubric version can have many rubric events.
- One rubric version can have many dispatch gate events.
- One bias-test artifact belongs to one rubric id/version and content hash.
- Future F08 dispatch consumes rubric gate results but does not own rubric storage.
- Future F10 dossiers record rubric version and weighted score result metadata.
