# Data Model: Phase 0 Alpha Posture Infrastructure

## AlphaConsentRecord

Represents explicit Phase 0 participation consent.

**Fields**: `id`, `participant_role`, `principal_id`, `org_id`, `consent_version`, `state`, `evidence_ref`, `recorded_at`, `withdrawn_at`, `created_at`.

**Validation**:

- Valid states are `consented`, `declined`, `withdrawn`, `expired`.
- `participant_role` is `seeker` or `employer`.
- Current consent requires state `consented` and matching consent version.

## AlphaDossierPosture

Machine-readable informational-only posture attached to a dossier payload.

**Fields**: `phase`, `banner`, `posture_version`, `non_production_decision`, `applied_at`.

**Validation**:

- Phase 0 posture requires banner `alpha - informational only`.
- `non_production_decision` must be true for Phase 0.

## AlphaHumanReviewDecision

Human review decision before outreach or escalation.

**Fields**: `id`, `match_id`, `dossier_id`, `reviewer_principal_id`, `decision`, `reason`, `evidence_ref`, `reviewed_at`, `created_at`.

**Validation**:

- Valid decisions are `approved`, `rejected`, `needs_changes`.
- Outreach requires `approved`.

## CounselEvidenceReference

Reference to counsel memo evidence for Phase 0 or phase transition.

**Fields**: `id`, `phase`, `transition`, `memo_path`, `reviewer`, `signed`, `dated_on`, `evidence_hash`, `created_at`.

**Validation**:

- Required memo path must start with `.specify/memory/counsel-reviews/`.
- Phase transition readiness requires signed and dated evidence.

## AlphaPostureGateDecision

Allow/block decision for participation, dossier delivery, outreach, or phase transition.

**Fields**: `decision`, `reason_code`, `checked_at`, `consent_refs`, `human_review_ref`, `counsel_evidence_ref`, `metadata`.

**Validation**:

- Missing consent, missing dossier posture, missing human review, or missing counsel evidence fails closed.
