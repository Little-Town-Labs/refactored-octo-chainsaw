# Quickstart: F07b Rubric Registry + Bias-Test Dispatch Gate

## Goal

Validate that F07b can publish immutable rubric versions, register completed bias-test evidence, refuse dispatch when evidence is missing or invalid, and compute deterministic weighted scores.

## Prerequisites

- Node 24 and pnpm 9 are active.
- Dependencies are installed with `pnpm install`.
- F05 audit-log and F07a agent-contract packages are available from `main`.
- Local `.env.local` is present for staged database smoke runs when needed.

## Package Verification

```bash
pnpm --filter @spyglass/rubrics test
pnpm --filter @spyglass/rubrics type-check
pnpm --filter @spyglass/rubrics lint
pnpm schema:lint
```

## Staged Dev Run

```bash
pnpm --filter @spyglass/rubrics exec tsx scripts/f07b-staged-dev-run.ts
```

The staged run should:

1. Seed a draft rubric version.
2. Publish a rubric with reviewer provenance and canonical audit evidence.
3. Attempt to mutate the same `(rubric_id, version)` and receive `rubric_version_mutation_error`.
4. Attempt production dispatch without `bias_test_ref` and receive `rubric_missing_bias_test`.
5. Register a completed bias-test artifact bound to the rubric content hash.
6. Re-run dispatch gate and receive allow status.
7. Compute deterministic weighted totals from per-dimension scores.
8. Submit a model holistic score and verify it is ignored while producing a regression signal.

## Expected Evidence

- Test output from `@spyglass/rubrics`.
- Schema-lint output showing F07b tables are classified and invariant-covered.
- Staged run transcript with rubric publication, bias-test registration, dispatch refusal, dispatch allow, deterministic score, and holistic-score regression signal.
- `/speckit-analyze` report before implementation closure.
- `/code-review` and `/security-review` artifacts before final merge.
