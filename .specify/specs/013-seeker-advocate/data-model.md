# F13 Data Model: Seeker Advocate Agent

F13 does not add durable tables in its first slice. It defines in-memory/package-level entities and contract payloads that F08, F10, F12, and review tooling consume.

## SeekerAdvocateRunInput

Represents one seeker-side turn or scoring request.

Fields:

- `run_id`: Parley run identifier.
- `match_ticket_id`: Match ticket being negotiated.
- `side`: Must be `seeker`.
- `operation`: `turn` or `score`.
- `round`: Required for turn requests.
- `seeker_contract_ref`: Frozen seeker contract ref.
- `prompt_ref`: Frozen prompt version ref.
- `model_ref`: Frozen model profile ref.
- `manifest_ref`: Frozen runtime manifest ref.
- `rubric_ref`: Frozen seeker rubric ref.
- `privacy_ruleset_ref`: Frozen privacy ruleset ref.
- `tool_surface_ref`: Frozen seeker tool-surface ref.
- `principal_view`: Seeker-owned match-relevant data.
- `counterparty_projection`: Privacy-filtered employer projection.
- `context`: Seeker-side run context.
- `caller_principal`: Scoped seeker advocate principal.

Validation:

- `side` must be `seeker`.
- Frozen refs are required and must match the dispatch-time refs.
- Raw employer-side confidential fields are not allowed.
- Prior-run context identifiers are not allowed for a new `run_id`.

## SeekerAdvocateTurnResult

Represents a seeker-side negotiation turn.

Fields:

- `run_id`
- `side`: `seeker`
- `round`
- `message_to_counterparty`
- `internal_rationale`
- `done_signal`
- `flag_proposals`
- `invocation_ref`
- `frozen_refs`
- `audit_refs`

Validation:

- `message_to_counterparty` is required unless the result is a refusal.
- Human-input requests are not allowed.
- Invocation and frozen refs must be present for accepted model-backed turns.

## SeekerAdvocateScoringResult

Represents final seeker-side scoring evidence.

Fields:

- `run_id`
- `side`: `seeker`
- `rubric_ref`
- `dimension_scores`
- `headline_rationale`
- `flag_proposals`
- `ignored_holistic_score`
- `invocation_ref`
- `frozen_refs`
- `audit_refs`

Validation:

- Dimension IDs must exactly match the resolved seeker rubric.
- Scores must be inside each dimension's allowed range.
- Duplicate, missing, or extra dimensions fail validation.
- Holistic scores are ignored and recorded as regression evidence.

## SeekerAdvocateRefusal

Represents a bounded non-success outcome.

Fields:

- `run_id`
- `side`: `seeker`
- `operation`
- `reason_code`
- `message`
- `affected_refs`
- `audit_refs`
- `created_at`

Reason-code groups:

- Missing or invalid frozen refs.
- Unfiltered counterparty data.
- Unsupported tool or undeclared capability.
- Prompt/rendering safety issue.
- Budget, token, timeout, or gateway refusal.
- Score validation failure.
- Audit unavailable.

## SeekerAdvocateEvalCase

Represents one repeatable credibility/safety evaluation.

Fields:

- `eval_case_id`
- `category`
- `input_fixture_ref`
- `expected_outcome`
- `required_reason_codes`
- `expected_score_shape`
- `privacy_attack_present`
- `prompt_injection_present`
- `budget_condition`
- `actual_outcome`
- `pass`
- `evidence_refs`

Validation:

- Required categories: strong match, weak match, insufficient evidence, privacy attack, prompt injection, unsupported tool, budget refusal.
- Each eval case records frozen refs and reviewer-readable evidence.
- Eval pass/fail must be deterministic for identical fixtures.
