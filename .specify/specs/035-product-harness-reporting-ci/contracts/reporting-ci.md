# Contract: PTH10 Reporting and CI

## TypeScript Exports

The package root exports:

- `PRODUCT_HARNESS_REPORT_SCHEMA_VERSION`
- `DEFAULT_PRODUCT_HARNESS_COMMANDS`
- `DEFAULT_PRODUCT_HARNESS_WORKFLOWS`
- `createProductHarnessSuiteReport`
- `renderProductHarnessSuiteJson`
- `renderProductHarnessSuiteMarkdown`
- `summarizeProductHarnessSnapshots`
- `getProductHarnessCommandPlan`

## Command Contract

Root scripts:

```bash
pnpm product:gate
pnpm product:eval
pnpm product:canary
```

Package script:

```bash
pnpm --filter @spyglass/product-test-harness run:reporting-ci
```

## Workflow Contract

- `.github/workflows/product-gate.yml`
- `.github/workflows/persona-eval.yml`
- `.github/workflows/alpha-canary.yml`

Each workflow checks out code, uses the repository setup action, builds packages, runs the relevant root command, and uploads JSON/Markdown product harness reports.
