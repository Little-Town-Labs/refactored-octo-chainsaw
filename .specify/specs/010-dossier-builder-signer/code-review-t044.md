# Code Review: F10 Dossier Builder + Signer

**Date**: 2026-05-20

## Findings

No blocking code-review findings found.

## Checks

- Deterministic canonicalization sorts object keys recursively.
- Signing excludes only the top-level `signature` object.
- Conclusive dossiers require all four audience projections.
- Inconclusive dossiers require actionable flags.
- Review reads require `dossier:review`.

## Residual Risk

Production signing key storage is represented by a signing abstraction. HSM/KMS integration remains future operational wiring behind that abstraction.
