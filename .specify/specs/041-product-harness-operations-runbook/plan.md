# Implementation Plan: PTH16 Alpha Harness Operations Runbook

**Branch**: `041-product-harness-operations-runbook` | **Date**: 2026-05-28 | **Spec**: `spec.md`

**Input**: Feature specification from `.specify/specs/041-product-harness-operations-runbook/spec.md`

## Summary

Add a product-harness Alpha operations runbook that documents how operators configure Neon `test_harness` persistence, Browserbase preview/prod execution, Vercel canary targets, durable artifact storage, report interpretation, eval trend handling, and operational response. Keep the implementation documentation-only except for Spec Kit artifacts, roadmap status, and runbook index updates.

## Technical Context

**Language/Version**: Markdown documentation in the existing pnpm monorepo
**Primary Dependencies**: Existing product harness commands, GitHub Actions workflows, Neon result store, Browserbase driver, durable artifact storage contracts
**Storage**: Neon `test_harness` schema for result metadata; durable object storage for large artifacts
**Testing**: Markdown formatting through repository `pnpm format:check`; exact-string review for required env and command names
**Target Platform**: Spyglass docs and operator workflows
**Project Type**: Documentation and operational runbook
**Performance Goals**: Operators can find setup, run, report interpretation, and response guidance from one document
**Constraints**: No raw secrets, no production database usage, no release-blocking eval threshold until approved
**Scale/Scope**: One runbook plus roadmap/index pointers and Spec Kit artifacts

## Constitution Check

- Privacy/data minimization: pass; the runbook describes secret refs and evidence refs without raw values.
- Evidence integrity: pass; the runbook preserves report and artifact references as the operational source of truth.
- Fail-safe defaults: pass; preview/prod canaries fail fast on missing config, while eval trends remain informational.
- CI hygiene: pass; docs changes use formatting validation and do not alter runtime behavior.

## Project Structure

### Documentation (this feature)

```text
.specify/specs/041-product-harness-operations-runbook/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── operations-runbook.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
docs/runbooks/
├── README.md
└── product-harness-alpha-operations.md

docs/testing/product-harness/
└── roadmap.md

AGENTS.md
.specify/feature.json
```

**Structure Decision**: This feature is documentation-only. The runbook belongs under `docs/runbooks/` because it is an operational procedure, while the product-harness roadmap remains under `docs/testing/product-harness/`.

## Complexity Tracking

No constitution violations or added technical complexity.
