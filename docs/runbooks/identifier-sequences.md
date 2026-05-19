# Runbook — Ticket identifier sequences

**Owner:** F04 (Ticket store + state machines) · **Version:** 1.0 · **Date:** 2026-05-13

This runbook covers the PostgreSQL native sequences that back ticket
identifier allocation (`ST-YYYY-NNNNN`, `ER-YYYY-NNNNN`,
`MT-YYYY-NNNNN`) — bootstrap, annual rollover, missed-rollover
recovery, and audit.

Related code:

- Allocator: `packages/tickets/src/identifiers.ts`
- Rollover: `packages/tickets/src/rollover.ts`
- Initial migration: `packages/db/migrations/0005_f04_ticket_store.sql`

---

## 1. Sequence naming

| Kind                 | Prefix | Table                  | Sequence name                       |
| -------------------- | ------ | ---------------------- | ----------------------------------- |
| seeker_ticket        | `ST`   | `seeker_tickets`       | `seeker_tickets_<year>_seq`         |
| employer_req_ticket  | `ER`   | `employer_req_tickets` | `employer_req_tickets_<year>_seq`   |
| match_ticket         | `MT`   | `match_tickets`        | `match_tickets_<year>_seq`          |

Each sequence is a vanilla PostgreSQL `SEQUENCE` (`bigint`, `START 1`,
`INCREMENT 1`). The allocator zero-pads `nextval(...)` to five digits.

---

## 2. Bootstrapping a fresh database

The F04 migration (`0005_f04_ticket_store.sql`) creates the **current
year** sequences automatically:

```sql
CREATE SEQUENCE IF NOT EXISTS "seeker_tickets_2026_seq" START 1;
CREATE SEQUENCE IF NOT EXISTS "employer_req_tickets_2026_seq" START 1;
CREATE SEQUENCE IF NOT EXISTS "match_tickets_2026_seq" START 1;
```

If the database is provisioned mid-year, no manual action is needed —
the migration is current-year aware.

If the database is provisioned for a future year (e.g., a staged dev
environment ahead of the calendar rollover), run the rollover function
manually for the target year (see §4).

---

## 3. Annual rollover (the happy path)

A scheduled job is intended to run at `0 0 1 12 *` UTC (00:00 UTC on
December 1) every year. It calls
`bootstrapYearSequences(executor, nextYear)` which:

1. For each ticket kind, runs `CREATE SEQUENCE IF NOT EXISTS
   "<table>_<nextYear>_seq" START 1`.
2. Emits one `identifier_sequences.bootstrapped` audit event per
   sequence that was newly created (sequences that already existed
   emit nothing — the operation is fully idempotent).

The function is safe to re-run. Re-execution after a partial success
will skip already-created sequences and create only the missing ones.

> **Scheduler note (F04 B4 status):** The Inngest cron wrapper is not
> yet wired into `apps/web` because Inngest itself is not installed in
> the monorepo. Until that lands, the rollover runs as the operator
> manual procedure in §4. Once Inngest is configured the wrapper will
> wrap `bootstrapYearSequences` with no logic changes; the audit
> events the function returns become the wrapper's emit payloads.

---

## 4. Missed-rollover recovery (EC-9)

**Symptoms.**

- Tickets created in the new year fail with `SequenceNotFoundError`.
- The application log shows the missing sequence name (e.g.,
  `seeker_tickets_2027_seq`).

**Procedure.**

1. Confirm the gap. From a `psql` session against the affected database:

   ```sql
   SELECT relname
   FROM pg_class
   WHERE relkind = 'S'
     AND relname LIKE '%_tickets_2027_seq'
   ORDER BY relname;
   ```

   You should see three rows; any missing row indicates the gap.

2. Run the rollover function for the target year. From a Node REPL (or
   a one-off script in `apps/web`):

   ```ts
   import { bootstrapYearSequences, drizzleBootstrapExecutor } from "@spyglass/tickets";
   import { getDb } from "@spyglass/db";

   const db = getDb();
   const result = await bootstrapYearSequences(drizzleBootstrapExecutor(db), 2027);
   console.log(result);
   ```

   Expected output (full recovery from a complete miss):

   ```json
   {
     "year": 2027,
     "created": [
       "seeker_tickets_2027_seq",
       "employer_req_tickets_2027_seq",
       "match_tickets_2027_seq"
     ],
     "skipped": [],
     "auditEvents": [/* 3 entries */]
   }
   ```

3. If the cron's failure path did not emit the audit events,
   hand-write them into `audit_events_buffer` using the
   `auditEvents[]` returned in step 2. F05 will read them from there.

4. File an incident summary in `docs/incidents/` referencing this
   runbook, the affected year, and the timestamps.

**SQL fallback.** If Node tooling is unavailable, the raw SQL is:

```sql
CREATE SEQUENCE IF NOT EXISTS "seeker_tickets_2027_seq" START 1;
CREATE SEQUENCE IF NOT EXISTS "employer_req_tickets_2027_seq" START 1;
CREATE SEQUENCE IF NOT EXISTS "match_tickets_2027_seq" START 1;
```

The application allocator will pick the sequences up on the next call
without a restart.

---

## 5. Auditing the rollover

Every run emits an `identifier_sequences.bootstrapped` event into
`audit_events_buffer` per *newly created* sequence with the shape:

```json
{
  "event_name": "identifier_sequences.bootstrapped",
  "payload": { "sequence_name": "seeker_tickets_2027_seq", "year": 2027 }
}
```

To audit the most recent rollover:

```sql
SELECT created_at, payload
FROM audit_events_buffer
WHERE event_name = 'identifier_sequences.bootstrapped'
ORDER BY created_at DESC
LIMIT 10;
```

A successful annual rollover leaves three rows in this query for the
year that was bootstrapped (assuming it was a fresh year).

---

## 6. Linked documents

- `data-model.md` §6 — Identifier shape contract
- `.specify/specs/04-ticket-store-state-machines/plan.md` §3 R-3 — Annual rollover design
- `packages/tickets/src/__tests__/rollover.test.ts` — Test coverage
