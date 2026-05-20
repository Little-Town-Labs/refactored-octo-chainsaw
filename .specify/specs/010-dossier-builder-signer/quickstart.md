# Quickstart: F10 Dossier Builder + Signer

## Purpose

Validate F10 from deterministic dossier assembly through stored projections, signing, verification, inconclusive dossiers, scoped review reads, and schema/governance coverage.

## Prerequisites

- F07b rubric registry and deterministic scoring are merged.
- F09 privacy filter is merged and can provide filtered projection inputs.
- Dependencies are installed with `pnpm install`.
- The workspace can run package tests, type-check, lint, schema-lint, and the staged F10 script.

## Staged Run

1. Build four seeded projection inputs for seeker, employer, auditor, and A2A receiver.
2. Build seeded seeker/employer rubric breakdowns with deterministic totals.
3. Assemble a conclusive dossier twice and verify identical canonical hashes.
4. Sign the dossier with a local Ed25519 test signer.
5. Verify the signed dossier successfully.
6. Mutate a signed field and verify tamper detection.
7. Assemble an inconclusive dossier with a `tool_failure` flag.
8. Read dossier evidence through scoped review APIs.

## Expected Commands

```bash
pnpm --filter @spyglass/dossiers test
pnpm --filter @spyglass/dossiers type-check
pnpm --filter @spyglass/dossiers lint
pnpm --filter @spyglass/dossiers build
pnpm --filter @spyglass/dossiers dev-run:f10
pnpm --filter @spyglass/db build
pnpm schema:lint
```

## Expected Evidence

- Dossier canonical hash is stable across rebuilds.
- Four audience projections are stored before conclusive delivery.
- Signature verifies when unchanged and fails when a signed field is mutated.
- Verification ignores only the signature object.
- Inconclusive dossier includes at least one actionable flag.
- Scoped review reads return dossier metadata, projection refs, signature status, verification results, and flags without raw transcript expansion.
