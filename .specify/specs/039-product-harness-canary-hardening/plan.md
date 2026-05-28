# Implementation Plan: PTH14 Canary Workflow Hardening

**Branch**: `039-product-harness-canary-hardening` | **Date**: 2026-05-28 | **Spec**: `spec.md`
**Input**: PTH14 feature spec from the product harness roadmap.

## Summary

Harden Alpha canary execution by adding deterministic canary environment validation, updating `product:canary` metadata to declare Browserbase/Neon/artifact requirements, and wiring `.github/workflows/alpha-canary.yml` to fail fast before build/report generation unless an explicit dry run is requested.

## Technical Context

**Language/Version**: TypeScript on Node 24
**Primary Dependencies**: Existing pnpm workspace, Jest, product-test-harness reporting APIs, GitHub Actions
**Storage**: Metadata in Neon `test_harness`; large artifacts through durable object storage config
**Testing**: Jest package tests plus package type-check/lint/build and workspace hygiene checks
**Target Project**: `packages/product-test-harness`, `.github/workflows/alpha-canary.yml`
**Constraints**: No live secrets in tests, no network access, no raw URL or secret logging, preserve local dry-run behavior

## Constitution Check

- Fail-safe defaults: preview/prod canaries refuse missing config before execution.
- Confidentiality: validation reports variable names and safe host labels only, never secret values.
- Evidence retention: report upload behavior remains `always()` for generated files.
- CI hygiene: tests use synthetic env maps and no external services.

## Project Structure

```text
packages/product-test-harness/src/
  reporting/
    canary-env.ts
    commands.ts
  samples/
    reporting-ci.ts
  __tests__/
    reporting-ci.test.ts
.github/workflows/
  alpha-canary.yml
.specify/specs/039-product-harness-canary-hardening/
  contracts/canary-env.md
```

## Validation Strategy

1. Focused reporting/canary tests.
2. Product-test-harness package type-check, lint, build, and tests.
3. Workspace format/type/lint/build checks.
4. Spec Kit analyze pass across spec, plan, and tasks.
