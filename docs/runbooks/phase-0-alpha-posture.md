# Phase 0 Alpha Posture Runbook

## Purpose

F25 keeps Spyglass in the Constitution §I.B.1 private-alpha posture:
explicitly consented participants only, informational dossier outputs only,
no production hiring decisions, and human review before any outreach.

## Required Controls

1. Capture a current alpha consent record for each seeker and employer before
   including either party in a Phase 0 run.
2. Apply the dossier posture marker to every Phase 0 dossier before delivery:
   `alpha - informational only`, `phase_0_alpha`, and
   `non_production_decision=true`.
3. Require an approved human review record before any outreach escalation.
4. Refuse Phase 0 -> Phase 1 transition unless counsel evidence references a
   signed, dated memo under `.specify/memory/counsel-reviews/`.

## Operator Checks

- Consent is valid only when state is `consented`, the consent version matches
  the current package version, and no withdrawal timestamp is present.
- Dossier delivery must call the posture evaluator and fail closed for missing
  or modified posture fields.
- Outreach escalation must evaluate seeker consent, employer consent, dossier
  posture, and human review together. Missing data is a block, not a warning.
- Counsel evidence is a reference check only. This implementation does not
  create or imply legal approval; operators must file the memo separately.

## Evidence

- Package tests: `pnpm --filter @spyglass/alpha-posture test`
- Package type gate: `pnpm --filter @spyglass/alpha-posture type-check`
- Package lint gate: `pnpm --filter @spyglass/alpha-posture lint`
- DB schema tests: `pnpm --filter @spyglass/db test`
- Quickstart evidence:
  `.specify/specs/025-phase-0-alpha-posture/quickstart-run-2026-05-26.md`
