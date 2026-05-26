# Research: Phase 0 Alpha Posture Infrastructure

## Decision: Package-first posture gate

**Rationale**: Multiple surfaces need the same decision: seeker flows, employer console, dossier delivery, notifications, and future introductions. A package-first gate avoids divergent posture checks.

**Alternatives considered**: UI-only banners were rejected because API/webhook and package flows could bypass them.

## Decision: Phase 0 consent is separate from demographic consent

**Rationale**: F20 demographic consent is for bias-audit data. F25 consent is participation consent that the system is a private alpha, informational only, and not a hiring tool.

**Alternatives considered**: Reusing demographic consent was rejected because the purpose and withdrawal semantics differ.

## Decision: Informational-only posture is attached to payload metadata

**Rationale**: The banner must travel with dossier projections and exports, not only page chrome, so downstream delivery paths can refuse unmarked payloads.

**Alternatives considered**: Rendering-only banners were rejected because signed webhooks and exports need machine-readable posture.

## Decision: Human review is an explicit gate input

**Rationale**: PRD Phase 0 requires human review before outreach. The gate should fail closed unless a reviewer principal approved the specific match/dossier references.

**Alternatives considered**: Treating threshold clearance as enough was rejected because it creates production-decision risk.

## Decision: Counsel evidence is reference-validated, not legally interpreted

**Rationale**: Constitution §V.2 requires signed dated counsel evidence retained at a path. F25 verifies metadata and location; counsel conclusions remain outside code.

**Alternatives considered**: Encoding legal conclusions in code was rejected because jurisdiction and phase-transition decisions require counsel.
