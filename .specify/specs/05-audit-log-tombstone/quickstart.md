# Quickstart — F05 Audit Log + Transcript Store + Tombstone

## Scenario 1 — Replay F02/F04 buffer events

1. Seed a dev database with F02 operator events and F04 ticket transition events in `audit_events_buffer`.
2. Run the F05 replay command.
3. Verify each buffer row has one canonical audit row.
4. Re-run replay and verify no duplicates are created.
5. Run the chain verifier and record valid status.

## Scenario 2 — Detect audit tampering

1. Seed at least 100 canonical audit events.
2. Mutate one non-tombstoned payload in a local transaction fixture.
3. Run chain verification.
4. Verify the verifier reports invalid status and the first invalid event id.
5. Roll back the fixture mutation.

## Scenario 3 — Append transcript turns

1. Create a match ticket through F04 test fixtures.
2. Append three seeker-side and three employer-side transcript turns for one run.
3. Verify ordering by `(run_id, side, turn_index)`.
4. Submit a duplicate turn index and verify idempotency conflict.
5. Verify each transcript append has a linked audit event.

## Scenario 4 — Tombstone audit and transcript evidence

1. Seed canonical audit and transcript records containing test personal data.
2. Execute a tombstone request with lawful basis and operator principal.
3. Verify raw personal data is no longer present in target records.
4. Verify tombstone metadata includes original hash, replacement hash, timestamp, lawful basis, operator, and procedure version.
5. Verify the tombstone action itself appears in the audit log.
6. Run chain verification and confirm valid status.

## Scenario 5 — Deny unauthorized evidence access

1. Attempt raw audit read as an unscoped human principal.
2. Attempt transcript read as a seeker or employer principal.
3. Attempt evidence export without audit export scope.
4. Verify all three requests are denied and no raw evidence is returned.

## Scenario 6 — Evidence export for review

1. Seed events and transcript turns for one match.
2. Request an evidence export as a scoped audit principal.
3. Verify the manifest includes filter inputs, event ids, transcript turn ids, tombstone markers, and chain verification status.
4. Re-run the same export and verify the manifest hash is deterministic.
