# Quickstart: PTH10 Reports, Dashboard, and CI/Canary Workflows

## Local

```bash
pnpm --filter @spyglass/product-test-harness test -- reporting-ci
pnpm --filter @spyglass/product-test-harness build
pnpm --filter @spyglass/product-test-harness run:reporting-ci
pnpm product:gate
pnpm product:eval
pnpm product:canary
```

## CI

Run one of the manual workflows:

- `product-gate`
- `persona-eval`
- `alpha-canary`

Download the uploaded report artifact and inspect:

- `product-harness-report.json`
- `product-harness-report.md`
