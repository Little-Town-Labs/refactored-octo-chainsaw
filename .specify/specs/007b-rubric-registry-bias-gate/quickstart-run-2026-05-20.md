# F07b Quickstart Run Evidence

**Date**: 2026-05-20
**Branch**: `007-b`

## Commands

```bash
pnpm --filter @spyglass/rubrics test
pnpm --filter @spyglass/rubrics type-check
pnpm --filter @spyglass/rubrics lint
pnpm --filter @spyglass/rubrics build
pnpm schema:lint
pnpm --filter @spyglass/rubrics dev-run:f07b
```

## Results

- `pnpm --filter @spyglass/rubrics test`: PASS, 9 suites / 20 tests.
- `pnpm --filter @spyglass/rubrics type-check`: PASS after rebuilding local workspace dependencies.
- `pnpm --filter @spyglass/rubrics lint`: PASS.
- `pnpm --filter @spyglass/rubrics build`: PASS.
- `pnpm schema:lint`: PASS, 16 tables checked, 0 violations.
- Initial non-escalated `tsx` staged run failed with sandbox IPC error `listen EPERM /tmp/tsx-1000/14.pipe`; rerun with elevated sandbox permission passed.

## Staged Run Output

```json
{
  "draft": "seeker-fit@1.0.0",
  "missingEvidence": "rubric_missing_bias_test",
  "artifact": "ff431e71-efd6-4cfa-99d1-0e89841f8afa",
  "allowed": "rubric_gate_allowed",
  "score": 4.3333,
  "holisticIgnored": true,
  "publishScope": "rubric.publish"
}
```

## Notes

- `pnpm install --no-frozen-lockfile` was required after adding the new workspace package so `@spyglass/rubrics` could link workspace dependencies and update `pnpm-lock.yaml`.
- The Spec Kit prerequisite script passes after renaming the branch to `007-b`; `.specify/feature.json` remains the source of truth for the F07b feature directory.
