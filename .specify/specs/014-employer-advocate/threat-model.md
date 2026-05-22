# F14 Threat Model: Employer Advocate Agent

## Scope

This threat model covers the package-level employer advocate slice in `@spyglass/agents`: employer-side turn generation, employer-side scoring, F12 model invocation, frozen refs, filtered seeker projections, regulated-surface rubric checks, and eval evidence.

Out of scope: F15 renegotiation orchestration, F20 seeker conversational flows, F22 employer admin console, F23 employer REST API, and live provider credential management beyond F12 integration.

## Assets

- Seeker profile and match data visible through filtered projections.
- Employer role requirements and confidential employer context visible through the principal view.
- Prompt, model, runtime manifest, contract, rubric, privacy-ruleset, and tool-surface refs.
- Employer-side dimension scores, rationales, flag proposals, and audit refs.
- Eval fixtures and reviewer-readable evidence.

## Trust Boundaries

- Privacy filter boundary between raw seeker data and employer-visible projection.
- F12 AI infrastructure boundary between advocate code and provider invocation.
- Rubric registry boundary between regulated scoring policy and model-produced rationales.
- Tool dispatcher boundary between allowed tool results and unsupported/undeclared tools.
- Run context boundary between one `run_id` and any prior or later run.

## Threats And Mitigations

| Threat | Impact | Mitigation |
| --- | --- | --- |
| Raw seeker data reaches employer prompt context | Sev-1 cross-side privacy leak | Accept only `filtered: true` projections; reject known raw seeker, demographic, and protected-class fields before invocation |
| Prompt injection in seeker, employer, or tool text changes advocate behavior | Invalid output, data leakage, or policy bypass | Preserve untrusted-input boundaries; route through F12 prompt rendering; eval injection fixtures required |
| Employer advocate emits hire/no-hire recommendation or threshold decision | Regulated-surface overreach | Validate and reject unsupported decision content; keep aggregation and threshold policy in harness/rubric layer |
| Protected-class inference appears in model output or input projection | AEDT compliance and privacy failure | Reject or flag protected-class boundary conditions; include protected-class eval case |
| Prompt/model/manifest changes during run | Non-reconstructable dossier evidence | Use dispatch-time frozen refs only; no hot reload |
| Missing rubric bias-test evidence | Unauthorized regulated scoring | Refuse scoring before invocation when bias evidence is missing or unauthorized |
| Direct provider import bypasses F12 | Lost audit, cost, and supply-chain control | Import-boundary test rejects provider SDK usage in `@spyglass/agents` |
| Unsupported tool result influences scoring | Undeclared capability or privacy bypass | Validate tool name against employer tool surface and refuse unsupported tools |
| Prior-run context contaminates new run | State inheritance across matches or renegotiations | Require context `run_id` to match input and refuse prior-run context |
| Cost or token budget exhausted | Availability or abuse risk | F12 budget preflight and F14 bounded refusal/inconclusive handling |

## Required Evidence

- Unit tests for filtered projection refusal, prior-run refusal, unsupported tools, protected-class boundary, human-pause refusal, and score validation.
- Contract tests for employer turn, scoring, refusal, and eval schemas.
- Import-boundary test proving no direct provider SDK dependency.
- F14 eval/dev-run evidence covering normal, inconclusive, privacy, prompt-injection, unsupported-tool, bias-gate, protected-class, and budget-limit cases.


## Implementation Notes

- `packages/agents/src/employer-advocate.ts` enforces filtered seeker
  projection checks, protected-class input checks, prior-run refusal,
  unsupported-tool refusal, human-input pause refusal, and direct F12-only model
  invocation for employer turns.
- `packages/agents/src/employer-scoring.ts` enforces employer rubric side,
  required `bias_test_ref`, dimension coverage, range checks, decision-content
  refusal, protected-class scoring refusal, and holistic-score evidence capture.
- `packages/agents/src/__tests__/import-boundary.test.ts` scans F14 source files
  for direct provider imports.
- `packages/agents/scripts/f14-staged-dev-run.ts` records quickstart evidence
  for accepted turn/scoring, privacy refusal, protected-class refusal, and the
  complete F14 eval baseline.
