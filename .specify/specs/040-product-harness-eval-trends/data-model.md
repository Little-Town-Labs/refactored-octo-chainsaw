# Data Model: PTH15 Eval Trend and Cost Monitoring

## ProductEvalTrendPoint

- `run_id`
- `scenario_id`
- `created_at`
- `status`
- `persona_id`
- `provider`
- `model`
- `model_version`
- `outcome`
- `latency_ms`
- `cost_usd`
- `total_tokens`
- `tool_refusal_count`
- `evaluator_score`

## ProductEvalTrendSummary

- `eval_run_count`
- `passed_eval_run_count`
- `failed_eval_run_count`
- `total_cost_usd`
- `average_latency_ms`
- `total_tokens`
- `tool_refusal_count`
- `outcomes`
- `providers`
- `models`

## Safety Rules

- Do not include transcript excerpts.
- Do not include prompt refs or prompt bodies.
- Do not include raw tool traces.
- Do not include credential-bearing artifact refs.
