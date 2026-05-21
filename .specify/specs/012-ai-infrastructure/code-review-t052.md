# Code Review: F12 AI Infrastructure T052

**Date**: 2026-05-21
**Scope**: `@spyglass/ai`, F12 DB schema/migration, F12 governance docs, Spec Kit artifacts.

## Findings

| Severity | Finding | Resolution |
| --- | --- | --- |
| HIGH | Active runtime manifest publication did not verify referenced prompt/model versions were already published, which could allow a signed manifest to pin unavailable refs. | Fixed in `packages/ai/src/manifest.ts` by validating active manifest prompt/model refs against the repository before insertion. Added manifest regression coverage. |
| MEDIUM | `ai_runtime_manifests.no_hot_reload` was represented as text in the Drizzle schema and migration while the F12 contract requires a boolean. | Fixed by switching the column to `boolean` and preserving the `= true` check. |

## Result

Approved after remediation. Re-run package tests, type-check, lint, build,
schema-lint, and staged quickstart before PR publication.
