# Seeker Advocate Runbook

## Scope

F13 governs the Spyglass-hosted seeker advocate inside autonomous Parley
negotiation runs. It is not the interactive seeker conversation surface,
and it does not implement employer-side advocate behavior.

## Operating Rules

- Use dispatch-time frozen prompt, model, runtime manifest, contract,
  rubric, privacy-ruleset, and tool-surface refs.
- Route all model operations through `@spyglass/ai`.
- Accept only seeker principal data and privacy-filtered employer
  projections.
- Never pause a run to ask the seeker for input. Insufficient evidence
  becomes an inconclusive flag or bounded refusal.
- Keep rubric weights and scoring policy outside prompt text.

## Triage

- `unfiltered_counterparty_data`: verify the input came from F09 privacy
  filtering before retrying.
- `prior_run_context_refused`: verify the run context was initialized
  fresh for this `run_id`.
- `unsupported_tool`: check the F08.5 tool surface pinned by the seeker
  contract.
- `scoring_dimensions_invalid`: compare the output dimensions to the
  resolved seeker rubric.
- `budget_preflight_exceeded`: inspect the F12 runtime manifest cost
  policy and invocation record.

## Review Evidence

Reviewers should expect:

- frozen refs for prompt/model/manifest/contract/rubric/privacy/tool
  surfaces,
- model invocation refs from F12,
- one seeker-side score per rubric dimension,
- ignored holistic-score evidence when present,
- inconclusive flags for insufficient evidence,
- eval case outcomes for strong match, weak match, insufficient evidence,
  privacy attack, prompt injection, unsupported tool, and budget refusal.
