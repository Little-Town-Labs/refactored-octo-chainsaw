# Research: Incident Response + Breach Notification + Monitoring

## Decision: Package-first incident response primitives

**Rationale**: F24 needs deterministic tests for classification, deadlines, state transitions, and evidence export before any operator UI exists. A package mirrors existing Spyglass feature packages and keeps implementation independent of App Router surfaces.

**Alternatives considered**: A web-only operator console was rejected because the roadmap asks for incident-response capability and tabletop evidence first; UI can follow once primitives are stable.

## Decision: MonitoringSignal as the normalized detection envelope

**Rationale**: Existing subsystems emit different artifacts: audit events, privacy-filter failures, auth/credential events, webhook/API receipts, and hash-chain verification output. A normalized signal envelope gives incident opening, dedupe, severity, and alert routing one contract.

**Alternatives considered**: Directly opening incidents from every subsystem was rejected because it would duplicate severity and dedupe rules.

## Decision: Cross-side leakage and audit-chain failures are hard sev-1

**Rationale**: Constitution §I.1 and §I.D.3 name cross-side leakage as sev-1, and Article I.2 makes hash-chain integrity foundational. These categories must not be downgradable by caller input.

**Alternatives considered**: Configurable severity was rejected for these categories because it weakens foundational constitutional controls.

## Decision: Breach deadline calculation tracks legal clocks but not legal conclusions

**Rationale**: F24 can compute and alert GDPR 72-hour and review timelines from awareness time, jurisdictions, and data-class involvement. Counsel/operator decisions determine whether notification is required.

**Alternatives considered**: Automatic notification decisioning was rejected because applicability depends on counsel-reviewed facts, DPAs, and jurisdictional posture.

## Decision: Evidence preservation stores minimal references and hashes

**Rationale**: Incident response needs durable references to facts without creating a second sensitive-data store. References to audit event IDs, match/dossier IDs, credential IDs, webhook event IDs, hashes, and redaction/tombstone metadata preserve integrity while reducing privacy exposure.

**Alternatives considered**: Copying raw logs into incidents was rejected because it conflicts with data minimization and complicates redaction.

## Decision: Sentry is required only for production-like validation

**Rationale**: `SENTRY_DSN` is already reserved as required from F24. Tests and local development need to run without a live Sentry project, while production/preview should fail configuration checks when no DSN exists.

**Alternatives considered**: Making Sentry required for all environments was rejected because it would break local tests and scaffolding.
