# F14 Data Model: Employer Advocate Agent

F14 does not add durable tables in its first slice. It defines in-memory/package-level entities and contract payloads that F08, F10, F12, and review tooling consume.

## EmployerAdvocateRunInput

Represents one employer-side turn or scoring request.

Fields:

- `run_id`: Parley run identifier.
- `match_ticket_id`: Match ticket being negotiated.
- `side`: Must be `employer`.
- `operation`: `turn` or `score`.
- `round`: Required for turn requests.
- `employer_contract_ref`: Frozen employer contract ref.
- `prompt_ref`: Frozen prompt version ref.
- `model_ref`: Frozen model profile ref.
- `manifest_ref`: Frozen runtime manifest ref.
- `rubric_ref`: Frozen employer rubric ref.
- `privacy_ruleset_ref`: Frozen privacy ruleset ref.
- `tool_surface_ref`: Frozen employer tool-surface ref.
- `principal_view`: Employer-owned match-relevant data.
- `counterparty_projection`: Privacy-filtered seeker projection.
- `context`: Employer-side run context.
- `caller_principal`: Scoped employer advocate principal.

Validation:

- `side` must be `employer`.
- Frozen refs are required and must match the dispatch-time refs.
- Raw seeker data and protected-class inference fields are not allowed.
- Prior-run context identifiers are not allowed for a new `run_id`.
- Missing rubric bias-test evidence refuses scoring and model invocation where applicable.

## EmployerPrincipalView

Represents employer-owned role context visible to the employer advocate.

Fields:

- `employer_ticket_id`: Employer-side ticket or requisition identifier.
- `role_summary`: Match-relevant description of the role.
- `requirements`: Role requirements authorized for matching.
- `constraints`: Employer-side constraints allowed by the resolved contract.
- `threshold`: Employer-side match threshold posture.

Validation:

- Must not include hidden hiring policy, protected-class targeting, or employer admin-only notes outside the resolved principal view.
- Must be purpose-limited to the active match ticket.

## FilteredCounterpartyProjection

Represents the seeker-side information visible to the employer advocate.

Fields:

- `projection_ref`: Privacy-filter output identifier.
- `filtered`: Must be `true`.
- `payload`: Privacy-filter-approved seeker projection.

Validation:

- Raw seeker PII, unfiltered demographic data, consent-segregated bias-audit data, and protected-class inference fields are refused.
- Projection is scoped to the active `run_id` and match ticket.

## EmployerAdvocateTurnResult

Represents an employer-side negotiation turn.

Fields:

- `run_id`
- `side`: `employer`
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
- Hiring decisions, threshold decisions, and protected-class reasoning are not valid turn content.

## EmployerAdvocateScoringResult

Represents final employer-side scoring evidence.

Fields:

- `run_id`
- `side`: `employer`
- `rubric_ref`
- `dimension_scores`
- `headline_rationale`
- `flag_proposals`
- `ignored_holistic_score`
- `rejected_decision_content`
- `protected_class_boundary`
- `invocation_ref`
- `frozen_refs`
- `audit_refs`

Validation:

- Dimension IDs must exactly match the resolved employer rubric.
- Scores must be inside each dimension's allowed range.
- Duplicate, missing, or extra dimensions fail validation.
- Rubric dimensions must be authorized for the regulated surface and have required bias-test evidence.
- Holistic scores, hire/no-hire recommendations, threshold decisions, and protected-class reasoning are ignored or rejected and recorded as regression evidence.

## EmployerAdvocateRefusal

Represents a bounded non-success outcome.

Fields:

- `run_id`
- `side`: `employer`
- `operation`
- `reason_code`
- `message`
- `affected_refs`
- `audit_refs`
- `created_at`

Reason-code groups:

- Missing or invalid frozen refs.
- Missing rubric bias-test evidence.
- Unfiltered seeker data.
- Protected-class boundary violation.
- Unsupported tool or undeclared capability.
- Prompt/rendering safety issue.
- Budget, token, timeout, or gateway refusal.
- Score validation failure.
- Audit unavailable.

## EmployerAdvocateEvalCase

Represents one repeatable credibility/safety evaluation.

Fields:

- `eval_case_id`
- `category`
- `input_fixture_ref`
- `expected_outcome`
- `required_reason_codes`
- `expected_score_shape`
- `regulated_surface_expectation`
- `privacy_attack_present`
- `prompt_injection_present`
- `protected_class_attack_present`
- `budget_condition`
- `actual_outcome`
- `pass`
- `evidence_refs`

Validation:

- Required categories: strong match, weak match, insufficient evidence, privacy attack, prompt injection, unsupported tool, rubric bias-gate failure, protected-class boundary, budget refusal.
- Each eval case records frozen refs and reviewer-readable evidence.
- Eval pass/fail must be deterministic for identical fixtures.
