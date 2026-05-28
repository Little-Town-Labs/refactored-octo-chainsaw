# Implementation Plan: PTH10 Reports, Dashboard, and CI/Canary Workflows

**Branch**: `035-product-harness-reporting-ci` | **Date**: 2026-05-28 | **Spec**: `spec.md`
**Input**: PTH10 feature spec from the product harness roadmap.

## Summary

Add an aggregate reporting layer to `@spyglass/product-test-harness`, expose command/workflow metadata for product gate, persona eval, and alpha canary modes, wire deterministic package/root commands, and add GitHub Actions workflows that build, run, and upload report artifacts.

## Technical Context

**Language/Version**: TypeScript on Node 24
**Primary Dependencies**: Existing pnpm workspace, Jest, local product-test-harness contracts
**Storage**: Existing `ProductResultStoreSnapshot` and local file result store
**Testing**: Jest package tests plus repository format/type/lint/build checks
**Target Project**: `packages/product-test-harness`
**Constraints**: No new runtime dependencies, deterministic local tests, secret-safe output, optional live credentials only through workflow inputs/secrets

## Constitution Check

- Synthetic data only: use existing deterministic harness sample snapshots.
- Evidence retention: reports expose artifact references and counts without embedding secret material.
- CI hygiene: workflows are manually runnable and upload artifacts.
- Type safety: all exported report/command/workflow contracts are explicit.

## Project Structure

```text
packages/product-test-harness/src/
  reporting/
    commands.ts
    reports.ts
    workflows.ts
  samples/reporting-ci.ts
  __tests__/reporting-ci.test.ts
.github/workflows/
  product-gate.yml
  persona-eval.yml
  alpha-canary.yml
```

## Validation Strategy

1. Focused reporting tests.
2. Full product-test-harness tests and type-check.
3. Workspace format, type-check, lint, and build.
4. Reporting sample command after build.
5. `/speckit-analyze` style consistency pass across spec, plan, and tasks.
