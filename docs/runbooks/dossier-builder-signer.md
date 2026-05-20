# F10 Dossier Builder + Signer Runbook

## Scope

F10 owns deterministic dossier assembly, stored per-audience projections, canonical signing, verification, inconclusive dossier flags, and scoped review reads. F08 owns orchestration, F09 owns filtering, F11 owns notification artifacts, and F23 owns employer webhook delivery.

## Build

1. Collect run evidence, contract refs, model invocation refs, rubric breakdowns, side rationales, reconciled flags, and F09-filtered projection payloads.
2. Call `buildDossier`.
3. Conclusive dossiers require seeker, employer, auditor, and A2A receiver projections.
4. Inconclusive dossiers require at least one actionable flag and may carry projection-missing flags.

## Projections

Projection payloads must be filtered before F10 receives them. F10 stores payload, payload hash, audience, disclosure stage, and ruleset ref. Delivery readers must read stored projections and must not recompute projections from raw transcript content.

## Signing

1. Use `signDossier` with a configured `DossierSigningKey`.
2. Signing covers every dossier field except the top-level `signature` object.
3. Store algorithm, key id, canonicalization version, signed content hash, signature bytes, and timestamp.

## Verification

Use `verifyDossier` with a key resolver. Valid verification returns `signature_valid`. Tampering returns `signature_invalid`; missing key material returns `unknown_key`.

## Review

Require `dossier:review` and use `readDossierReviewBundle`. Review output includes dossier metadata, projections, and verification events without raw transcript expansion.

## Rollback

Dossiers are immutable terminal records. To correct a dossier, produce a new dossier artifact from corrected evidence and keep prior signature/verification evidence reviewable.
