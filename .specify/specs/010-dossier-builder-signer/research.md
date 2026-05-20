# Research: F10 Dossier Builder + Signer

## Decision 1: Dossier Assembly Owns Storage, Not Runner Orchestration

**Decision**: F10 provides a package API that accepts already-collected run evidence and stores a deterministic dossier artifact. F08 remains responsible for sequencing the Parley runner and calling F10.

**Rationale**: Keeps F10 independently testable and avoids coupling assembly to Inngest orchestration before F08 exists.

**Alternatives considered**:

- Build dossier production directly inside F08: rejected because F10 is a standalone Stage 4 P0 deliverable.
- Store only transient dossier JSON: rejected because downstream delivery and audit require durable refs and review reads.

## Decision 2: Projections Are Stored Inputs, Not Recomputed From Raw Transcript

**Decision**: F10 accepts F09-filtered projection payloads for seeker, employer, auditor, and A2A receiver, validates each projection, and stores them with privacy ruleset refs and disclosure stages.

**Rationale**: Roadmap F10 explicitly requires projections pre-computed and stored, not derived at delivery time.

**Alternatives considered**:

- Re-run F09 during dossier reads: rejected because delivery-time derivation expands privacy risk and makes delivered views mutable.
- Store only projection refs: rejected because F10 must be the signed artifact boundary consumed by F11/F21/F23.

## Decision 3: Canonical JSON Hashing With Signature Object Exclusion

**Decision**: Canonicalization sorts object keys recursively and excludes only the top-level `signature` field for signing and verification.

**Rationale**: This matches existing package patterns for stable hashing while satisfying Parley §15.4 signature coverage.

**Alternatives considered**:

- Raw `JSON.stringify` order: rejected because key order can vary.
- Exclude multiple metadata fields: rejected because it weakens signature coverage.

## Decision 4: Ed25519 Test Signer Behind A Signing Abstraction

**Decision**: Package tests and staged runs use Node crypto Ed25519 keys through a local signer interface that records `algorithm`, `kid`, and canonicalization version.

**Rationale**: Provides real sign/verify behavior now while leaving production HSM/KMS integration behind a stable interface.

**Alternatives considered**:

- HSM/KMS integration in F10: rejected as operationally premature for the standalone package.
- Hash-only "signature": rejected because verification would not prove signer identity.

## Decision 5: Closed-List Inconclusive Flags

**Decision**: Inconclusive dossiers require at least one flag with a closed-list reason and resolution hint.

**Rationale**: Run-to-completion failure must be actionable, not a silent or ambiguous terminal state.

**Alternatives considered**:

- Free-text-only flags: rejected because review and downstream automation need stable reason codes.
