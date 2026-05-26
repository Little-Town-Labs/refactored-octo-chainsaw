# Quickstart: Phase 0 Alpha Posture Infrastructure

## Scenario 1: Consent

1. Record seeker consent for the current consent version.
2. Record employer consent for the current consent version.
3. Evaluate participation eligibility.
4. Withdraw one consent and verify eligibility fails closed.

Expected evidence: alpha-posture consent tests.

## Scenario 2: Informational-only dossier posture

1. Apply Phase 0 posture to a dossier payload.
2. Verify `alpha - informational only` banner and `non_production_decision=true`.
3. Verify delivery check refuses unmarked payloads.

Expected evidence: alpha-posture dossier tests.

## Scenario 3: Human review gate

1. Evaluate outreach with no human review and verify block.
2. Evaluate outreach with rejected review and verify block.
3. Evaluate outreach with approved review, valid consent, and alpha dossier posture and verify allow.

Expected evidence: alpha-posture gate tests.

## Scenario 4: Counsel evidence

1. Evaluate Phase 0 to Phase 1 readiness without counsel evidence and verify block.
2. Register signed dated memo evidence under `.specify/memory/counsel-reviews/`.
3. Verify readiness evidence passes.

Expected evidence: counsel evidence tests and runbook.
