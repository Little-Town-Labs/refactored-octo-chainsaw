# Security Review: F10 Dossier Builder + Signer

**Date**: 2026-05-20

## Findings

No blocking security findings found.

## Controls Verified

- Tampering with a signed dossier field returns `signature_invalid`.
- Unknown key id returns `unknown_key`.
- Verification is stable under object key reordering.
- Projection payloads are stored at build time and not derived from raw transcript reads.
- Unscoped review reads are denied by default.

## Follow-Up

Wire production HSM/KMS signing key resolution before Phase 2 external delivery.
