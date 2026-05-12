# Feature Specification — F03 Database Schema Umbrella + Drizzle Migrations

**Feature ID:** F03
**Slug:** `03-db-schema-migrations`
**Branch:** `03-db-schema-migrations`
**Stage:** 1 — Foundation
**Priority:** P0 (Critical)
**Complexity:** S (1–2 weeks)
**Status:** Draft v1.1 (clarifications CL-1, CL-2, CL-3 resolved 2026-05-12)
**Created:** 2026-05-12
**Owner:** Gary
**Constitution refs:** v2.0.0 §I.2 (Integrity), §I.4.1 (Data minimization &
purpose limitation), §I.4.2 (Retention), §I.4.3 (Right to erasure — redaction
by tombstone), §I.4.4 (Data-subject rights), §I.5.3 (Accountability),
§I.B (Phased Jurisdictional Posture — retention horizons must be defensible
in every Phase ≥1 jurisdiction)
**Roadmap:** `.specify/roadmap.md` v1.2.5 (F03)
**PRD:** `PRD.md` §11.5 (data spine is the "first spec"), §7 (committed stack —
Neon Postgres + Drizzle)
**Depends on:** F01 (monorepo, env management, Neon provisioning), F02
(already-shipped schema modules under `packages/db/src/schema/` and migrations
under `packages/db/migrations/`)
**Blocks:** F04 (ticket store — needs F03's umbrella conventions before adding
the first new table outside auth), F05 (audit log — needs F03's retention
declarations to know which classes feed the hash chain vs. tombstone procedure),
every later feature that adds a table

---

## 1. Overview

F03 is the **governance envelope** for the project's relational data layer.
It does **not** ship a new database; F02 already provisioned the Neon project,
created the schema modules under `packages/db/src/schema/`, and applied
migrations `0000`–`0004`. F03 is the spec that retroactively documents that
shipped state, declares the conventions every future schema change must
follow, and writes down the policy-load-bearing facts (retention horizons,
data-classification register, integrity invariants) that the constitution
demands but F02 was not responsible for producing.

### 1.1 Why this feature exists

- **Constitution §I.4.2** requires retention limits declared per data class
  and enforced automatically. F02 shipped tables that hold personal data
  (e.g. `principals.external_id`, `audit_events_buffer.payload`) without a
  per-table retention horizon. F03 is where those horizons are recorded.
- **Constitution §I.2** requires integrity invariants on persisted state. F02
  encoded most invariants as table-level `CHECK` constraints, but the
  *catalog* of invariants — what they guarantee, why they exist, what test
  proves they hold — lives nowhere yet. F03 produces that catalog.
- **Constitution §I.4.1** requires a recorded lawful basis and a declared
  data classification for every personal-data column. F02 shipped without
  this register. F03 produces the classification register.
- **PRD §11.5** names the data spine the "first spec." The schema umbrella
  is the place that spec hangs from.
- **Operational discipline.** Without a written convention, F04 and beyond
  will each invent their own column-naming rules, timestamp semantics,
  audit-trigger patterns, and retention sweepers. F03 sets the
  conventions once.

### 1.2 Scope

**In scope:**
- A **data-classification register** that names every personal-data,
  organizational-data, and operational-data column in the current schema
  and assigns each to a data class.
- A **retention horizon declaration** per data class, recorded as a
  policy artifact (not yet automated by F03 — see §1.3).
- The **integrity-invariant catalog** — every CHECK constraint, unique
  index, partial index, and foreign-key relationship F02 shipped, with the
  rule each invariant enforces and the failure mode it prevents.
- **Migration conventions** — file-naming format, ordering rules, rollback
  policy, idempotency requirements, and the "no destructive change without
  a tombstone path" rule that Article I.4.3 implies.
- **Schema-evolution policy** — when a feature is allowed to add a column,
  add a table, rename, drop, or backfill, and what review gate each path
  requires.
- The **canonical ER diagram** for the F02-shipped tables, kept in this
  spec so downstream features can reference it.
- A **publint-style schema lint** that mechanically verifies every new
  table conforms to the conventions (column-naming, timestamp triple,
  retention class assignment).

**Out of scope (deferred to a later feature):**
- **Automated retention enforcement.** F03 declares horizons; the
  Inngest-driven retention sweepers that actually delete or tombstone rows
  are F05 (audit log + tombstone procedure) and F-TBD (per-class sweepers).
  F03's contribution is the policy declaration the sweepers read.
- **Backup-rotation horizon.** Defined in the data-lifecycle spec (F-TBD,
  pending counsel review per Constitution §I.4.2). F03 references it.
- **Cross-region replication strategy.** Neon's primary/replica topology is
  F01-owned; F03 inherits it.
- **Query-shape locks** beyond what F02 already established. The pg-proxy
  test harness is in F02's surface; F03 does not extend it.
- **Bias-audit demographic schema.** Article I.1 mandates demographic data
  is segregated; F03 does not introduce demographic tables (F-TBD, gated on
  counsel review of consented bias-audit pipeline).
- **Code relocation.** F02's migrations stay under `packages/db/migrations/`
  and schema modules stay under `packages/db/src/schema/`. F03 reads the
  shipped state; it does not move files.

### 1.3 Relationship to F02's shipped state

F02 shipped, in `packages/db/`:
- 9 schema modules: `principals`, `organizations`, `agent_credentials`,
  `service_credentials`, `signing_keys`, `revocations`,
  `revoke_all_sessions_approvals`, `audit_events_buffer`, plus the
  `index.ts` aggregator.
- 5 migrations: `0000_f02_auth_principals_organizations.sql`,
  `0001_f02_b4_agent_credentials_signing_keys_revocations.sql`,
  `0002_f02_b5_service_credentials.sql`,
  `0003_f02_b6_audit_events_buffer.sql`,
  `0004_f02_b6_revoke_all_sessions_approvals.sql`.

F03 treats all of the above as **already-merged input state**. The spec
classifies, documents, and constrains them; it does not re-derive them.
Any retention horizon, classification, or invariant F03 records that
*conflicts* with the shipped state is a finding F03 must surface and
resolve before this feature closes — either by amending the shipped
schema (via a new migration F03 owns) or by amending the policy.

---

## 2. User stories

### User Story 1: A platform engineer adds a new table for F04
**As a** platform engineer working on F04 (ticket store)
**I want** a documented checklist for "what every new table must have"
**So that** my F04 PR isn't bounced for missing a retention class, audit
trigger pattern, or column-naming convention I didn't know existed.

**Acceptance Criteria:**
- [ ] A schema-conventions document under `.specify/specs/03-db-schema-migrations/`
      (or a stable docs path) names every required element: timestamp triple
      (`created_at`, `updated_at`, `disabled_at` where applicable), UUIDv7
      primary keys, retention-class assignment, CHECK constraints for any
      enum-shaped text column, FK on-update/on-delete rules.
- [ ] The schema-lint script flags any new table in a PR diff that is
      missing a required element.
- [ ] The platform engineer can run the lint locally with one command and
      get actionable output (which table, which rule, how to fix).

**Priority:** High

### User Story 2: An operator answers a data-subject erasure request
**As a** Spyglass operator handling a GDPR Art. 17 request
**I want** to know which columns hold personal data tied to a given
data-subject identifier and which tables that data must be tombstoned in
**So that** I can execute the erasure procedure without missing a row or
accidentally over-redacting non-personal data.

**Acceptance Criteria:**
- [ ] The data-classification register lists, for every personal-data
      column in the schema, the data class, the data-subject linkage path
      (`principal_id` → which tables/columns), and whether erasure for
      that column is `hard_delete`, `tombstone`, or `redact_in_place`.
- [ ] The register is machine-readable (YAML or JSON in `contracts/`) so a
      future operator-facing erasure-execution tool can consume it.
- [ ] For every personal-data column, the legal basis (GDPR Art. 6 ground)
      under which it was collected is recorded.

**Priority:** High

### User Story 3: An auditor inspects retention compliance
**As an** external auditor or counsel reviewing Spyglass for Phase 1
admission to a regulated jurisdiction
**I want** a single document listing every data class, its retention
horizon, and the lawful basis for that horizon
**So that** I can verify the platform's retention posture against GDPR
Art. 5(1)(e), CCPA, or jurisdiction-specific requirements without
reading source code.

**Acceptance Criteria:**
- [ ] The retention policy artifact (`retention-policy.md` or equivalent)
      names every data class, its horizon expressed in calendar units, and
      the lawful basis (regulation cite, business need, or legal hold).
- [ ] The artifact is versioned (spec version number) and reviewable as a
      single PR.
- [ ] Default horizon is declared (Constitution §I.4.2: "never indefinite")
      with rationale.

**Priority:** High

### User Story 4: An engineer writes a migration
**As a** Spyglass engineer producing the next Drizzle migration
**I want** clear rules for migration naming, ordering, rollback policy,
and what kinds of changes require a special review path
**So that** I don't accidentally ship a destructive change that violates
the append-only audit-log requirement (Article I.2) or an out-of-order
migration that breaks deploy.

**Acceptance Criteria:**
- [ ] A migration-conventions document specifies file-naming format
      (`NNNN_<feature>_<slug>.sql`), the order rule (monotonically
      increasing prefix), rollback policy (forward-only for production;
      down-migrations for local dev only).
- [ ] The document names the four categories of schema change (additive,
      backfill, transformational, destructive) and the review gate each
      requires.
- [ ] Destructive changes against tables that hold audit-relevant data
      (`audit_events_buffer`, future `audit_log`) are explicitly forbidden
      outside the tombstone procedure (Article I.4.3).

**Priority:** Medium

### User Story 5: A reviewer enforces schema conventions in CI
**As a** code reviewer (human or `/code-review` agent) reviewing a PR that
adds a table or column
**I want** the schema-lint gate to be a required CI check
**So that** convention violations are caught before review attention is
spent and a missed retention-class assignment can never reach `main`.

**Acceptance Criteria:**
- [ ] The lint runs in CI as a required status check.
- [ ] The lint exits non-zero on any violation and prints the offending
      table + rule + remediation hint.
- [ ] The lint covers at minimum: missing retention-class assignment for a
      new table, missing timestamp triple, primary key not UUIDv7, text
      column with enum-shaped values but no CHECK constraint, FK without
      explicit on-update/on-delete behavior.

**Priority:** Medium

---

## 3. Functional requirements

### FR-1 — Data-classification register
The repository SHALL contain a machine-readable register that assigns every
column holding personal data, organizational data, or operationally
sensitive data to exactly one data class. The register SHALL be the
source of truth referenced by every downstream feature that touches that
column.

### FR-2 — Retention horizons per data class
The repository SHALL contain a policy artifact that declares, for every
data class named in the register (FR-1), a retention horizon expressed
in calendar units and a lawful basis for that horizon. No data class
may declare an indefinite horizon. (Constitution §I.4.2.)

### FR-3 — Integrity-invariant catalog
For every F02-shipped table, the spec SHALL record each CHECK constraint,
unique index, partial index, and foreign-key relationship; the rule it
enforces; the failure mode it prevents; and a pointer to the
F02-authored test that proves the invariant holds.

### FR-4 — Migration conventions
The repository SHALL contain a migration-conventions document specifying:
file-naming, ordering rules, idempotency requirements, rollback policy
(forward-only in production), the four categories of schema change
(additive, backfill, transformational, destructive), and the review
gate each category requires.

### FR-5 — Schema-evolution policy
The conventions document (FR-4) SHALL declare the rules for adding,
renaming, dropping, or backfilling tables and columns. Destructive
changes against tables that participate in the audit chain (currently
`audit_events_buffer`; later `audit_log` per F05) SHALL be forbidden
outside the tombstone procedure (Constitution §I.4.3).

### FR-6 — Schema-lint enforcement
The repository SHALL contain an automated schema-lint script. The lint
SHALL be a required CI gate. The lint SHALL flag at minimum: missing
retention-class assignment on a new table, missing timestamp triple,
non-UUIDv7 primary key, text column with apparent enum values lacking a
CHECK constraint, foreign-key relationship lacking explicit `ON UPDATE`
and `ON DELETE` behavior.

### FR-7 — Canonical ER diagram
The spec SHALL contain a canonical entity-relationship diagram covering
the F02-shipped tables, rendered as Mermaid or equivalent, kept in the
spec source so downstream features can copy and amend it.

### FR-8 — Data-subject linkage map
For every table that holds personal data, the register (FR-1) SHALL
record the data-subject linkage path — i.e. how a row joins back to a
`principal_id` so the operator answering an erasure request can find
every row owned by a given subject.

### FR-9 — Erasure-mode declaration
For every personal-data column in the register (FR-1), the erasure mode
SHALL be declared as exactly one of: `hard_delete` (row is removed),
`tombstone` (row is replaced with a cryptographically-bound placeholder
per Article I.4.3), or `redact_in_place` (column is nulled or replaced
with a sentinel value, row remains).

### FR-10 — Lawful-basis declaration per column
For every personal-data column in the register (FR-1), the lawful basis
(GDPR Art. 6 ground or jurisdiction-specific equivalent) under which
collection is permitted SHALL be recorded.

### FR-11 — Convention conformance back-check
F03 SHALL run the schema-lint script (FR-6) against the F02-shipped
schema and either: (a) record zero violations, or (b) surface every
violation as a finding to be resolved before F03 closes (either by
amending the schema via an F03-owned migration or by amending the
convention with recorded justification).

### FR-12 — Documentation cross-reference
The spec SHALL identify, for every existing F02 artifact it governs
(schema module file, migration file, test file), the exact path in the
repository, so a future reader can verify F03's claims against the
shipped state.

---

## 4. Non-functional requirements

### NFR-1 — Documentation discoverability
Every artifact F03 produces SHALL be discoverable from `.specify/specs/03-db-schema-migrations/`
or from a stable repository path linked from that directory. No artifact
may live solely in PR descriptions, chat history, or contributor memory.

### NFR-2 — Schema-lint runtime
The schema-lint script (FR-6) SHALL complete in under 15 seconds on a
warm CI runner against the F02-shipped schema, so it does not add
material latency to the CI critical path. Future schema growth must
keep the lint sub-linear in table count (acceptable: O(tables); not
acceptable: O(tables²) per-column joins).

### NFR-3 — Register machine-readability
The data-classification register (FR-1) SHALL be a single
machine-readable file (YAML or JSON) with a documented schema, so a
future operator-facing tool can consume it without reimplementing the
parser.

### NFR-4 — Versioning discipline
Every artifact F03 produces (register, retention policy, conventions
document) SHALL carry a version number and an `Owner:` line. Changes
SHALL be made by PR against this branch's successor or via an amendment
documented in the changelog of the affected artifact.

### NFR-5 — Audit trail for the register
Material changes to the data-classification register (FR-1) SHALL be
reviewable as discrete PRs (i.e. not bundled with unrelated schema
changes). Reviewer attention is focused on classification changes
specifically.

### NFR-6 — Tombstone path discoverability
For every column whose erasure mode is `tombstone` (FR-9), the spec
SHALL link the procedure that executes the tombstone. Until F05 ships,
the link MAY point to a placeholder ("F05 will own this — until then,
manual operator procedure documented in §X"); the placeholder SHALL be
removed when F05 closes.

---

## 5. Edge cases

### EC-1 — A column holds data that fits multiple classes
A column may plausibly belong to more than one data class (e.g.
`audit_events_buffer.payload` is operational *and* may contain personal
data depending on the event). The register SHALL assign the strictest
applicable class. Erasure mode SHALL be determined by that strictest
class.

### EC-2 — A retention horizon is contested by a legal hold
A row whose data class declares a 90-day horizon may be retained
indefinitely under an active legal hold. The retention policy
artifact (FR-2) SHALL name this exception path explicitly: holds are
recorded as a row-level state, sweepers SHALL respect a "hold flag"
column or join table to be defined by F-TBD. F03 does NOT implement
the hold mechanism; it reserves the design space.

### EC-3 — A table holds no personal data at all
For tables holding only operational data (e.g. `signing_keys` — the
public JWK and the kid; no personal data), the register SHALL still
assign a data class (the appropriate operational class) and a retention
horizon. The horizon may be "indefinite" only for operational tables
whose retention is mechanically required for the platform to function
(JWKS history is the canonical example — keys must verify their issued
credentials until those credentials expire). For any such case, the
register SHALL record the operational requirement as the lawful basis.

### EC-4 — A future migration violates a convention
A future PR adds a column without a CHECK constraint that the lint
believes it should have, but the engineer asserts the constraint is
inappropriate for the column. The conventions document (FR-4) SHALL
provide an opt-out mechanism: an `// schema-lint: skip-<rule>` comment
adjacent to the column definition, requiring a paired justification in
the PR description. The schema-lint script reports skips in its output
so reviewers can audit them.

### EC-5 — Shipped state violates a convention
F03's back-check (FR-11) reveals that F02 shipped a table without a
required element (e.g. a missing index, a text column missing a CHECK).
The spec SHALL name three resolution paths in order of preference:
(a) ship an F03 migration that adds the missing element if doing so is
non-destructive; (b) amend the convention with recorded rationale
("this rule does not apply to tables created before F03"); or
(c) escalate to a constitutional question if the gap is a foundational
one. F03 closes only after every back-check finding has a chosen path
and (for path a) a landed migration.

### EC-6 — A column needs reclassification mid-flight
After F03 closes, a future operator discovers a column was misclassified
(e.g. a "operational" column actually contains personal data). The
register's versioning (NFR-4) and audit-trail discipline (NFR-5) SHALL
make this reclassification a tractable, reviewable PR; the
conventions document SHALL note that retroactive reclassification
triggers a retention-horizon re-evaluation against the new class and
may require an erasure-mode change.

### EC-7 — Drizzle and PostgreSQL disagree
Drizzle infers types and constraints; PostgreSQL is the authority.
For any documented invariant (FR-3), where Drizzle's type model and the
PostgreSQL CHECK / unique / partial-index reality diverge, the spec
SHALL record both and name PostgreSQL as authoritative. The schema-lint
script (FR-6) SHALL warn on divergences detectable at static-analysis
time.

---

## 6. Success metrics

- **M-1.** Schema-lint (FR-6) runs on every PR touching `packages/db/`,
  exits cleanly on the post-F03 baseline, and catches a deliberately
  introduced violation in a test PR.
- **M-2.** The data-classification register (FR-1) covers 100% of
  columns in the F02-shipped schema. (Mechanical check: register
  column count = `information_schema.columns` count for the relevant
  tables, excluding system columns.)
- **M-3.** The retention policy artifact (FR-2) declares a horizon for
  100% of data classes referenced in the register. (Mechanical check:
  every class id in the register appears in the policy artifact.)
- **M-4.** The integrity-invariant catalog (FR-3) names every CHECK
  constraint and unique/partial index in the F02 migrations. (Mechanical
  check: invariant count = `pg_constraint` rows of the relevant kinds
  for the relevant tables.)
- **M-5.** Back-check (FR-11) closes with zero unresolved findings — i.e.
  every finding is either resolved by a landed migration on this branch
  or has a recorded amendment to the conventions.
- **M-6.** No F02 quickstart scenario or test regresses as a side
  effect of F03's work. (`pnpm -r run test` and the F02 quickstart
  scenarios stay green.)

---

## 7. Dependencies & assumptions

### Depends on
- **F01** for the Neon project, environment-variable wiring, and the
  monorepo conventions F03's lint script lives inside.
- **F02** for the schema modules and migrations F03 governs.

### Assumes
- The Neon project topology (primary + read replicas, region) is
  inherited from F01 unchanged.
- Drizzle-Kit remains the migration tool. A switch to a different
  migration tool is a constitutional-amendment-level event, not an F03
  scope item.
- The convention rules F03 codifies are derived from F02's
  already-shipped patterns (UUIDv7 PKs, timestamp triple, partial
  unique indexes, CHECK constraints for enum-shaped text). F03 does not
  invent new conventions out of band.
- Retention horizons declared in FR-2 are policy claims, not enforced
  mechanisms. Enforcement is deferred to F05 (audit log) and a future
  feature owning per-class sweepers.

### Blocks
- F04 (ticket store) — F04 must add its tables conforming to F03's
  conventions; reviewers will gate on F03's lint.
- F05 (audit log + tombstone) — F05's hash-chained log replaces
  `audit_events_buffer`; F05 consumes F03's retention declarations and
  the tombstone procedure references.
- Every later feature that adds a persisted row.

---

## 8. Clarifications

All three clarifications were resolved on 2026-05-12 via `/speckit-clarify`.
The recommended option was accepted in each case. The resolutions are
binding on the rest of the spec, the plan, and downstream implementation.

### CL-1 — RESOLVED — Register location

**Decision:** The data-classification register lives at a **top-level
governance path**: `docs/data-governance/data-classification.yaml`.

F03 creates the file and the surrounding directory; ownership going
forward is platform-wide, not F03-bound. The F03 spec, plan, and tasks
link to the top-level path; future features amend the register at that
path via standalone PRs (per NFR-5).

**Implication for FR-1:** The register's path is `docs/data-governance/data-classification.yaml`.
The retention policy artifact (FR-2) and the conventions document (FR-4)
co-locate at `docs/data-governance/retention-policy.md` and
`docs/data-governance/schema-conventions.md` respectively, for the same
reason.

### CL-2 — RESOLVED — Duration format

**Decision:** Retention horizons are recorded in **both formats**:
- a human-readable summary (e.g. `"90 days"`, `"7 years"`,
  `"until F05 cutover"`),
- and a machine-readable ISO-8601 duration (e.g. `"P90D"`, `"P7Y"`,
  or a sentinel like `"transitional:f05"` for non-fixed horizons).

**Implication for FR-2:** Each row in the retention-policy artifact
carries both fields. The schema-lint (FR-6) MAY add a future check that
the two fields agree; not required at F03 v1.

### CL-3 — RESOLVED — `audit_events_buffer` horizon framing

**Decision:** The buffer's horizon is declared as **transitional**:
`"retained until F05 cutover, then migrated to F05's hash-chained log"`.
Machine-readable sentinel: `"transitional:f05"`.

The transitional sentinel is a permitted exception to the "no indefinite
horizon" rule (Constitution §I.4.2): it defines a concrete endpoint
(F05's hash-chained log going live and the buffer's contents being
migrated) and surfaces the F05 cutover as an obligation the retention
policy will hold us to.

**Implication for FR-2:** The retention policy lists every
`transitional:*` sentinel and its named endpoint. Closing F05 requires
the cutover to land *and* the sentinel to be removed from the retention
policy in the same change.

---

## 9. Constitutional alignment

| Article | Requirement | F03 contribution |
|---|---|---|
| §I.2 (Integrity) | Invariants on persisted state are versioned and enforced | FR-3 catalogs every shipped invariant + the test that proves it |
| §I.2 (Integrity, append-only audit) | Mutation/deletion of prior audit entries is prohibited outside the tombstone procedure | FR-5 forbids destructive changes on audit-relevant tables outside the tombstone path |
| §I.4.1 (Data minimization & lawful basis) | Lawful basis recorded for every personal-data processing operation | FR-10 declares lawful basis per personal-data column |
| §I.4.2 (Retention) | Retention limits declared per data class and never indefinite | FR-2 declares horizons; CL-3 forecloses indefinite declarations |
| §I.4.3 (Right to erasure — tombstone) | Erasure honors data-subject rights without breaking audit integrity | FR-9 declares per-column erasure mode; NFR-6 links the tombstone procedure |
| §I.4.4 (Data-subject rights) | Operators must locate every row owned by a subject | FR-8 records the data-subject linkage path per table |
| §I.5.3 (Accountability) | Privileged actions are attributable to a principal | F03 does not weaken this; the register notes which columns hold the principal linkage |
| §I.B (Phased posture) | Retention horizons defensible in every active jurisdiction | FR-2's policy artifact is the source counsel reviews per jurisdiction |

No constitutional exceptions are requested by F03. The feature is
governance and documentation work; it adds no new mutable surface.

---

## 10. Open questions deferred to /speckit-clarify

None remain at v1.1. CL-1, CL-2, CL-3 are all resolved (see §8).
The next phase is `/speckit-plan`.
