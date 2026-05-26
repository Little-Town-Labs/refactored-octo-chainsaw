# Threat Model: Phase 0 Alpha Posture Infrastructure

## Scope

F25 covers alpha consent records, informational-only dossier posture, the
human-review outreach gate, and counsel evidence references for phase
transition readiness.

## Assets

- Seeker and employer alpha consent records.
- Phase 0 dossier posture metadata.
- Human review decisions before outreach.
- Counsel memo references for Phase 0 -> Phase 1 transition.

## Threats And Mitigations

| Threat | Risk | Mitigation |
|--------|------|------------|
| Non-consented participant enters alpha run | Unauthorized processing | Consent evaluator requires current consent version and fails closed on missing, withdrawn, declined, or expired records. |
| Dossier reused as hiring decision artifact | Phase 0 posture violation | Dossier helper applies a required `alpha - informational only` banner and `non_production_decision=true`; evaluator blocks unmarked payloads. |
| Automated outreach bypasses human review | Unreviewed escalation | Outreach gate requires approved human review in addition to both consent records and dossier posture. |
| Phase transition proceeds without counsel evidence | Constitutional §V.2 violation | Phase transition evaluator blocks missing counsel evidence and validates signed, dated memo references under `.specify/memory/counsel-reviews/`. |
| Optional evidence hash omitted | Weak traceability | Hash is optional for package acceptance but supported in schema and DB for stronger operator practice. |

## Residual Risk

F25 provides package-level primitives and schema. Integration into every
product delivery path remains required before the Phase 0 launch gate can be
closed.
