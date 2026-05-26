# Quickstart Run: Phase 0 Alpha Posture Infrastructure

**Date:** 2026-05-26
**Branch:** `025-phase-0-alpha-posture`

## Scenario Evidence

| Scenario | Evidence |
|----------|----------|
| Consent | `pnpm --filter @spyglass/alpha-posture test` passed; consent tests cover record, withdrawal, missing consent, withdrawn consent, and version mismatch. |
| Informational-only dossier posture | `pnpm --filter @spyglass/alpha-posture test` passed; dossier tests cover posture application and missing posture refusal. |
| Human review gate | `pnpm --filter @spyglass/alpha-posture test` passed; gate tests cover missing review, rejected review, missing consent, and allowed reviewed outreach. |
| Counsel evidence | `pnpm --filter @spyglass/alpha-posture test` passed; counsel tests cover missing evidence block, invalid memo path, and signed dated evidence allow. |

## Focused Verification

- `pnpm --filter @spyglass/alpha-posture test` PASS
- `pnpm --filter @spyglass/alpha-posture type-check` PASS
- `pnpm --filter @spyglass/alpha-posture lint` PASS
- `pnpm --filter @spyglass/alpha-posture build` PASS
- `pnpm --filter @spyglass/db test` PASS
- `pnpm --filter @spyglass/db type-check` PASS

## Notes

Counsel evidence validation confirms reference shape only. The actual signed
counsel memo must be filed separately under `.specify/memory/counsel-reviews/`
before the Phase 0 -> Phase 1 launch gate can close.
