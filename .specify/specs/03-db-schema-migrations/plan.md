# Implementation Plan — F03 Database Schema Umbrella + Drizzle Migrations

**Feature ID:** F03
**Branch:** `03-db-schema-migrations`
**Plan version:** v1.0 (2026-05-12)
**Owner:** Gary
**Spec:** `.specify/specs/03-db-schema-migrations/spec.md` v1.1
**Constitution:** v2.0.0
**Stack baseline:** Next.js 16 (App Router) + Drizzle ORM 0.45 + Drizzle-Kit 0.31
+ PostgreSQL on Neon + pnpm/Turborepo monorepo (F01); package
`@spyglass/db` already exists with schema modules under `src/schema/`
and migrations under `migrations/` (F02).

---

## 1. Executive summary

F03 is **governance work**, not a build-out. The data layer is already
shipped (F02). F03 produces five deliverables:

1. A **data-classification register** at
   `docs/data-governance/data-classification.yaml` listing every column
   in the F02-shipped schema and assigning each a data class, an
   erasure mode, a data-subject linkage path, and a lawful basis (FR-1,
   FR-8, FR-9, FR-10).
2. A **retention policy** at `docs/data-governance/retention-policy.md`
   declaring per-class horizons in human-readable + ISO-8601 form (FR-2,
   CL-2, CL-3).
3. A **conventions document** at
   `docs/data-governance/schema-conventions.md` codifying the migration,
   column-naming, and schema-evolution rules F02 used implicitly (FR-4,
   FR-5).
4. An **integrity-invariant catalog** at
   `docs/data-governance/integrity-invariants.md` (or as a §X within the
   conventions doc — see §5 Tradeoff 1) cataloguing every CHECK, unique
   index, partial index, and FK relationship F02 shipped, with the rule
   each enforces (FR-3).
5. A **schema-lint script** at `scripts/check-schema-conventions.sh`
   (callable from `package.json`) wired into CI as a required gate
   (FR-6, NFR-2). The lint reads the Drizzle schema TypeScript modules
   via simple `grep`/AST inspection — it does **not** require a live DB.

A **canonical ER diagram** (FR-7) is added inline to `data-model.md`
under this spec dir, kept in Mermaid for diff-ability.

No code is moved. Migrations stay at `packages/db/migrations/`; schema
modules stay at `packages/db/src/schema/`. The lint script is the only
executable artifact F03 ships.

**Estimated effort:** 12–18 hours of policy authorship + ~4 hours of
lint script + ~2 hours of CI wiring + ~2 hours of back-check resolution
(if any findings). Total: **~20–26 hours**.

---

## 2. Phase -1 — Constitutional gates

These gates MUST pass before Phase 0 starts.

| Article | Requirement | F03 compliance |
|---|---|---|
| **§I.2 Integrity** | Invariants on persisted state are versioned & enforced | Integrity catalog (FR-3) is the version-controlled record. F03 changes no shipped invariant; it documents them. ✅ |
| **§I.2 Append-only audit** | No destructive change to audit-relevant tables outside tombstone procedure | F03 introduces no destructive migration. Conventions doc forbids future ones outside tombstone path. ✅ |
| **§I.4.1 Lawful basis** | Every personal-data processing operation records lawful basis | FR-10 captures lawful basis per personal-data column in the register. ✅ |
| **§I.4.2 Retention** | Per-class horizons, never indefinite | FR-2 retention policy declares horizons; `transitional:f05` sentinel resolved per CL-3. ✅ |
| **§I.4.3 Tombstone** | Erasure honors data-subject rights without breaking audit integrity | FR-9 per-column erasure mode; NFR-6 links tombstone procedure (placeholder until F05). ✅ |
| **§I.4.4 Data-subject rights** | Operators can locate every row owned by a subject | FR-8 data-subject linkage path. ✅ |
| **§I.5.3 Accountability** | Privileged actions attributable to a principal | F03 weakens nothing; register marks the `principal_id` linkage columns. ✅ |
| **§I.B Phased posture** | Retention horizons defensible per jurisdiction | Retention policy artifact is the counsel-reviewable record. ✅ |
| **§III Simplicity** | Max 3 projects initially; no premature abstraction | F03 adds 0 new packages, 0 new services, 1 lint script, 4 markdown/yaml artifacts. ✅ |
| **§IV.A Test-first** | Tests precede implementation | Schema-lint has unit tests for each rule (Phase 1 §4.5). ✅ |

**No constitutional exceptions requested.**

---

## 3. Phase 0 — Research & technology decisions

F03's stack is fully constrained by F01 and F02. There are no novel
technology choices. Research focuses on three implementation-shape
questions; outcomes are recorded in `research.md` alongside this plan.

### R-1 — Lint script implementation
**Options:**
- **A. Bash + `grep`/`awk` over Drizzle TS modules** (parity with `scripts/check-principal-coverage.sh`)
- **B. Node script using TypeScript Compiler API** (proper AST walks)
- **C. Drizzle's introspection API against a live DB** (requires DB access in CI)

**Chosen: A (bash + grep) with an upgrade path to B if rules outgrow grep.**

**Rationale:** F02 already uses bash + grep for the principal-coverage
gate (NFR-11). The rules F03 enforces are pattern-shaped (presence of
`created_at`, `updated_at`, `disabled_at` triple; presence of `CHECK`
constraint on text columns named like enums; `uuidv7()` default on
primary keys; explicit `references()` calls). Bash + grep handles all
of them in <2s. Upgrade to AST is a future feature only if rules need
type-level reasoning. C is rejected: CI must not need a live DB to
verify conventions.

**Tradeoff:** Bash + grep has false-positive/negative risk on edge
cases (e.g., commented-out code). Mitigation: every false-positive
gets a `// schema-lint: skip-<rule>` comment with paired justification
(EC-4) and the lint reports skips so reviewers audit them.

### R-2 — Register file format
**Options:**
- **A. Single `data-classification.yaml`** (one document, one table list)
- **B. Split per-table YAMLs under `data-classification/`**
- **C. JSON instead of YAML**

**Chosen: A (single YAML).**

**Rationale:** F02's schema is ~9 tables; one YAML is comfortably
readable. Split-per-table costs discoverability (auditors want one
file). JSON loses inline comments which auditors find useful.

**Tradeoff:** A single file gets larger with each feature. Re-evaluate
at ~30 tables; until then, single-file is correct.

### R-3 — ISO-8601 sentinel for non-fixed retention
**Options:**
- **A. `transitional:<endpoint>`** string sentinel
- **B. `null` ISO-8601 + a `transitional_endpoint` field**
- **C. Structured object: `{ transitional: { endpoint: "f05" } }`**

**Chosen: A (string sentinel `transitional:<endpoint>`).**

**Rationale:** The retention policy is human-reviewed by counsel. A
single string is the most legible. Future sweepers parse it as
`startsWith("transitional:")` → check endpoint registry. Per CL-3, the
only current value is `transitional:f05`; future sentinels (e.g.,
`legal-hold:<case>`) follow the same shape.

**Tradeoff:** A string sentinel is less typed than a structured object.
Mitigation: the register's documented schema (NFR-3) names the sentinel
grammar; the lint validates it.

---

## 4. Phase 1 — Design & contracts

### 4.1 Data-classification register — file contract

Location: `docs/data-governance/data-classification.yaml`

Top-level schema (YAML):

```yaml
$schema_version: "1.0"
$generated: false   # human-edited; lint verifies coverage vs. shipped schema
$last_reviewed: "2026-05-12"
$owner: "Gary"

data_classes:
  - id: identity_humanref
    description: External IdP identifiers tying a principal to a real human.
    sensitivity: high
    erasure_mode: tombstone
    default_lawful_basis: "GDPR Art. 6(1)(b) — contract"

  - id: identity_principal
    description: Internal principal_id and structural attributes (kind, tier, org).
    sensitivity: medium
    erasure_mode: tombstone
    default_lawful_basis: "GDPR Art. 6(1)(b) — contract"

  - id: operational_credential
    description: Issued credential metadata (kid, scope_set, expires_at). No PII.
    sensitivity: low
    erasure_mode: hard_delete
    default_lawful_basis: "GDPR Art. 6(1)(f) — legitimate interest (platform security)"

  - id: operational_signing_key
    description: JWKS-published public keys + lifecycle timestamps.
    sensitivity: low
    erasure_mode: hard_delete   # only after verify_until window closes
    default_lawful_basis: "operational — required for credential verification"

  - id: audit_record
    description: Audit event rows (principal, correlation, payload).
    sensitivity: high            # payload may contain PII
    erasure_mode: tombstone
    default_lawful_basis: "GDPR Art. 6(1)(c) — legal obligation (audit retention)"

  - id: approval_workflow
    description: Two-operator gate approval rows (notes, reason_code, who).
    sensitivity: medium
    erasure_mode: redact_in_place  # notes column; row metadata retained
    default_lawful_basis: "GDPR Art. 6(1)(c) — accountability"

tables:
  - name: principals
    file: packages/db/src/schema/principals.ts
    migration: packages/db/migrations/0000_f02_auth_principals_organizations.sql
    primary_class: identity_principal
    data_subject_linkage:
      column: principal_id
      role: self
    columns:
      - name: principal_id
        class: identity_principal
        erasure: tombstone
      - name: external_idp
        class: identity_humanref
        erasure: tombstone
      - name: external_id
        class: identity_humanref
        erasure: tombstone
        notes: "Clerk user_id for humans; null for agents/services."
      - name: tier
        class: identity_principal
        erasure: tombstone
      - name: org_id
        class: identity_principal
        erasure: tombstone
        fk: organizations.org_id
      - name: service_name
        class: identity_principal
        erasure: hard_delete
      - name: service_version
        class: identity_principal
        erasure: hard_delete
      - name: display_name
        class: identity_humanref
        erasure: tombstone
      - name: created_at
        class: identity_principal
        erasure: tombstone
      - name: updated_at
        class: identity_principal
        erasure: tombstone
      - name: disabled_at
        class: identity_principal
        erasure: tombstone
      - name: disabled_reason
        class: identity_principal
        erasure: tombstone
      - name: kind
        class: identity_principal
        erasure: tombstone

  # ... organizations, agent_credentials, service_credentials,
  #     signing_keys, revocations, audit_events_buffer,
  #     revoke_all_sessions_approvals follow the same shape.
```

The full file enumerating every column across all 8 F02 tables is
authored during implementation. Coverage is enforced by the lint
(M-2 mechanical check).

### 4.2 Retention policy — file contract

Location: `docs/data-governance/retention-policy.md`

Each entry:

```markdown
### Data class: `identity_humanref`

**Horizon (human):** Until linked principal is tombstoned, then erased
within 30 days of the tombstone event.
**Horizon (ISO-8601):** `tombstone-driven:identity_principal+P30D`
**Lawful basis:** GDPR Art. 5(1)(e) storage limitation, joined with
Art. 17 right-to-erasure obligation cascading from the principal.
**Default endpoint:** F-TBD per-class sweeper consuming the register.
```

```markdown
### Data class: `audit_record`

**Horizon (human):** 7 years from event timestamp.
**Horizon (ISO-8601):** `P7Y`
**Lawful basis:** SOC 2 audit-retention common practice; GDPR Art.
6(1)(c) legal obligation; jurisdiction-specific minima (NYC LL 144
audit-result retention is the floor at 7y).
**Special case:** `audit_events_buffer` rows are
`transitional:f05` — superseded by F05's hash-chained log; cutover
removes this sentinel.
```

Total entries: one per `data_classes[]` row in the register (~6 at v1).

### 4.3 Conventions document — file contract

Location: `docs/data-governance/schema-conventions.md`

Sections:
1. **Naming.** Table names: snake_case plural noun. Column names:
   snake_case. Timestamps: `<verb>_at`. Boolean: `is_<adj>` or
   `<verb>ed`. PKs: `<entity>_id` (UUIDv7).
2. **Timestamps.** Every mutable row carries `created_at` (NOT NULL,
   `default now()`) and `updated_at` (same). Soft-delete is
   `disabled_at` (nullable). No `deleted_at` — destructive deletes are
   forbidden on personal-data tables (Article I.4.3).
3. **Primary keys.** `uuid` type, default `uuidv7()`. (Sortability +
   index locality.)
4. **Foreign keys.** Every `references()` must specify behavior.
   Default: `ON UPDATE NO ACTION, ON DELETE NO ACTION` (data-subject
   tombstone path is explicit, not cascading).
5. **Enums as text + CHECK.** Text columns whose value space is
   bounded carry a `CHECK (col IN (...))` constraint. (F02 pattern.)
6. **JSONB.** Use `$type<...>()` in Drizzle; add CHECK constraints to
   enforce array/object shape where invariant matters (e.g.,
   `jsonb_array_length(scope_set) >= 1`).
7. **Indexes.** Index columns participating in hot WHERE clauses;
   partial indexes for `revoked_at IS NULL`, `disabled_at IS NULL`,
   `expires_at > now()` patterns. Naming: `<table>_<column>_<purpose>_idx`.
8. **Migrations.**
   - File name: `NNNN_<feature>_<short_slug>.sql`.
   - Monotonically increasing 4-digit prefix.
   - **Forward-only** in production. `pnpm db:generate` produces the
     up-migration; no `down.sql` is generated.
   - **Categories:** additive (default review), backfill (must be
     idempotent + reversible), transformational (PR-level architectural
     review), destructive on audit-relevant tables (**forbidden** outside
     the tombstone procedure).
9. **Skip mechanism.** A `// schema-lint: skip-<rule>` comment adjacent
   to the column or table definition opts out of one rule. The PR
   description MUST contain a paired justification. The lint reports
   skips in its output for reviewer audit.

### 4.4 Integrity-invariant catalog — file contract

Location: `docs/data-governance/integrity-invariants.md`

For each F02 table, list every constraint with: name, kind (CHECK /
unique / partial / FK), the rule, the failure mode it prevents, the
F02 test file that exercises it.

Example entry:

```markdown
### Table: `principals`

| Invariant | Kind | Rule | Prevents | Test |
|---|---|---|---|---|
| `principals_kind_check` | CHECK | `kind IN ('human','agent','service')` | Invalid principal kinds | `packages/auth/src/__tests__/principal.test.ts` |
| `principals_human_invariant` | CHECK | `kind <> 'human' OR (external_idp='clerk' AND external_id IS NOT NULL AND tier IS NOT NULL)` | Human rows without Clerk linkage | `packages/auth/src/__tests__/materialize.test.ts` |
| `principals_external_idx` | UNIQUE (partial) | `UNIQUE (external_idp, external_id) WHERE external_idp IS NOT NULL` | Duplicate IdP linkage | `packages/auth/src/__tests__/reconciliation.test.ts` |
| ... | | | | |
```

Total invariant rows across the 8 F02 tables: ~30 (rough count from
the schema modules read in Phase 0).

### 4.5 Schema-lint script — file contract

Location: `scripts/check-schema-conventions.sh`

**Contract:**
- Reads `packages/db/src/schema/*.ts`.
- For each `pgTable("name", { ... })` block, applies rules R1–R7 below.
- Cross-references each table against `docs/data-governance/data-classification.yaml`.
- Exits 0 on clean; non-zero on any violation.
- Output format: one line per violation, `<file>:<line> <rule> <hint>`.
- Coverage report (last lines): tables checked / violations / skips.

**Rules (v1):**
- **R1.** Every `pgTable` has a `<entity>_id uuid` primary key with
  `.default(sql\`uuidv7()\`)`.
- **R2.** Every mutable table has `created_at` + `updated_at`. (Lookup
  tables — see `revocations` — may opt out via `skip-r2` with
  justification.)
- **R3.** Every table appears in `data-classification.yaml`. (Catches
  forgotten-to-classify regressions.)
- **R4.** Every text column whose name matches `kind|status|side|reason_code|purpose|tier`
  has an accompanying CHECK constraint.
- **R5.** Every `references()` call has explicit on-update/on-delete
  behavior. (Phase-2 strictness; phase-1 may warn-only since F02
  shipped without this.)
- **R6.** No raw `DELETE` SQL in any migration touching an
  audit-relevant table (currently `audit_events_buffer`; configurable
  list).
- **R7.** Every `// schema-lint: skip-*` comment is reported in the
  output (audit trail).

**Unit tests:** `scripts/__tests__/check-schema-conventions.test.sh`
exercises each rule against fixture schema files. (Tested before lint
goes live — Article IV.A test-first.)

**Wiring:** Added to `.github/workflows/ci.yml` as a required step in
the schema-lint job, parallel with `principal-coverage`. Local
invocation: `pnpm schema:lint` (added to root `package.json`).

### 4.6 Canonical ER diagram

Location: `.specify/specs/03-db-schema-migrations/data-model.md`

Mermaid `erDiagram` covering 8 tables + their FK relationships.
Updated by any future feature adding tables under the same conventions.

### 4.7 Back-check (FR-11)

Run the v1 lint against the F02-shipped schema. Expected outcomes
and resolution paths per EC-5:

| Likely finding | Resolution |
|---|---|
| `revocations` has no `created_at`/`updated_at` | Accept skip with justification (lookup-table denormalization, parented by source `*_credentials.revoked_at`). |
| `signing_keys` has no `created_at` (it does), no `updated_at` (it doesn't) | Accept skip — lifecycle uses `activated_at`/`retired_at`/`verify_until` instead. |
| FK rows missing explicit on-update/on-delete | Warn-only in v1; full strictness deferred (NFR enhancement). |
| Tables missing from `data-classification.yaml` | Block; author the row. |

All back-check findings are tracked in this plan (or in tasks once
broken down) and resolved before F03 closes.

---

## 5. Tradeoffs & risks

### Tradeoff 1 — Catalog as separate doc vs. § in conventions doc
The integrity catalog (§4.4) is large (~30 invariants). A separate
file keeps the conventions doc readable; a single doc has fewer
artifacts. **Choice:** separate file (`integrity-invariants.md`).
Reviewers reading conventions don't want to scroll past 30
invariant rows.

### Tradeoff 2 — Lint as bash vs. node
See R-1 above. Bash chosen; AST upgrade path reserved.

### Tradeoff 3 — Coverage strictness in v1
Strict coverage (every column → register entry) requires authoring ~80
column entries in YAML. Lenient (table-level coverage) is faster but
weaker. **Choice:** strict at table-level + column-level for personal-data
classes; operational columns may be classified at the table level when
they're homogeneous (e.g., all of `signing_keys` is `operational_signing_key`).
M-2 mechanical check is satisfied because every column is reachable
via either its column entry or the table's primary class fallback.

### Risk 1 — Counsel review of retention policy slips
Constitution §I.4.2 expects retention horizons; counsel is not
on-call. **Mitigation:** F03 ships the policy artifact with the
engineer-best-judgment horizons and an `$counsel_review` field set to
`pending`. The artifact is reviewable as a single PR (NFR-5) so
counsel can amend without re-engineering.

### Risk 2 — Lint false positives block PRs
The grep-based lint may misfire on edge cases. **Mitigation:** skip
comments (EC-4) provide an opt-out path; unit tests for the lint
itself catch regressions.

### Risk 3 — Future schema growth outruns single-YAML register
**Mitigation:** documented re-evaluation point at ~30 tables (Phase 0
R-2 tradeoff). Splitting into per-table YAMLs is a straightforward
follow-up.

---

## 6. Implementation phases (high-level)

The full task list is produced by `/speckit-tasks`. This plan blocks
them out:

| Phase | Scope | Effort |
|---|---|---|
| **B1 — Doc skeletons** | Create `docs/data-governance/` with all four docs as outlines (headings only); link from spec | 1h |
| **B2 — Register authorship** | Author `data-classification.yaml` covering all 8 F02 tables | 4h |
| **B3 — Retention policy authorship** | Author `retention-policy.md` with horizons per class | 2h |
| **B4 — Conventions authorship** | Author `schema-conventions.md` codifying F02 patterns | 3h |
| **B5 — Invariant catalog** | Author `integrity-invariants.md` (~30 entries) | 3h |
| **B6 — ER diagram** | Author `data-model.md` with Mermaid `erDiagram` | 1h |
| **B7 — Lint script + tests** | Build `scripts/check-schema-conventions.sh` + test harness; wire into CI | 5h |
| **B8 — Back-check + findings resolution** | Run lint against F02 schema; record findings; land any required migrations | 2–4h |
| **B9 — /speckit-analyze + /code-review + PR** | Cross-artifact consistency + reviewer pass + open PR + merge | 2h |

**Total: ~23–25h.** Matches the original Complexity-S estimate.

---

## 7. Testing strategy

F03 is mostly documentation; tests are concentrated in the lint script.

| Surface | Test type | Location |
|---|---|---|
| Lint rules R1–R7 | Bash unit tests with fixture schema files | `scripts/__tests__/check-schema-conventions.test.sh` |
| Register schema validity | YAML syntax check + key-set assertion | included in lint coverage report |
| Retention-policy ↔ register coverage | Lint cross-check: every class in register has a horizon | rule R-cov in lint |
| Invariant catalog ↔ shipped schema | Manual + grep cross-check during authorship (no automated test at v1) | — |
| F02 regressions | `pnpm -r run test` must stay green | CI |

**Coverage target:** Lint rules — 100% covered by unit tests
(Article IV.A test-first imperative + global testing rules at 80%
minimum). Documentation artifacts — no automated coverage target; the
lint's coverage gate (R3, R-cov) is the equivalent.

---

## 8. Security considerations

F03 is governance work; no new attack surface. Adjacent security
notes:

- **Register is not a secret.** It enumerates table/column names that
  are already inferable from the schema modules. Public-readable.
- **Retention policy is not a secret.** Same.
- **Lint output may name internal tables.** Acceptable; CI logs are
  already org-internal.
- **No new credentials introduced.**

OWASP Top 10 applicability: N/A (no new HTTP surface, no new
authentication, no new authorization). Pre-existing controls in F02
are unaffected.

---

## 9. Performance strategy

- Lint runs in <15s (NFR-2). Bash + grep across 9 schema files is
  measured in milliseconds.
- No DB-side perf changes; F03 adds zero indexes, zero rows, zero
  queries.

---

## 10. Deployment strategy

- Deliverables are documentation + a CI script. No application
  deploy.
- Land via single PR after `/speckit-analyze` clean and `/code-review`
  pass. Squash-merge to `main` per F02 precedent.
- No DB migration is expected. If back-check (B8) surfaces a needed
  schema fix, that migration files as `0005_f03_<short_slug>.sql` and
  is reviewed under the new conventions.

---

## 11. Open items deferred to /speckit-tasks

None. Plan is complete; tasks decomposition is the next step.

---

## 12. Constitutional compliance summary

| Article | Status |
|---|---|
| §I.2 Integrity | ✅ Cataloged, not weakened |
| §I.4.1 Lawful basis | ✅ Recorded per column |
| §I.4.2 Retention | ✅ Per-class horizons declared |
| §I.4.3 Tombstone | ✅ Per-column erasure mode |
| §I.4.4 Data-subject rights | ✅ Linkage path mapped |
| §I.5.3 Accountability | ✅ Unchanged |
| §I.B Phased posture | ✅ Counsel-reviewable artifact |
| §III Simplicity | ✅ 0 new packages, 1 lint script |
| §IV.A Test-first | ✅ Lint has unit tests before going live |

**No exceptions requested.**

---

## 13. Sign-off

- **Plan author:** Gary (2026-05-12)
- **Constitutional review:** Pending Austin (per Constitution §V — plans
  inherit constitution review state)
- **Counsel review:** Pending — flagged on retention-policy.md as
  `$counsel_review: pending`. Not blocking F03's merge; blocking Phase 1
  jurisdictional admission.
