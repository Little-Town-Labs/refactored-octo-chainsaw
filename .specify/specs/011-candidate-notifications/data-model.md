# Data Model: F11 Candidate Notification Artifact System

## Notice Template Version

Immutable versioned definition of a candidate notice category.

Fields:

- `template_id`: Stable logical template id.
- `version`: Immutable version string.
- `status`: `draft`, `published`, `retired`, or `superseded`.
- `notice_category`: `advance_aedt_notice`, `outcome_transparency`, `inconclusive_outcome`, or `policy_update`.
- `jurisdiction_scope`: Jurisdiction codes covered by this version.
- `content_ref`: Pointer to approved content source.
- `content_hash`: Deterministic hash of approved template content metadata.
- `effective_from`, `effective_until`: Version applicability window.
- `published_at`: Publication timestamp.
- `audit_event_id`: Audit evidence ref.

Validation:

- Published versions require non-empty `content_ref`, `content_hash`, and `published_at`.
- `(template_id, version)` is unique and immutable.
- Retired/superseded versions remain readable for artifacts that pin them.

## Candidate Notification Artifact

Structured notice evidence created from a produced dossier event.

Fields:

- `artifact_id`: Unique artifact id.
- `match_id`: Match ticket ref.
- `run_id`: Parley run ref.
- `dossier_id`: F10 dossier ref.
- `candidate_principal_id`: Candidate recipient principal ref.
- `notice_category`: Candidate notice category.
- `status`: `ready`, `blocked`, `superseded`, or `delivered_intent_created`.
- `template_id`, `template_version`: Pinned notice template ref.
- `jurisdiction_refs`: Jurisdictions considered for the notice.
- `policy_ref`: Jurisdiction notice policy ref/version.
- `timing`: Notice timing evidence object.
- `content_refs`: Safe notice content refs, not raw transcript content.
- `content_hash`: Deterministic hash of canonical artifact content.
- `reason_code`: Creation reason or refusal reason.
- `audit_event_id`: Audit evidence ref.
- `created_at`: Creation timestamp.

Validation:

- Ready artifacts require candidate, match, dossier, template, policy, timing, and content refs.
- Inconclusive outcome artifacts must carry a safe reason code.
- Rebuilding identical canonical content produces the same `content_hash`.

## Notice Timing Evidence

Evidence used for notice timing and delivery readiness.

Fields:

- `basis`: `none`, `advance_notice`, `outcome_notice`, or `policy_update`.
- `produced_at`: Dossier-produced or artifact-produced timestamp.
- `required_notice_by`: Required notice timestamp when policy sets a latest notice time.
- `earliest_delivery_at`: Earliest permitted delivery timestamp when advance notice is required.
- `business_days_required`: Business days required before delivery.
- `calendar_ref`: Calendar/policy evidence ref used to calculate dates.

Validation:

- Advance notice timing requires `earliest_delivery_at`.
- Business-day counts cannot be negative.

## Delivery Gate Evaluation

Immutable evaluation of whether delivery may proceed.

Fields:

- `gate_event_id`: Unique event id.
- `artifact_id`: Candidate notification artifact ref.
- `match_id`: Match ticket ref.
- `decision`: `allowed` or `refused`.
- `reason_code`: Stable reason code.
- `evaluated_at`: Evaluation timestamp.
- `policy_ref`: Policy ref/version used by the gate.
- `audit_event_id`: Audit evidence ref.

Reason codes:

- `notice_ready`
- `missing_artifact`
- `artifact_blocked`
- `template_not_published`
- `template_superseded`
- `not_yet_eligible`
- `missing_recipient`
- `invalid_payload`
- `policy_blocked`

## Notification Delivery Command

Channel-agnostic command for later delivery adapters.

Fields:

- `command_id`: Unique command id.
- `artifact_id`: Candidate notification artifact ref.
- `candidate_principal_id`: Candidate recipient principal ref.
- `notice_category`: Notice category.
- `channel_intent`: `email`, `telegram`, `web`, `a2a`, or `unspecified`.
- `idempotency_key`: Deterministic key for the same artifact, recipient, category, and channel intent.
- `content_hash`: Artifact content hash.
- `delivery_window`: Earliest/latest delivery metadata.
- `status`: `pending`, `claimed`, `sent`, `cancelled`, or `failed`.
- `created_at`: Creation timestamp.
- `audit_event_id`: Audit evidence ref.

Validation:

- Commands can only be created after an allowed gate evaluation.
- Idempotency key is stable for repeated command generation.
