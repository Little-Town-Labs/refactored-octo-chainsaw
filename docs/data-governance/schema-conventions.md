# Spyglass schema conventions

**Version:** 1.0 (2026-05-12)
**Last reviewed:** 2026-05-12
**Owner:** Gary

The rules every new table, column, index, and migration in the
Spyglass repo must follow. Enforced mechanically by
[`scripts/check-schema-conventions.sh`](../../scripts/check-schema-conventions.sh)
(the schema-lint) wired into CI. Violations may be temporarily opted
out via the skip mechanism in §9 with a paired justification in the
PR description.

Constitutional anchor: §I.2 (integrity invariants are versioned and
enforced); §I.4.3 (no destructive change to audit-relevant tables
outside the tombstone procedure).

These conventions codify the patterns F02 already shipped under
[`packages/db/src/schema/`](../../packages/db/src/schema/) and
[`packages/db/migrations/`](../../packages/db/migrations/). They are
descriptive, not invented; every rule below points at the F02 file
that demonstrates it.

---

## 1. Naming

- **Tables.** `snake_case`, plural noun (or noun phrase). Examples:
  `principals`, `agent_credentials`, `revoke_all_sessions_approvals`.
- **Columns.** `snake_case`. Avoid generic names (`type`, `data`,
  `value`) when a more specific name is possible (`kind`,
  `payload`, `scope_set`).
- **Timestamps.** `<verb>_at` (past-tense verb): `created_at`,
  `updated_at`, `expires_at`, `disabled_at`, `revoked_at`,
  `activated_at`.
- **Booleans.** `is_<adjective>` (`is_active`) or `<verb>ed`
  (`enabled`). Avoid `<noun>_flag`.
- **Primary keys.** `<entity>_id` where entity is the singular form
  of the table name (`principal_id` on `principals`, `kid` on
  `signing_keys` — kid is the JWS-standard identifier and is
  grandfathered).
- **Foreign-key columns.** Same name as the target PK (`org_id`,
  `principal_id`). Avoid `_fk` suffixes.

**Precedent:** every F02 schema module follows this naming. See
`packages/db/src/schema/principals.ts` for the canonical example.

---

## 2. Timestamps

- Every **mutable** table carries the triple `created_at`, `updated_at`,
  `disabled_at` (nullable):
  - `created_at` and `updated_at`: `timestamp({ withTimezone: true }).notNull().default(sql\`now()\`)`
  - `disabled_at`: `timestamp({ withTimezone: true })` (nullable; the
    soft-delete marker).
- **Audit / log / append-only** tables omit `updated_at` and
  `disabled_at` — they are write-once.
- **Lookup / denormalized** tables (e.g., `revocations`) MAY omit
  the triple entirely if the parent row carries the timestamps. This
  is a documented exception, requested via §9 skip
  (`skip-r2-timestamps`) with the parent table referenced.
- **No `deleted_at`.** Destructive deletes on personal-data or
  audit-relevant tables are forbidden (§8). Soft-delete uses
  `disabled_at`.
- **All timestamps are `timestamptz`** (UTC at the database boundary;
  application layer projects to local zones at the edge).

**Precedent:** `principals` (full triple), `audit_events_buffer`
(append-only — created_at only), `revocations` (lookup — no triple).

---

## 3. Primary keys

- Type: `uuid`.
- Default: `.default(sql\`uuidv7()\`)`.
- **UUIDv7** chosen for time-sortability + index locality (recent rows
  cluster together on disk). PostgreSQL 18+ provides `uuidv7()` built-in.
- One-row-per-thing exception: `signing_keys.kid` is `text PRIMARY KEY`
  because the JWS standard requires arbitrary string ids. Documented
  as the only carve-out at v1; future kid-shaped PKs require an
  explicit ADR.

**Precedent:** every F02 table except `signing_keys`.

---

## 4. Foreign keys

- Every `references()` call MUST specify on-update and on-delete
  behavior explicitly. Default: `NO ACTION` for both (cascading
  deletes are forbidden against personal-data rows because the
  tombstone procedure must be explicit, not implicit — §I.4.3).
- F02 shipped before this rule was written; existing F02 FKs are
  grandfathered as **warn-only** at lint v1 (rule R5 warn). New FKs
  ship with explicit behavior.
- FK target MUST exist before the migration adding the FK runs. Use
  the monotonic migration ordering (§8) to guarantee this.

**Precedent:** see `agent_credentials.principal_id`, the FK to
`principals.principal_id`.

---

## 5. Enums as text + CHECK

- PostgreSQL `enum` types are **not used**. Drizzle migration support
  for enum evolution is awkward, and `text + CHECK` gives us the
  same correctness with a simpler migration story.
- Every `text` column whose value space is bounded carries a CHECK:
  `check("<table>_<col>_check", sql\`${t.col} IN ('a','b','c')\`)`
- Columns matching the regex `kind|status|side|reason_code|purpose|tier`
  are presumed bounded; the lint flags any such column lacking a
  CHECK (rule R4).

**Precedent:** `principals.kind`, `agent_credentials.side`,
`signing_keys.purpose`, `revoke_all_sessions_approvals.reason_code`.

---

## 6. JSONB

- Use Drizzle's `jsonb(...).$type<Record<string, unknown>>()` (or a
  more specific type) for typing.
- For **invariant shapes** (e.g., non-empty array, required keys),
  add a CHECK constraint:
  `check("<table>_<col>_nonempty", sql\`jsonb_typeof(${t.col}) = 'array' AND jsonb_array_length(${t.col}) >= 1\`)`
- Avoid JSONB for data that has stable shape — use real columns.
  JSONB is for structurally-variable payloads (audit event payload,
  scope sets that may grow).

**Precedent:** `agent_credentials.scope_set` (non-empty array CHECK),
`audit_events_buffer.payload` (no shape CHECK — variable by event_name).

---

## 7. Indexes

- **Partial indexes** for hot WHERE clauses. Common patterns:
  - `WHERE revoked_at IS NULL` (active credentials)
  - `WHERE disabled_at IS NULL` (enabled rows)
  - `WHERE expires_at > now()` (live tokens)
  - `WHERE <fk_col> IS NOT NULL` (sparse FKs)
- **Naming:** `<table>_<purpose>_idx` or `<table>_<column>_<purpose>_idx`.
  Examples: `agent_credentials_active_idx`,
  `signing_keys_active_per_purpose_idx`.
- **Sort indexes** for newest-first listings: include `.desc()` on
  the sort key.
- **Unique** indexes carry `unique` in the name only when the
  uniqueness is non-obvious (e.g.,
  `agent_credentials_idempotency_idx` is unique but the name
  emphasizes the rule, not the kind).

**Precedent:** see indexes on `agent_credentials`,
`audit_events_buffer`, `signing_keys`.

---

## 8. Migrations

### 8.1 File naming

Format: `NNNN_<feature>_<short_slug>.sql`
- `NNNN`: 4-digit monotonically-increasing prefix.
- `<feature>`: feature id slug, e.g., `f02`, `f03`, `f04`.
- `<short_slug>`: 2–5 words describing the change.

Examples (F02): `0000_f02_auth_principals_organizations.sql`,
`0003_f02_b6_audit_events_buffer.sql`.

### 8.2 Ordering

Migration files are applied in lexicographic order. Skipped numbers
are forbidden. If a PR adds the wrong next number, rebase rather than
renumber existing files.

### 8.3 Rollback policy

**Forward-only in production.** Drizzle-Kit does not emit
`down.sql` and the deployment pipeline does not run rollbacks against
prod. Bad migrations are fixed by a subsequent corrective migration.
Local dev may use Drizzle's snapshot reset.

### 8.4 Idempotency

Migrations SHOULD be idempotent where reasonable: prefer
`CREATE TABLE IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS` over
unconditional forms. The migration runner currently guarantees
single-application, but idempotency is defense-in-depth for partial
failures.

### 8.5 Change categories

| Category | Examples | Review gate |
|---|---|---|
| **Additive** | `CREATE TABLE`, `ADD COLUMN` (nullable), `CREATE INDEX` | Default code-review |
| **Backfill** | `UPDATE` to populate new columns, `INSERT` of seed rows | Default + idempotency check |
| **Transformational** | Type changes, NOT NULL on existing columns, column renames | Architectural review (Gary + reviewer) |
| **Destructive** | `DROP COLUMN`, `DROP TABLE`, `DELETE` | **Forbidden on audit-relevant tables outside the tombstone procedure** (§I.4.3) |

### 8.6 Audit-relevant tables

The lint (rule R6) maintains a list of tables for which destructive
SQL is forbidden in any migration:

- `audit_events_buffer` (current)
- `audit_log` (future, when F05 ships)

Adding a table to this list is a one-line change to the lint script
and SHOULD accompany the migration that creates that table.

---

## 9. Skip mechanism

Adjacent to the column or table definition, an inline comment in the
form `// schema-lint: skip-<rule-id>` opts that line out of one rule.

**Required pairing:** the PR description MUST contain a justification
for every skip, structured as:

```
schema-lint skip: <rule-id> at packages/db/src/schema/<file>.ts:<line>
Reason: <why this rule does not apply here>
Reviewed-by: <reviewer initials>
```

The lint reports all active skips in its output footer so reviewers
can audit them.

**Available skip rules** (R1–R7 from the lint script, see
`scripts/check-schema-conventions.sh`):
- `skip-r1-uuidv7-pk`
- `skip-r2-timestamps`
- `skip-r3-register-coverage`
- `skip-r4-enum-check`
- `skip-r5-fk-behavior`
- `skip-r6-destructive` *(not actually skippable; reserved for the audit-list opt-in)*
- `skip-r7-skip-report` *(no-op; the lint's own skip-reporting cannot be silenced)*

---

## 10. Register-PR audit discipline (NFR-5)

Material changes to
[`docs/data-governance/data-classification.yaml`](./data-classification.yaml)
SHALL ship as **standalone PRs**, not bundled with unrelated schema
changes. Reviewer attention should focus on classification deltas
specifically — sensitivity changes, erasure-mode changes, and
data-subject linkage path changes have legal and policy implications
that get lost in a mixed diff.

**What counts as "material":**
- Adding or removing a `data_classes[]` row.
- Changing any existing `data_classes[].sensitivity`,
  `erasure_mode`, or `default_lawful_basis`.
- Changing any `tables[].columns[].class` or `erasure`.
- Adding a new table entry (always — this is a new classification).

**What does NOT count as material** (may ship in a mixed PR):
- Adding a `notes:` field to an existing column row.
- Reformatting / line-wrapping.
- Updating `$last_reviewed`.

Reviewers SHOULD reject mixed PRs touching material classification
without an explicit justification in the PR description.

---

## 11. Changelog

- **v1.0 (2026-05-12)** — Authored under F03 T009. Codifies F02
  patterns; §10 register-PR discipline new in F03.
