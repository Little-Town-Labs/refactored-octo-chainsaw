# Quickstart: PTH15 Eval Trend and Cost Monitoring

## Generate Persona Eval Report

```bash
pnpm product:eval
```

The JSON report includes `eval_trends.points` and `eval_trends.summary`. The Markdown report includes an `Eval Trends` section when persona eval trend points are present.

## Local Validation

```bash
pnpm --filter @spyglass/product-test-harness test -- reporting-ci
pnpm --filter @spyglass/product-test-harness test -- pi-persona-evals
pnpm --filter @spyglass/product-test-harness type-check
pnpm --filter @spyglass/product-test-harness lint
pnpm --filter @spyglass/product-test-harness build
```
