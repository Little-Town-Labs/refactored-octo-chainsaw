# Data Model: F10 Dossier Builder + Signer

## Dossier Artifact

**Purpose**: Terminal signed artifact for a Parley run.

**Fields**:

- `dossier_id`: Stable dossier id.
- `run_id`: Parley run id.
- `match_id`: Match ticket ref.
- `status`: `conclusive` or `inconclusive`.
- `contract_refs`: Seeker/employer contract refs.
- `privacy_ruleset_refs`: Rulesets applied to projections.
- `harness_version`: Dossier builder/harness version.
- `model_invocation_refs`: Model invocation refs captured by the runner.
- `rubric_breakdowns`: Per-side per-dimension scores, weights, totals.
- `rationales`: One-paragraph rationale per side.
- `reconciled_flags`: Flags from both sides requiring attention.
- `projection_refs`: Stored projection refs for seeker, employer, auditor, A2A receiver.
- `content_hash`: Canonical unsigned dossier hash.
- `signature`: Optional signature object.
- `audit_event_id`: Build audit ref.
- `created_at`: Timestamp.

**Validation Rules**:

- Conclusive dossiers require all four audience projections.
- Inconclusive dossiers require at least one inconclusive flag.
- Dossier canonical hash excludes only the signature object.

## Dossier Projection

**Purpose**: Stored pre-computed audience view on the dossier.

**Fields**:

- `projection_id`: Stable projection id.
- `dossier_id`: Parent dossier id.
- `audience`: `seeker`, `employer`, `auditor`, or `a2a_receiver`.
- `disclosure_stage`: Active privacy disclosure stage.
- `ruleset_id`, `ruleset_version`: Applied privacy ruleset ref.
- `payload`: Bounded audience-safe projection.
- `payload_hash`: Canonical payload hash.
- `created_at`: Timestamp.

**Validation Rules**:

- A dossier can have only one projection per audience.
- Payload is stored from pre-filtered inputs; raw transcript expansion is not allowed.

## Rubric Breakdown

**Purpose**: Per-side deterministic scoring evidence.

**Fields**:

- `side`: `seeker` or `employer`.
- `rubric_id`, `rubric_version`: Applied rubric ref.
- `dimensions`: Dimension id, score, weight, weighted score, reason refs.
- `total`: Deterministic weighted total.

**Validation Rules**:

- Totals must equal the sum of weighted dimension scores.
- Dimension weights must be non-negative.

## Dossier Signature

**Purpose**: Integrity proof for the canonical dossier.

**Fields**:

- `signature_id`: Stable signature id.
- `dossier_id`: Parent dossier id.
- `algorithm`: Signing algorithm.
- `kid`: Signing key id.
- `canonicalization_version`: Canonicalization version.
- `signed_content_hash`: Hash of canonical dossier without signature.
- `signature`: Signature bytes.
- `signed_at`: Timestamp.

**Validation Rules**:

- Signature covers all dossier fields except signature.
- Verification must fail if any signed field changes.

## Verification Result

**Purpose**: Evidence for signature verification attempts.

**Fields**:

- `verification_id`: Stable verification id.
- `dossier_id`: Dossier ref.
- `decision`: `valid` or `invalid`.
- `reason_code`: Stable verification reason.
- `kid`: Signing key id used.
- `content_hash`: Recomputed content hash.
- `audit_event_id`: Optional audit ref.
- `created_at`: Timestamp.

**Validation Rules**:

- Unknown key id returns `unknown_key`.
- Signature mismatch returns `signature_invalid`.

## Inconclusive Flag

**Purpose**: Machine-readable explanation for a non-conclusive terminal dossier.

**Fields**:

- `reason_code`: `timed_out`, `tool_failure`, `projection_missing`, `scoring_gap`, `policy_blocked`, or `insufficient_evidence`.
- `source_ref`: Evidence source ref.
- `resolution_hint`: What would resolve the flag.

**Validation Rules**:

- Inconclusive dossiers require at least one flag.
- Conclusive dossiers may include reconciled attention flags but not unresolved inconclusive flags.
