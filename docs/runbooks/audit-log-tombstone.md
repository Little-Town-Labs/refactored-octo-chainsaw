# Runbook — Audit Log Tombstone

**Owner:** F05 (Audit log + transcript store + tombstone) · **Version:** 1.0 · **Date:** 2026-05-19

This runbook covers the F05 redaction-by-tombstone procedure for
canonical audit events and transcript turns. Tombstoning is the only
permitted mutation path for F05 append-only evidence records.

Related code:

- Tombstone procedure: `packages/audit-log/src/tombstone.ts`
- Canonical audit writer: `packages/audit-log/src/writer.ts`
- Transcript store: `packages/audit-log/src/transcripts.ts`
- Schema: `packages/db/src/schema/audit-log.ts` and `packages/db/src/schema/transcript-store.ts`
- Retention policy: `docs/data-governance/retention-policy.md`

## 1. Operational Gate

Production execution requires counsel sign-off before Phase 2/NYC use.
Development and staging verification may exercise the procedure with
synthetic or approved test records.

Required inputs:

- Opaque `subject_ref`, such as `principal:<uuid>`. Do not use raw names,
  email addresses, phone numbers, or other direct identifiers.
- Target kind and id: `audit_event:<uuid>` or `transcript_turn:<uuid>`.
- Lawful basis.
- Procedure version, initially `f05.v1`.
- Operator principal id.
- Operator scope `audit.tombstone.execute`.
- Correlation id for the request.
- Legal-hold decision from counsel or the designated evidence owner.

Do not execute if any input is missing, if counsel has placed the target
under legal hold, or if the target is not associated with the subject
reference.

## 2. Request Intake

Create or link an internal erasure ticket before touching evidence
records. The ticket must include:

- Request source and received timestamp.
- Data-subject reference mapping performed outside the audit log.
- Lawful basis and retention exception analysis.
- Counsel approval or explicit development-only scope.
- Operator assigned to execute and reviewer assigned to verify.

Keep raw subject identifiers out of `tombstone_records.subject_ref`; use
only the opaque reference recorded in the ticket.

## 3. Preflight Queries

Resolve candidate canonical audit events for a principal subject:

```sql
SELECT audit_event_id, event_name, principal_id, correlation_id, created_at, tombstoned_at
FROM audit_log_events
WHERE principal_id = '<principal_uuid>'
ORDER BY audit_event_id;
```

Resolve transcript turns linked to that principal's transcript append
events:

```sql
SELECT tt.transcript_turn_id, tt.match_ticket_id, tt.run_id, tt.side, tt.turn_index,
       tt.audit_event_id, tt.tombstoned_at
FROM transcript_turns tt
JOIN audit_log_events ale ON ale.audit_event_id = tt.audit_event_id
WHERE ale.principal_id = '<principal_uuid>'
ORDER BY tt.transcript_turn_id;
```

Check whether the target is already tombstoned:

```sql
SELECT tombstone_id, target_kind, target_id, subject_ref, procedure_version, created_at
FROM tombstone_records
WHERE target_kind = '<audit_event|transcript_turn>'
  AND target_id = '<target_uuid>';
```

If any query result conflicts with the erasure ticket, stop and return to
counsel or the evidence owner.

## 4. Execution

Use the F05 API from server-side code with a database transaction:

```ts
import { createDrizzleTombstoneStore, executeTombstone } from "@spyglass/audit-log";

await executeTombstone(
  createDrizzleTombstoneStore(db, {
    hasLegalHold: async (target) => {
      // Replace with the counsel-approved legal-hold source before production use.
      return isUnderLegalHold(target);
    },
  }),
  {
    target: { kind: "audit_event", id: "<target_uuid>" },
    subjectRef: "principal:<principal_uuid>",
    lawfulBasis: "<lawful_basis>",
    procedureVersion: "f05.v1",
    operatorPrincipalId: "<operator_principal_uuid>",
    operatorScopes: ["audit.tombstone.execute"],
    correlationId: "<correlation_id>",
  },
);
```

The procedure performs one atomic transaction:

- Resolves deterministic targets for the subject reference.
- Denies already-tombstoned, legal-hold, missing-lawful-basis, and
  subject-mismatch requests, plus requests without
  `audit.tombstone.execute`.
- The Drizzle adapter denies by default when no legal-hold checker is
  supplied.
- Appends a `tombstone.denied` audit event for denied attempts.
- Replaces audit payloads with a tombstone envelope or transcript
  content with `NULL`.
- Inserts one `tombstone_records` row with original and replacement
  hashes.
- Appends a `tombstone.executed` audit event in the `tombstone` chain
  namespace.

Manual SQL updates are not an approved execution path. If an emergency
requires direct SQL, use `BEGIN`, perform the full target update,
audit-event append, and tombstone insert in one transaction, verify all
rows, then have a peer review before `COMMIT`.

## 5. Verification

Verify the target row:

```sql
SELECT audit_event_id, payload, payload_hash, event_hash, tombstoned_at
FROM audit_log_events
WHERE audit_event_id = '<target_uuid>';

SELECT transcript_turn_id, content, content_hash, audit_event_id, tombstoned_at
FROM transcript_turns
WHERE transcript_turn_id = '<target_uuid>';
```

Verify tombstone evidence:

```sql
SELECT target_kind, target_id, subject_ref, lawful_basis, procedure_version,
       operator_principal_id, original_hash, replacement_hash, audit_event_id, created_at
FROM tombstone_records
WHERE target_kind = '<audit_event|transcript_turn>'
  AND target_id = '<target_uuid>';
```

Verify the tombstone audit event:

```sql
SELECT audit_event_id, event_name, principal_id, role_or_scope, correlation_id,
       chain_namespace, payload, created_at
FROM audit_log_events
WHERE event_name = 'tombstone.executed'
  AND correlation_id = '<correlation_id>';
```

Local verification gates:

```bash
pnpm --filter @spyglass/audit-log test -- tombstone.test.ts hash-chain.test.ts
pnpm --filter @spyglass/audit-log type-check
pnpm schema:lint
```

For a full F05 closure pass, also run the focused audit-log package
suite and the F05 quickstart scenarios.

## 6. Rollback Limits

Tombstone execution is intentionally not reversible through application
code. Once committed:

- Raw audit payload or transcript content is removed from the canonical
  store.
- `tombstone_records` and the `tombstone.executed` audit event remain as
  evidence.
- Rehydrating raw personal data from backups requires counsel approval,
  incident evidence handling, and a separate documented restoration
  ticket.

If a transaction fails before commit, rerun preflight queries before
retrying. If a committed tombstone targeted the wrong record, do not
delete or mutate the tombstone evidence; open an incident ticket and add
corrective audit evidence through the canonical audit writer.

## 7. Evidence Export Handoff

F05 evidence export primitives are tracked separately from this
runbook. Until `evidence_exports` APIs are complete, attach the
verification query outputs and local gate results to the erasure ticket.
Do not attach raw pre-tombstone payloads unless counsel explicitly
requires them for a privileged evidence package.
