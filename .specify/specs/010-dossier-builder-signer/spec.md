# Feature Specification: F10 Dossier Builder + Signer

**Feature Branch**: `010-dossier-builder-signer`

**Created**: 2026-05-20

**Status**: Draft

**Input**: User description: "F10 Dossier Builder + Signer is the remaining standalone Stage 4 P0 before the full F08 Parley runner. Build deterministic dossier assembly, pre-computed per-audience projections, per-side rubric breakdowns, reconciled flags, canonical signing, and verification helpers."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Build Deterministic Dossiers (Priority: P1)

As the Parley harness, I need a deterministic dossier artifact from completed or inconclusive negotiation evidence, so downstream delivery, audit, and notification systems consume one stable signed record.

**Why this priority**: The dossier is the terminal consumer-facing artifact for the run-to-completion contract. F08 can only terminate safely when F10 can produce a valid success or inconclusive dossier.

**Independent Test**: Build a dossier from seeded run evidence, rubrics, privacy projections, transcript refs, and flags twice and verify the canonical unsigned payload, content hash, and stored fields are identical.

**Acceptance Scenarios**:

1. **Given** a completed negotiation with side outcomes, rubric scores, transcript refs, contract refs, privacy ruleset refs, and model invocation refs, **When** the dossier is built, **Then** it contains stable version metadata, per-side rubric breakdowns, rationales, reconciled flags, and all required audience projection refs.
2. **Given** the same input evidence is submitted twice, **When** canonical assembly runs, **Then** the dossier content hash and canonical payload are identical.
3. **Given** a run cannot reach a conclusive match outcome, **When** dossier assembly runs, **Then** an `inconclusive` dossier is produced with flags describing what would resolve it.

---

### User Story 2 - Pre-Compute Per-Audience Projections (Priority: P1)

As privacy and delivery policy, I need seeker, employer, auditor, and A2A receiver dossier projections pre-computed and stored at dossier-build time, so delivery-time reads never derive privacy-sensitive projections ad hoc.

**Why this priority**: Roadmap F10 requires projections to be stored on the dossier and derived from privacy rulesets at each audience's disclosure stage before F08 delivery.

**Independent Test**: Build all four audience projections from seeded filtered content and verify each projection stores audience, disclosure stage, ruleset ref, content hash, and a bounded payload with no cross-audience fields.

**Acceptance Scenarios**:

1. **Given** filtered projection inputs for seeker, employer, auditor, and A2A receiver, **When** the dossier is built, **Then** the dossier stores one projection for each audience with the corresponding ruleset and disclosure stage.
2. **Given** a required audience projection is missing, **When** dossier assembly runs, **Then** assembly fails closed unless the dossier is explicitly inconclusive and carries a projection-missing flag.
3. **Given** a delivery reader requests a dossier projection, **When** the projection is returned, **Then** it is read from stored dossier data rather than derived from raw transcript content.

---

### User Story 3 - Sign and Verify Canonical Dossiers (Priority: P1)

As platform integrity policy, I need dossiers signed with deterministic canonical serialization and a verification helper, so any consumer can prove the dossier was not altered after production.

**Why this priority**: Constitution integrity and Parley §15.4 require signing, not just storage. Verification is a required deliverable.

**Independent Test**: Sign a dossier, verify it successfully, mutate a signed field, and verify the helper rejects the tampered dossier while ignoring the signature object itself during canonicalization.

**Acceptance Scenarios**:

1. **Given** signing is enabled, **When** a dossier is finalized, **Then** the signature covers all dossier fields except the signature object itself.
2. **Given** a signed dossier is unmodified, **When** verification runs, **Then** verification returns valid with the signing key id, algorithm, and content hash.
3. **Given** any signed field changes after signing, **When** verification runs, **Then** verification fails with a stable reason code.

---

### User Story 4 - Review Dossier Evidence (Priority: P2)

As compliance staff or counsel, I need scoped reads for dossier metadata, projections, signatures, verification outcomes, and inconclusive flags, so I can reconstruct why a dossier was produced and whether it was valid.

**Why this priority**: Dossiers are compliance artifacts and will feed notifications, web delivery, employer APIs, and future audit packages.

**Independent Test**: Query dossier, projection, signature, and verification evidence with and without review scope.

**Acceptance Scenarios**:

1. **Given** a scoped reviewer requests a dossier, **When** review reads run, **Then** they return metadata, projection refs, rubric breakdowns, flags, signature status, and audit refs.
2. **Given** a scoped reviewer requests projection details, **When** review reads run, **Then** they return stored per-audience projections without raw transcript expansion.
3. **Given** an unscoped actor requests dossier evidence, **When** authorization runs, **Then** access is denied by default.

### Edge Cases

- A conclusive dossier is missing one required audience projection.
- A projection exists but references a deprecated ruleset version.
- All rubric dimensions are present but one side has a zero-weight total.
- A signing key id is unknown during verification.
- Signing is disabled in a non-production test run.
- A dossier is built for a timed-out or tool-failure run.
- A signed dossier is reserialized with different object key order.
- An A2A receiver projection rule is still placeholder-level.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST assemble deterministic dossier artifacts from run evidence, transcript refs, rubric breakdowns, filtered projections, rationales, flags, and version metadata.
- **FR-002**: System MUST support dossier statuses `conclusive` and `inconclusive`.
- **FR-003**: System MUST include flags on inconclusive dossiers describing what would resolve the dossier.
- **FR-004**: System MUST store pre-computed projections for seeker, employer, auditor, and A2A receiver audiences.
- **FR-005**: System MUST record privacy ruleset ref and disclosure stage on every stored projection.
- **FR-006**: System MUST include per-side, per-dimension rubric breakdowns and deterministic weighted totals.
- **FR-007**: System MUST include per-side one-paragraph rationales in the corresponding agent voice.
- **FR-008**: System MUST include reconciled flags from both sides for human attention.
- **FR-009**: System MUST record contract refs, privacy ruleset refs, harness version, and model invocation refs on every dossier.
- **FR-010**: System MUST sign dossiers by default when signing is enabled for the environment.
- **FR-011**: System MUST canonicalize the dossier deterministically and exclude only the signature object from the signed payload.
- **FR-012**: System MUST provide a verification helper that validates content hash, signing key id, algorithm, and signature.
- **FR-013**: System MUST return stable reason codes for valid, invalid signature, unknown key, disabled signing, missing projection, invalid payload, and inconclusive outcomes.
- **FR-014**: System MUST emit canonical audit evidence for dossier build, projection storage, signing, verification, and inconclusive outcomes.
- **FR-015**: System MUST provide scoped review reads for dossiers, projections, signatures, and verification outcomes while denying unscoped reads by default.
- **FR-016**: System MUST keep F10 boundaries clear: F08 owns orchestration, F09 owns filtering, F11 owns notification artifacts, and F23 owns employer webhook delivery.

### Key Entities

- **Dossier Artifact**: Terminal run artifact containing status, match/run refs, projections, rubric breakdowns, rationales, flags, version metadata, content hash, signature, and audit refs.
- **Dossier Projection**: Stored audience-specific view for seeker, employer, auditor, or A2A receiver with privacy ruleset ref, disclosure stage, content hash, and bounded payload.
- **Rubric Breakdown**: Per-side, per-dimension score evidence with weights and deterministic totals.
- **Dossier Signature**: Signature object containing algorithm, key id, canonicalization version, signed content hash, signature bytes, and signing timestamp.
- **Verification Result**: Evidence that a dossier signature verified or failed with stable reason code.
- **Inconclusive Flag**: Machine-readable flag describing unresolved evidence, timeout, tool failure, projection missing, scoring gap, or other reason a dossier is not conclusive.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Rebuilding a dossier from identical evidence produces the same canonical payload and content hash.
- **SC-002**: All successful dossier builds store seeker, employer, auditor, and A2A receiver projections before delivery.
- **SC-003**: Mutating any signed dossier field causes verification to fail.
- **SC-004**: Verification ignores only the signature object itself and is stable under object key reordering.
- **SC-005**: Inconclusive dossiers include at least one actionable resolution flag.
- **SC-006**: Scoped review reads reconstruct dossier metadata, projections, signatures, verification outcomes, and flags without raw transcript expansion.
- **SC-007**: Initial package verification passes unit tests, contract tests, type-check, lint, schema-lint, signing/verification tests, and an F10 staged quickstart run.

## Assumptions

- F07b supplies deterministic rubric scores and weighted totals or score inputs that F10 can verify.
- F09 supplies already-filtered audience projection inputs; F10 stores them and does not re-run privacy filtering.
- Initial signing can use local Ed25519 test key material for deterministic package tests; production HSM/KMS wiring can be integrated later through the signing-key abstraction.
- A2A receiver projection rules are minimal but explicit until the A2A protocol surface is expanded.
- F10 is backend/compliance infrastructure and does not add user-facing pages.
