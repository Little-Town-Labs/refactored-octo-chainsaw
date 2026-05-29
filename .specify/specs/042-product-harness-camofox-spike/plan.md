# Implementation Plan: PTH17 Camofox Browser Evaluation Spike

**Branch**: `042-product-harness-camofox-spike` | **Date**: 2026-05-29 | **Spec**: `spec.md`

**Input**: Feature specification from `.specify/specs/042-product-harness-camofox-spike/spec.md`

## Summary

Document an optional Camofox/Camoufox evaluation against Spyglass product-harness browser execution needs. Compare it with Browserbase and stock Playwright, recommend whether to build a fallback adapter now, and define future adapter boundaries without adding runtime dependencies.

## Technical Context

**Language/Version**: Markdown documentation in the existing pnpm monorepo
**Primary Dependencies**: Existing `BrowserJourneyDriver` contract, Browserbase driver docs/code, product harness roadmap
**Storage**: N/A
**Testing**: Markdown formatting, exact-string coverage, no dependency/package changes, Spec Kit analyze
**Target Platform**: Spyglass product-harness docs and future adapter planning
**Project Type**: Documentation/evaluation spike
**Performance Goals**: Produce a clear build/defer/reject recommendation without increasing CI cost
**Constraints**: No live Camofox, Browserbase, or Playwright dependency in this spike; no third-party scraping/bypass scope; preserve Browserbase as primary canary provider unless evidence changes
**Scale/Scope**: One evaluation document plus Spec Kit artifacts and roadmap/pointer updates

## Constitution Check

- Privacy/data minimization: pass; evaluation is restricted to first-party Spyglass surfaces and avoids credential collection.
- Evidence integrity: pass; recommendation cites current upstream docs and existing harness contracts.
- Fail-safe defaults: pass; no new release-blocking browser path is introduced.
- CI hygiene: pass; no runtime dependencies or live browser requirements are added.

## Project Structure

### Documentation (this feature)

```text
.specify/specs/042-product-harness-camofox-spike/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── camofox-evaluation.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
docs/testing/product-harness/
├── camofox-evaluation.md
└── roadmap.md

AGENTS.md
.specify/feature.json
```

**Structure Decision**: The spike belongs with product-harness testing docs because it evaluates a possible browser execution option. It does not belong in operational runbooks until a supported adapter exists.

## Complexity Tracking

No constitution violations or added technical complexity.
