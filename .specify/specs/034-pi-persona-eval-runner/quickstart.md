# Quickstart: Pi Persona Eval Adapter

Run the focused PTH09 tests:

```bash
pnpm --filter @spyglass/product-test-harness test -- pi-persona-evals
```

Run the full product harness test suite:

```bash
pnpm --filter @spyglass/product-test-harness test
```

Run the local deterministic sample:

```bash
pnpm --filter @spyglass/product-test-harness run:pi-persona-evals
```

Expected sample evidence:

- deterministic seeker/employer encounter matrix executes in eval mode
- every encounter records persona ids, prompt refs, transcript refs, tool traces, model/provider metadata, usage, latency, cost, outcome, and evaluator summary
- prompt-injection encounter records an unsafe-tool refusal
- privacy-boundary encounter records safe transcript evidence
- result-store snapshots persist one agent invocation per encounter

Verified on 2026-05-28:

- `pnpm --filter @spyglass/product-test-harness test -- pi-persona-evals`
- `pnpm --filter @spyglass/product-test-harness test`
- `pnpm --filter @spyglass/product-test-harness type-check`
- `pnpm --filter @spyglass/product-test-harness build`
- `pnpm --filter @spyglass/product-test-harness lint`
- `pnpm --filter @spyglass/product-test-harness run:pi-persona-evals`
- `pnpm format:check`
