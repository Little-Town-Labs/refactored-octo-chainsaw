# Implementation Plan: PTH12 Durable Artifact Storage

**Branch**: `037-product-harness-artifact-storage` | **Date**: 2026-05-28 | **Spec**: `spec.md`
**Input**: PTH12 feature spec from the product harness roadmap.

## Summary

Add durable artifact storage contracts and a deterministic local-file implementation to `@spyglass/product-test-harness`. Stored artifacts produce `RunArtifact`-compatible metadata references with checksums, size, retention class, provider, and redaction status so Neon result snapshots keep metadata only while large bytes live in object storage.

## Technical Context

**Language/Version**: TypeScript on Node 24
**Primary Dependencies**: Existing pnpm workspace, Jest, local product-test-harness contracts
**Storage**: Local filesystem implementation for tests; provider-neutral contracts for future Vercel Blob or object storage
**Testing**: Jest package tests plus package type-check/lint/build and workspace hygiene checks
**Target Project**: `packages/product-test-harness`
**Constraints**: No live object-storage credentials in tests, atomic local writes, secret-safe metadata, no binary bytes in Neon rows

## Constitution Check

- Synthetic data only: tests store deterministic synthetic payloads.
- Evidence retention: artifacts include checksums, retention class, and redaction status.
- CI hygiene: local tests do not need Vercel or object-storage credentials.
- Type safety: storage contracts and public exports are explicit.

## Project Structure

```text
packages/product-test-harness/src/
  artifacts/
    storage.ts
  __tests__/
    artifact-storage.test.ts
.specify/specs/037-product-harness-artifact-storage/
  contracts/artifact-storage.md
  data-model.md
  quickstart.md
  research.md
  tasks.md
```

## Validation Strategy

1. Focused artifact-storage tests.
2. Product-test-harness package type-check, lint, build, and tests.
3. Workspace format check and diff hygiene.
4. Spec Kit analyze pass across spec, plan, and tasks.
