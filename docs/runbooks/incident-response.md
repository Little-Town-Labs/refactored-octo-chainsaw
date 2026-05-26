# Incident Response Runbook

F24 implements Constitution Article I.D for detection, response, recovery, breach notification tracking, and post-incident review. Legal notification decisions remain counsel/operator decisions; this runbook keeps clocks, evidence, ownership, and review state explicit.

## sev-1

Triggers include cross-side leakage and audit-log hash-chain integrity failure.

1. Page on-call and assign an incident commander.
2. Open an incident from the monitoring signal.
3. Preserve minimal evidence references: audit event IDs, hash-chain verification output, match/dossier IDs, credential events, webhook/API event IDs, and relevant external issue IDs.
4. Record awareness time and personal-data involvement.
5. Create notification obligations for GDPR, data-subject high-risk review, US state/counsel review, and contractual employer notification as applicable.
6. Contain the failure path, including kill switches or credential revocation when relevant.
7. Recover the affected path and document validation evidence.
8. Complete postmortem summary and corrective-action tracking before closure.

## sev-2

Triggers include credential misuse, webhook replay/signature abuse, monitoring sink failure, and approaching notification deadlines.

1. Assign an owner and open or attach to an incident.
2. Preserve evidence references without copying raw personal data.
3. Contain active abuse or failing delivery paths.
4. Escalate to sev-1 if personal-data breach indicators, cross-side leakage, or audit-chain integrity failure appear.
5. Track corrective actions when recovery needs code, config, or runbook changes.

## sev-3

Triggers include bounded auth anomalies or employer API abuse without evidence of compromise.

1. Review the signal and dedupe key.
2. Attach to an existing incident if repeated.
3. Preserve minimal evidence if investigation is needed.
4. Close only when the false-positive or resolved rationale is recorded.

## Breach Notification Workflow

1. Record `awareness_at` as soon as the incident team is aware of a potential personal-data breach.
2. If GDPR applies, create a supervisory-authority obligation with deadline `awareness_at + 72 hours`.
3. Track data-subject high-risk review separately from supervisory-authority review.
4. Track US state and contractual employer notification review separately because deadlines and recipients vary.
5. Record counsel decisions with rationale and evidence packet references.
6. Treat approaching or overdue notification obligations as monitoring signals.

## Closure Requirements

Sev-1 incidents cannot close until notification assessment, postmortem summary, and corrective-action tracking are complete. Timeline entries must remain principal-attributed and append-only.
