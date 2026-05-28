# Implementation Plan: PTH15 Eval Trend and Cost Monitoring

**Branch**: `040-product-harness-eval-trends` | **Date**: 2026-05-28 | **Spec**: `spec.md`
**Input**: PTH15 feature spec from the product harness roadmap.

## Summary

Add first-class eval trend extraction and aggregate reporting to `@spyglass/product-test-harness`. Use existing persona eval agent invocation metadata as the persisted source of truth, expose safe trend points in suite reports and persona eval sample output, and keep evals informational by leaving suite status derivation unchanged.

## Technical Context

**Language/Version**: TypeScript on Node 24
**Primary Dependencies**: Existing pnpm workspace, Jest, persona eval snapshots, reporting APIs
**Storage**: Existing `ProductResultStoreSnapshot.agent_invocations` persisted by PTH09/PTH11
**Testing**: Jest package tests plus package type-check/lint/build and workspace hygiene checks
**Target Project**: `packages/product-test-harness`
**Constraints**: No live model credentials in tests, no transcript or prompt payloads in trend output, additive report fields only

## Constitution Check

- Privacy/data minimization: trend output omits prompt content and transcript excerpts.
- Evidence integrity: trends derive from persisted result-store snapshots.
- Fail-safe defaults: eval trends are informational and do not silently become release gates.
- CI hygiene: deterministic synthetic persona evals cover the behavior.

## Project Structure

```text
packages/product-test-harness/src/
  reporting/
    eval-trends.ts
    reports.ts
  samples/
    pi-persona-evals.ts
  __tests__/
    reporting-ci.test.ts
    pi-persona-evals.test.ts
.specify/specs/040-product-harness-eval-trends/
  contracts/eval-trends.md
```

## Validation Strategy

1. Focused reporting and persona eval tests.
2. Product-test-harness package type-check, lint, build, and tests.
3. Workspace format/type/lint/build checks.
4. Spec Kit analyze pass across spec, plan, and tasks.
