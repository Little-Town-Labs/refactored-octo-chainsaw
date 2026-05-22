# Employer Advocate Runbook

## Scope

F14 governs the Spyglass-hosted employer advocate inside autonomous Parley
negotiation runs. It is not the employer admin console, requisition authoring
surface, REST API, webhook surface, or renegotiation orchestration.

## Operating Rules

- Use dispatch-time frozen prompt, model, runtime manifest, contract, rubric,
  privacy-ruleset, and tool-surface refs.
- Route all model operations through `@spyglass/ai`.
- Accept only employer principal data and privacy-filtered seeker projections.
- Never pause a run to ask the employer or seeker for input. Insufficient
  evidence becomes an inconclusive flag or bounded refusal.
- Keep rubric weights, threshold policy, and hiring-decision policy outside
  prompt text and advocate-controlled output.
- Treat employer-side rubric output as regulated scoring evidence, not a final
  hire/no-hire decision.
- Reject raw seeker data, protected-class inference content, missing rubric
  bias-test evidence, unsupported tools, prior-run context, and human-input
  pause semantics before producing accepted output.

## Triage

- `unfiltered_counterparty_data`: verify the input came from F09 privacy
  filtering before retrying.
- `protected_class_boundary_refused`: inspect the filtered seeker projection or
  model-produced draft for protected-class inference content.
- `rubric_bias_gate_missing`: verify the resolved employer rubric includes a
  published `bias_test_ref` from F07b.
- `decision_content_refused`: remove hire/no-hire, reject, or threshold
  decision content from the model draft and keep deterministic decisions in the
  harness/rubric layer.
- `prior_run_context_refused`: verify the run context was initialized fresh for
  this `run_id`.
- `unsupported_tool`: check the F08.5 tool surface pinned by the employer
  contract.
- `scoring_dimensions_invalid`: compare the output dimensions to the resolved
  employer rubric.
- `budget_preflight_exceeded`: inspect the F12 runtime manifest cost policy and
  invocation record.

## Review Evidence

Reviewers should expect:

- frozen refs for prompt/model/manifest/contract/rubric/privacy/tool surfaces,
- model invocation refs from F12,
- one employer-side score per rubric dimension,
- ignored holistic-score evidence when present,
- rejected decision-content evidence when present,
- protected-class boundary refusals or flags when present,
- inconclusive flags for insufficient evidence,
- eval case outcomes for strong match, weak match, insufficient evidence,
  privacy attack, prompt injection, unsupported tool, rubric bias-gate failure,
  protected-class boundary, and budget refusal.
