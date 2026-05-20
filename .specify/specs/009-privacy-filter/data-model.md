# Data Model: F09 Privacy Filter

## Privacy Ruleset Version

**Purpose**: Immutable deterministic privacy policy artifact for one audience and disclosure-stage set.

**Fields**:

- `ruleset_id`: Stable logical id.
- `version`: Immutable ruleset version.
- `audience`: `seeker`, `employer`, or `platform`.
- `status`: `draft`, `published`, or `deprecated`.
- `disclosure_stages`: Ordered stage definitions.
- `allowed_fields`: Field names or classes allowed for each audience/stage.
- `redaction_rules`: Deterministic pattern/category rules.
- `refusal_rules`: Conditions that require fail-closed refusal.
- `max_input_chars`: Deterministic scan limit.
- `content_hash`: Canonical ruleset hash.
- `audit_event_id`: Publication/deprecation audit ref.
- `published_at`, `deprecated_at`, `created_at`: Lifecycle timestamps.

**Validation Rules**:

- `(ruleset_id, version)` is immutable after creation.
- Published rulesets must define at least one disclosure stage.
- Deprecated rulesets remain reviewable but are refused for new filter decisions unless used for historical reconstruction.

## Untrusted Input Envelope

**Purpose**: Sentinel-wrapped text bound to a run, nonce, and input class.

**Fields**:

- `run_id`: Parley run id.
- `nonce`: Per-run nonce.
- `input_class`: `seeker_resume`, `employer_req`, `ats_import`, `tool_returned`, or `a2a_received`.
- `source_ref`: Source object ref.
- `wrapped_text`: Text with opening and closing sentinels.
- `content_hash`: Hash of raw text.

**Validation Rules**:

- Opening and closing sentinel must match run nonce and input class.
- Payload must not contain a forged closing sentinel.
- Missing, duplicated, or mismatched sentinels fail closed.

## Filter Decision

**Purpose**: Deterministic allow/redact/refuse result for a source payload and audience.

**Fields**:

- `filter_decision_id`: Stable id.
- `run_id`: Parley run id.
- `ruleset_id`, `ruleset_version`: Applied ruleset ref.
- `audience`: Target audience.
- `disclosure_stage`: Active stage.
- `decision`: `allow`, `redact`, or `refuse`.
- `reason_code`: Stable machine-readable reason.
- `redaction_summary`: Counts/categories of redacted fields.
- `source_content_hash`: Hash/ref of source content.
- `filtered_view_ref`: Ref to the filtered projection when produced.
- `audit_event_id`: Canonical audit ref.
- `created_at`: Timestamp.

**Validation Rules**:

- Refused decisions must not include raw filtered output.
- Every decision must reference an immutable ruleset version.
- Redaction summaries must contain counts only, not raw sensitive values.

## Filtered Projection

**Purpose**: Counterparty-safe view produced by the privacy filter.

**Fields**:

- `filtered_view_ref`: Stable ref.
- `run_id`: Parley run id.
- `audience`: Target audience.
- `disclosure_stage`: Active stage.
- `ruleset_ref`: Applied ruleset id/version.
- `output`: Sanitized structured output.
- `redaction_summary`: Counts/categories.
- `created_at`: Timestamp.

**Validation Rules**:

- Output must contain only fields allowed by the active ruleset/stage.
- Empty projections must be represented as redacted/refused outcomes with stable reason codes.

## Sentinel Failure

**Purpose**: Evidence that sentinel validation failed closed.

**Fields**:

- `sentinel_failure_id`: Stable id.
- `run_id`: Parley run id.
- `input_class`: Input class.
- `reason_code`: `sentinel_missing`, `sentinel_mismatch`, `sentinel_duplicate`, or `sentinel_injection_detected`.
- `source_content_hash`: Hash/ref of offending content.
- `audit_event_id`: Canonical audit ref.
- `created_at`: Timestamp.

**Validation Rules**:

- Failure records do not store raw offending text by default.
- Failures block prompt construction or filtering that depends on the invalid envelope.

## Counterparty Access Finding

**Purpose**: CI/type-check evidence for attempted raw counterparty access.

**Fields**:

- `finding_id`: Stable id.
- `source_path`: Violating source file.
- `forbidden_access`: Forbidden import/read pattern.
- `detected_by`: Guard command or lint rule.
- `status`: `open`, `resolved`, or `expected_fixture`.
- `audit_event_id`: Optional audit ref.
- `created_at`: Timestamp.

**Validation Rules**:

- Expected failing fixtures must be isolated from production source.
- Production source findings block CI.
