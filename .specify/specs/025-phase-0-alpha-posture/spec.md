# Feature Specification: Phase 0 Alpha Posture Infrastructure

**Feature Branch**: `025-phase-0-alpha-posture`

**Created**: 2026-05-26

**Status**: Draft

**Input**: User description: "F25 Phase 0 alpha posture infrastructure. Run the Spec Kit specify -> clarify/plan/tasks flow for `25-phase-0-alpha-posture`, grounding it in the Stage 8 goal, Constitution §I.B.1 / §V.2, alpha consent flows, informational-only dossier posture, human-review gate, and counsel-review evidence requirements."

## Clarifications

### Session 2026-05-26

- No blocking clarification questions were required after reading PRD Phase 0 scope, Constitution §I.B.1 and §V.2, roadmap F25 notes, and existing dossier/seeker/employer compliance surfaces. F25 enforces private-alpha posture and evidence gates; it does not make Phase 1 launch decisions or provide legal advice.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Capture Alpha Consent (Priority: P1)

A seeker or employer design partner can explicitly consent to Phase 0 participation after seeing that Spyglass is a shakedown, not a production hiring tool, and can later withdraw that consent.

**Why this priority**: Constitution §I.B.1 requires explicit consent before private-alpha use.

**Independent Test**: Record seeker and employer consent, reject participation without consent, withdraw consent, and verify audit/evidence references remain.

**Acceptance Scenarios**:

1. **Given** a seeker sees the alpha consent text, **When** they consent, **Then** the system records participant role, consent version, timestamp, principal, and evidence reference.
2. **Given** an employer sees the alpha consent text, **When** they decline or withdraw, **Then** alpha participation is blocked.
3. **Given** a participant consent record is missing or outdated, **When** alpha posture is evaluated, **Then** the participant is ineligible.

---

### User Story 2 - Label Dossiers Informational Only (Priority: P1)

Every Phase 0 dossier and dossier projection clearly carries an "alpha - informational only" posture so recipients cannot treat it as a production hiring decision.

**Why this priority**: PRD §6.5 and Constitution §I.B.1 require no production hiring decisions in Phase 0.

**Independent Test**: Apply alpha posture to seeker and employer dossier payloads and verify banner text, posture version, and non-production decision metadata are present.

**Acceptance Scenarios**:

1. **Given** an employer-visible dossier projection is created during Phase 0, **When** alpha posture is applied, **Then** it includes an informational-only banner and non-production decision metadata.
2. **Given** a dossier already contains alpha posture metadata, **When** posture is applied again, **Then** the operation is idempotent.
3. **Given** a dossier projection lacks the alpha banner, **When** delivery eligibility is checked, **Then** delivery is refused.

---

### User Story 3 - Require Human Review Before Outreach (Priority: P1)

Before any Phase 0 escalation or outreach, a human reviewer must approve that the action is informational, consented, and outside production hiring.

**Why this priority**: PRD Phase 0 explicitly requires human review before escalation.

**Independent Test**: Evaluate outreach with no review, rejected review, and approved review for both sides; only approved review passes.

**Acceptance Scenarios**:

1. **Given** a match clears automated thresholds, **When** no human review exists, **Then** outreach is blocked.
2. **Given** a human reviewer approves informational outreach, **When** consent and dossier posture are valid, **Then** outreach may proceed.
3. **Given** a reviewer rejects outreach or marks production-decision risk, **When** the gate evaluates, **Then** outreach is blocked and auditable.

---

### User Story 4 - Retain Counsel Evidence for Phase Transition (Priority: P2)

Operators can register counsel-review evidence for Phase 0 and verify that Phase 0 to Phase 1 transition remains blocked until required evidence exists.

**Why this priority**: Constitution §V.2 makes counsel review evidence mandatory for phase transitions.

**Independent Test**: Register a counsel memo reference, verify completeness checks, and prove transition checks fail without signed dated evidence.

**Acceptance Scenarios**:

1. **Given** no signed dated counsel memo exists, **When** phase-transition readiness is checked, **Then** the transition is blocked.
2. **Given** a memo reference is signed, dated, and stored under the required evidence path, **When** readiness is checked, **Then** counsel evidence passes.
3. **Given** evidence exists for Phase 0 but not Phase 1, **When** Phase 1 readiness is checked, **Then** the transition remains blocked.

### Edge Cases

- Consent version changes after participant consent.
- Participant changes organization or role after consent.
- A dossier is generated outside Phase 0 and should not receive alpha posture.
- Outreach has human review but missing seeker or employer consent.
- Counsel memo lacks date, reviewer, signature marker, or required storage path.
- Phase transition check is run in test/dev without counsel evidence.
- A public marketing surface attempts to enable alpha participation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST record explicit Phase 0 consent for seeker and employer participants with role, principal, organization where applicable, consent version, timestamp, and evidence reference.
- **FR-002**: System MUST block Phase 0 participation when required consent is missing, withdrawn, expired, or version-mismatched.
- **FR-003**: System MUST provide canonical Phase 0 consent text that states the system is a private alpha, informational only, and not a production hiring tool.
- **FR-004**: System MUST apply an "alpha - informational only" banner and non-production decision metadata to Phase 0 dossier payloads and projections.
- **FR-005**: System MUST refuse Phase 0 dossier delivery when informational-only posture metadata is missing.
- **FR-006**: System MUST require human review approval before Phase 0 outreach, escalation, or introduction.
- **FR-007**: Human review decisions MUST record reviewer principal, decision, timestamp, reason, affected match/dossier references, and evidence reference.
- **FR-008**: System MUST block outreach when either participant lacks valid consent, the dossier lacks alpha posture, or human review is absent/rejected.
- **FR-009**: System MUST track counsel-review evidence references for Phase 0 and phase-transition readiness.
- **FR-010**: Phase 0 to Phase 1 transition readiness MUST fail closed unless signed, dated counsel evidence exists in `.specify/memory/counsel-reviews/`.
- **FR-011**: F25 MUST NOT enable public marketing availability, production hiring decisions, Phase 1 jurisdiction admission, or counsel conclusions.

### Key Entities *(include if feature involves data)*

- **Alpha Consent Record**: Participant role, principal, organization, consent version, state, timestamp, and evidence reference.
- **Alpha Dossier Posture**: Informational-only banner and metadata attached to dossier projections during Phase 0.
- **Human Review Decision**: Reviewer decision for outreach or escalation with principal attribution and affected references.
- **Counsel Evidence Reference**: Signed dated counsel memo reference required for phase-transition readiness.
- **Alpha Posture Gate Decision**: Allow/block result explaining consent, dossier posture, human review, and counsel evidence status.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Consent tests prove seeker and employer participation is blocked without current explicit consent and allowed with current consent.
- **SC-002**: Dossier posture tests prove Phase 0 payloads carry the informational-only banner and delivery is refused without it.
- **SC-003**: Human review gate tests prove outreach is blocked without approval and allowed only when consent and dossier posture are valid.
- **SC-004**: Counsel evidence tests prove phase transition readiness fails closed without signed dated memo evidence at the required path.
- **SC-005**: F25 quickstart evidence records passing package tests, type-check, lint, build, format, and relevant workspace gates.

## Assumptions

- F25 is package-first and provides primitives that seeker, employer, notification, and dossier surfaces can call.
- Existing F20 demographic consent remains separate from Phase 0 participation consent.
- Counsel memo content is produced outside the codebase; F25 verifies evidence references and required metadata.
- Public marketing availability remains disabled by policy and docs; F25 does not build a marketing launch surface.
