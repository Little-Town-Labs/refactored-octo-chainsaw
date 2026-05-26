# Quickstart: Incident Response + Breach Notification + Monitoring

## Scenario 1: Synthetic signal classification

1. Run the incident-response package tests.
2. Verify synthetic privacy-filter bypass, cross-side leakage, audit-chain failure, auth anomaly, credential misuse, webhook replay, and API abuse inputs all classify into monitoring signals.
3. Confirm cross-side leakage and audit-chain failure are sev-1.

Expected evidence: Jest output for classifier tests and monitoring-signal schema validation.

## Scenario 2: Incident lifecycle and evidence preservation

1. Open a sev-1 incident from a cross-side leakage signal.
2. Assign an incident commander.
3. Add timeline entries for triage, containment, evidence preservation, recovery, notification assessment, and postmortem.
4. Attempt closure before postmortem/corrective-action tracking and confirm it is rejected.
5. Complete required fields and confirm closure succeeds.

Expected evidence: incident lifecycle tests and evidence export snapshot.

## Scenario 3: Breach notification deadlines

1. Create an incident with personal-data involvement and awareness time.
2. Add GDPR, data-subject high-risk review, US state/counsel review, and contractual employer notification obligations.
3. Verify GDPR supervisory authority deadline is awareness + 72 hours.
4. Simulate approaching and overdue deadlines.

Expected evidence: deadline tests showing alert signals for approaching/overdue obligations.

## Scenario 4: Production-like env validation

1. Validate development/test env can load without `SENTRY_DSN`.
2. Validate production/preview env fails the F24 monitoring check when `SENTRY_DSN` is absent.
3. Validate production/preview env passes when `SENTRY_DSN` is a valid URL.

Expected evidence: shared env tests and generated `.env.example` drift check if the schema changed.

## Scenario 5: Stage 8 tabletop evidence

1. Execute the documented cross-side leakage tabletop.
2. Execute the credential-compromise drill using existing credential lifecycle guidance.
3. Execute monitoring/deadline failure drill.
4. Record gaps, owners, due dates, and follow-up status.

Expected evidence: `.specify/specs/024-incident-response/quickstart-run-2026-05-26.md` with test output and tabletop artifact references.
