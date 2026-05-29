# Quickstart: PTH17 Camofox Browser Evaluation Spike

## Review the Evaluation

```bash
sed -n '1,260p' docs/testing/product-harness/camofox-evaluation.md
```

Confirm it includes:

- Browserbase, stock Playwright, and Camofox/Camoufox comparison rows
- setup cost, pass-rate evidence, artifact support, security posture, maintenance risk, CI determinism, `BrowserJourneyDriver` fit, and operational fit
- clear recommendation
- future adapter trigger conditions
- no runtime dependency changes

## Validate Formatting

```bash
pnpm format:check
```

## Validate Scope

```bash
git diff -- package.json pnpm-lock.yaml packages/product-test-harness/package.json
```

The scope check should show no dependency changes.
