# Tasks — F03 Database Schema Umbrella + Drizzle Migrations

**Spec:** v1.1 · **Plan:** v1.0 · **Tasks:** v1.0 (2026-05-12)
**Owner:** Gary

Tasks decompose plan §6 (B1–B9) into ordered, dependency-aware work
items. Each task has a stable ID (T001+), status, blocker references,
effort estimate, and acceptance criteria. Implementation tasks that
ship code are blocked by their corresponding test tasks (Article IV.A
test-first imperative).

Status legend: 🟡 Ready · 🔴 Blocked · 🟢 In Progress · ✅ Complete · ⏸ Deferred

---

## Phase B1 — Doc skeletons (1h)

### T001 — Create governance directory + four doc skeletons
**Status:** 🟡 Ready · **Effort:** 1h · **Blocked by:** none
**Story:** US-1, US-3, US-4 (all gate on doc discoverability)
**FR/NFR refs:** NFR-1
**Description.** Create `docs/data-governance/` with four files, each
populated only with headings and TODO markers matching the plan §4
contracts. This produces the file-system surface every later B-phase
fills in.

**Files to create:**
- `docs/data-governance/data-classification.yaml` (header + empty `data_classes: []` and `tables: []`)
- `docs/data-governance/retention-policy.md` (TOC matching the data classes; each section is a TODO)
- `docs/data-governance/schema-conventions.md` (9 section headers per plan §4.3)
- `docs/data-governance/integrity-invariants.md` (8 table-section headers, one per F02 table)

**Acceptance:**
- [ ] All four files exist at the listed paths.
- [ ] Each carries `$owner: Gary`, `$last_reviewed: 2026-05-12`, `$version: 0.1` (or markdown equivalent).
- [ ] `git status` shows them tracked; no other paths touched.

---

## Phase B2 — Data-classification register (4h)

### T002 — Author data_classes section
**Status:** 🔴 Blocked by T001 · **Effort:** 0.5h
**Story:** US-2, US-3 · **FR/NFR:** FR-1, FR-9, FR-10, FR-12
**Description.** Populate the `data_classes:` array in
`data-classification.yaml` with the 6 classes named in plan §4.1
(`identity_humanref`, `identity_principal`, `operational_credential`,
`operational_signing_key`, `audit_record`, `approval_workflow`). Each
class carries id, description, sensitivity, erasure_mode,
default_lawful_basis per the JSON-Schema contract at
`.specify/specs/03-db-schema-migrations/contracts/data-classification.schema.yaml`.

**Acceptance:**
- [ ] 6 class rows present.
- [ ] Every field required by the contract is present.
- [ ] Sensitivity values ∈ {low, medium, high, critical}; erasure_mode values ∈ {hard_delete, tombstone, redact_in_place}.

### T003 — Author tables section: principals + organizations
**Status:** 🔴 Blocked by T002 · **Effort:** 1h
**Story:** US-2 · **FR/NFR:** FR-1, FR-8, FR-9, FR-10, M-2
**Description.** Populate `tables[]` entries for `principals` and
`organizations` by reading the Drizzle modules and listing every
column with its class, erasure mode, and (for personal-data columns)
notes on the data-subject linkage. Each row of the table includes the
`file:` and `migration:` paths.

**Acceptance:**
- [ ] Both tables' rows exist.
- [ ] Every column in the Drizzle module appears (cross-check: column count in YAML == column count in TS source).
- [ ] `data_subject_linkage` field present where applicable.

### T004 — Author tables section: credentials triplet (agent_credentials, service_credentials, revocations)
**Status:** 🔴 Blocked by T002 · **Effort:** 1h
**Story:** US-2 · **FR/NFR:** FR-1, FR-8, FR-9, M-2
**Parallel with:** T003, T005, T006
**Description.** Same pattern as T003 for the three credential-related
tables.

**Acceptance:**
- [ ] All three tables represented.
- [ ] Column coverage 100%.

### T005 — Author tables section: signing_keys
**Status:** 🔴 Blocked by T002 · **Effort:** 0.5h
**Story:** US-2 · **FR/NFR:** FR-1, M-2
**Parallel with:** T003, T004, T006
**Description.** Same pattern for `signing_keys`. Note that this is
purely operational (no personal data); `data_subject_linkage` is
`role: none`.

**Acceptance:**
- [ ] All columns present; primary_class = `operational_signing_key`.

### T006 — Author tables section: audit_events_buffer + revoke_all_sessions_approvals
**Status:** 🔴 Blocked by T002 · **Effort:** 1h
**Story:** US-2 · **FR/NFR:** FR-1, FR-8, FR-9, M-2
**Parallel with:** T003, T004, T005
**Description.** Same pattern for the audit buffer (primary_class =
`audit_record`, note that `payload` may contain PII) and the
two-operator approvals table (primary_class = `approval_workflow`).

**Acceptance:**
- [ ] Both tables represented.
- [ ] `notes` column on approvals carries `erasure: redact_in_place` per the F02 audit-sink redaction pattern.

---

## Phase B3 — Retention policy (2h)

### T007 — Draft retention horizons per data class
**Status:** 🔴 Blocked by T002 · **Effort:** 1.5h
**Story:** US-3 · **FR/NFR:** FR-2, NFR-6 · **CL:** CL-2, CL-3
**Description.** Author `retention-policy.md` with one section per
data class declared in T002. Each section records human-readable
horizon, ISO-8601 horizon (or transitional/cascade sentinel), lawful
basis, and notes. The `audit_record` class's transitional sub-entry
for `audit_events_buffer` uses sentinel `transitional:f05` (per CL-3).

**Acceptance:**
- [ ] 6 sections, one per class.
- [ ] Every section has both formats.
- [ ] No "indefinite" horizon; transitional sentinels point to a defined endpoint.
- [ ] `$counsel_review: pending` frontmatter flag set.
- [ ] Placeholder section `### Tombstone procedure (pending F05)` linked from every `tombstone`-mode class entry (NFR-6).

### T008 — Cross-check policy ↔ register coverage
**Status:** 🔴 Blocked by T002, T007 · **Effort:** 0.5h
**Story:** US-3 · **FR/NFR:** M-3
**Description.** Manual cross-check: every `data_classes[].id` from
T002 has a section in T007's output; no policy section references an
unknown class.

**Acceptance:**
- [ ] Coverage table appended to `retention-policy.md` listing class → horizon → section anchor.

---

## Phase B4 — Conventions document (3h)

### T009 — Author schema-conventions.md (9 sections)
**Status:** 🔴 Blocked by T001 · **Effort:** 3h
**Story:** US-1, US-4, US-5 · **FR/NFR:** FR-4, FR-5, NFR-5
**Parallel with:** B2, B3 (no dependency)
**Description.** Author the 9 sections per plan §4.3: naming,
timestamps, primary keys, foreign keys, enums + CHECK, JSONB,
indexes, migrations, skip mechanism. Each section cites the F02
pattern it codifies (with concrete file references for traceability).
Section 8 (migrations) names the four change categories and forbids
destructive changes on audit-relevant tables outside the tombstone
procedure (FR-5).

**Acceptance:**
- [ ] All 9 sections present with body content.
- [ ] Every convention names at least one F02 file as precedent.
- [ ] Section 8's category-4 (destructive on audit-relevant) lists the current `audit_events_buffer` and notes F05 will extend the list.
- [ ] Section 9 names the `// schema-lint: skip-<rule>` opt-out and the paired-justification requirement.
- [ ] New §10 (or addendum to §1) names the register-PR audit-trail discipline (NFR-5): material changes to `data-classification.yaml` ship as standalone PRs, not bundled with unrelated schema work.

---

## Phase B5 — Integrity-invariant catalog (3h)

### T010 — Author integrity-invariants.md entries for principals + organizations
**Status:** 🔴 Blocked by T001 · **Effort:** 0.75h
**Story:** auditor / reviewer · **FR/NFR:** FR-3, FR-12, M-4
**Parallel with:** T011, T012, T013, T009
**Description.** For each invariant in these two tables (CHECK,
unique, partial, FK), add a row with: name, kind, rule, prevents,
test file. Cross-reference the F02 test files that exercise each.

**Acceptance:**
- [ ] Row count for these tables matches the CHECK + unique + partial + FK count in the schema modules and migration SQL.

### T011 — Author entries for credentials triplet
**Status:** 🔴 Blocked by T001 · **Effort:** 0.75h
**Story:** auditor / reviewer · **FR/NFR:** FR-3, FR-12, M-4
**Parallel with:** T010, T012, T013
**Description.** Same pattern for `agent_credentials`,
`service_credentials`, `revocations`.

**Acceptance:** as T010.

### T012 — Author entries for signing_keys
**Status:** 🔴 Blocked by T001 · **Effort:** 0.5h
**Story:** auditor / reviewer · **FR/NFR:** FR-3, FR-12, M-4
**Parallel with:** T010, T011, T013
**Description.** Same pattern for `signing_keys`. Includes the
partial unique "one active per purpose" index.

**Acceptance:** as T010.

### T013 — Author entries for audit_events_buffer + revoke_all_sessions_approvals
**Status:** 🔴 Blocked by T001 · **Effort:** 1h
**Story:** auditor / reviewer · **FR/NFR:** FR-3, FR-12, M-4
**Parallel with:** T010, T011, T012
**Description.** Same pattern for the audit + approval tables.
Two-operator distinct-approver CHECK gets explicit prose.

**Acceptance:** as T010.

---

## Phase B6 — ER diagram (1h)

### T014 — Verify Mermaid `erDiagram` renders + cross-reference with shipped schema
**Status:** 🔴 Blocked by T003–T006 · **Effort:** 1h
**Story:** US-1 · **FR/NFR:** FR-7
**Description.** The diagram already exists in `data-model.md` (drafted
at plan time). Verify GitHub renders it; verify FK arrows match
`.references()` calls in the Drizzle modules; verify the table
inventory § matches the register's table list (mechanical check:
8 tables on both sides).

**Acceptance:**
- [ ] Mermaid renders without parser errors (test by pushing branch + viewing on GitHub OR running mermaid-cli locally).
- [ ] Table-inventory § lists every table from `data-classification.yaml` and vice versa.

---

## Phase B7 — Schema-lint script + tests + CI (5h)

**TDD enforced:** every implementation task is blocked by its test task.

### T015 — Write fixture schema files for lint tests
**Status:** 🔴 Blocked by T009 · **Effort:** 0.5h
**Story:** US-5 · **FR/NFR:** FR-6 (tests)
**Delegate suggestion:** tdd-guide
**Description.** Create `scripts/__tests__/schema-fixtures/` with
small TS files exercising each rule R1–R7: one good fixture per rule,
one bad fixture per rule. ~14 small files.

**Acceptance:**
- [ ] 14 fixture files (7 rules × pass/fail), each ≤15 lines.
- [ ] Fixtures look like real `pgTable(...)` blocks but reside under `scripts/__tests__/` and are not picked up by the build.

### T016 — Write unit-test harness for the lint script
**Status:** 🔴 Blocked by T015 · **Effort:** 1h
**Story:** US-5 · **FR/NFR:** FR-6 (test-first per Article IV.A)
**Delegate suggestion:** tdd-guide
**Description.** `scripts/__tests__/check-schema-conventions.test.sh`
(bash) or `.test.ts` (jest) exercising each fixture pair. Tests
assert: clean fixtures exit 0; bad fixtures exit non-zero with the
expected rule ID in the output.

**Acceptance:**
- [ ] One test per rule R1–R7 (7 tests), each with both positive and negative assertion.
- [ ] Tests fail at this checkpoint because the lint script does not yet exist (RED phase).

### T017 — Implement lint script v1
**Status:** 🔴 Blocked by T016 · **Effort:** 2h
**Story:** US-5 · **FR/NFR:** FR-6, NFR-2 (<15s)
**Description.** Implement `scripts/check-schema-conventions.sh`
matching the plan §4.5 contract. Rules R1–R7 + R-cov (register
coverage). Output format: `<file>:<line> <rule> <hint>`. Coverage
report on the final lines. Exit 0 clean / non-zero on violation.

**Acceptance:**
- [ ] All T016 tests pass (GREEN phase).
- [ ] Script runs in <15s against the F02 schema (NFR-2).
- [ ] Output is grep-friendly.

### T018 — Add `pnpm schema:lint` script + wire into CI
**Status:** 🔴 Blocked by T017 · **Effort:** 1h
**Story:** US-5 · **FR/NFR:** FR-6
**Description.** Add `"schema:lint": "bash scripts/check-schema-conventions.sh"`
to root `package.json`. Add a `schema-lint` job to
`.github/workflows/ci.yml` (parallel with `principal-coverage`). Mark
the job a required status check on the `main` branch protection rule
(documented as a follow-up if branch-protection edit needs operator
action).

**Acceptance:**
- [ ] `pnpm schema:lint` runs locally and exits 0 on the post-F03 baseline.
- [ ] CI run on this branch shows the new `schema-lint` job and it passes.
- [ ] PR description notes branch-protection update needed (if operator-driven).

### T019 — Test the gate by introducing a deliberate violation (M-1)
**Status:** 🔴 Blocked by T018 · **Effort:** 0.5h
**Story:** US-5 · **FR/NFR:** M-1
**Description.** Create a throwaway branch off `03-db-schema-migrations`,
add a column without a register entry, push, observe CI fail. Document
the run as evidence of M-1 in `quickstart.md` Scenario 5.

**Acceptance:**
- [ ] Throwaway branch's CI run is red on `schema-lint`.
- [ ] Screenshot or run-id captured in quickstart.md.
- [ ] Throwaway branch deleted.

---

## Phase B8 — Back-check + findings (2–4h)

### T020 — Run lint against shipped F02 schema; record findings
**Status:** 🔴 Blocked by T017, T002–T006 · **Effort:** 0.5h
**Story:** auditor · **FR/NFR:** FR-11, M-5
**Description.** Run `pnpm schema:lint` against the post-B7 state.
Capture output verbatim. Categorize each violation per EC-5 resolution
paths: (a) migration, (b) convention amendment, (c) constitutional
escalation.

**Acceptance:**
- [ ] Raw output saved to `.specify/specs/03-db-schema-migrations/back-check-findings.md`.
- [ ] Every violation categorized.

### T021 — Resolve findings (path b — convention amendments, skip-comments)
**Status:** 🔴 Blocked by T020 · **Effort:** 1h
**Story:** auditor · **FR/NFR:** FR-11, EC-4, EC-5
**Description.** For each finding categorized (b), add the appropriate
`// schema-lint: skip-<rule>` comment with paired justification, OR
amend the conventions doc with a recorded carve-out. Expected
candidates: `revocations` lacks `created_at`/`updated_at` (lookup
table); `signing_keys` lacks `updated_at` (lifecycle uses different
columns).

**Acceptance:**
- [ ] Every (b) finding resolved.
- [ ] Lint re-run is clean for (b) findings.

### T022 — Resolve findings (path a — migration)
**Status:** 🔴 Blocked by T020 · **Effort:** 0–2h (conditional)
**Description.** For each finding categorized (a), author migration
`0005_f03_<short_slug>.sql` adding the missing element non-destructively.
Likely candidates: explicit `ON UPDATE` / `ON DELETE` on FKs (FR-6 R5)
— may be deferred to warn-only in v1 to avoid scope creep.

**Acceptance (conditional on findings):**
- [ ] Each migration is additive and idempotent.
- [ ] Lint re-run clean post-migration.

### T023 — Mark zero unresolved findings
**Status:** 🔴 Blocked by T021, T022 · **Effort:** 0.25h
**Description.** Update `back-check-findings.md` with the final
disposition. Update plan §4.7 if categories shifted.

**Acceptance:**
- [ ] M-5 met: zero unresolved findings.

---

## Phase B9 — Analyze + review + PR + merge (2h)

### T024 — Run /speckit-analyze
**Status:** 🔴 Blocked by T001–T023 · **Effort:** 0.5h
**Description.** Run the analyze skill against the seven artifacts
(spec, plan, research, data-model, contracts, tasks, quickstart) +
constitution. Address any issues; rerun if needed.

**Acceptance:**
- [ ] `analyze-report.md` checked into the spec dir.
- [ ] Status: clean OR every finding has a resolution path.

### T025 — Run /code-review on the lint script + governance docs
**Status:** 🔴 Blocked by T024 · **Effort:** 0.5h
**Description.** Run code-review against the touched files.
Address CRITICAL/HIGH; document MEDIUM resolutions or defer with
explicit justification.

**Acceptance:**
- [ ] Review report saved alongside `analyze-report.md`.
- [ ] No CRITICAL/HIGH outstanding.

### T026 — Open PR + reviewer pass
**Status:** 🔴 Blocked by T025 · **Effort:** 0.5h
**FR/NFR:** M-6
**Description.** `git push -u`; open PR titled "feat(f03): db-schema
umbrella + governance artifacts"; PR body summarizes the artifacts,
back-check findings, deferred operator-run gates (G-1, G-2, G-3 in
quickstart.md). Tag Austin for reviewer pass.

**Acceptance:**
- [ ] PR open against `main`.
- [ ] CI green (all required checks including new `schema-lint`).
- [ ] `pnpm -r run test` green on PR head — confirms no F02 regression (M-6).
- [ ] Reviewer approval recorded (or path documented for async).

### T027 — Squash-merge + update roadmap
**Status:** 🔴 Blocked by T026 · **Effort:** 0.5h
**Description.** Squash-merge per F02 precedent; cherry-pick the
canonical commit message format. Update `.specify/roadmap.md` ticking
F03 in Stage 1. Bump roadmap version (patch).

**Acceptance:**
- [ ] `main` HEAD shows merged commit.
- [ ] Roadmap reflects F03 closed.
- [ ] Branch `03-db-schema-migrations` deleted locally + remote.

---

## Dependency graph (critical path)

```
T001 ──┬── T002 ── T003,T004,T005,T006 (parallel) ── T014
       │       └── T007 ── T008
       ├── T009
       ├── T010,T011,T012,T013 (parallel)
       │
       └── T015 (after T009) ── T016 ── T017 ── T018 ── T019
                                       │
                            T020 (after T002–T006 + T017) ── T021,T022 ── T023
                                                                                     │
                                                              T024 ── T025 ── T026 ── T027
```

**Critical path:**
T001 → T002 → T003/T004/T005/T006 (parallel, take max) → T020 → T021/T022 (parallel, take max) → T023 → T024 → T025 → T026 → T027

Approximate critical-path duration:
1 + 0.5 + 1 + 0.5 + 1 + 0.25 + 0.5 + 0.5 + 0.5 + 0.5 = **~6.25h** with full parallelism.

The longer total (~23–25h) reflects the parallelizable authorship
work (B2/B3/B4/B5 docs).

---

## Parallelization opportunities

| Phase | Parallel tasks |
|---|---|
| B2 | T003, T004, T005, T006 (after T002) |
| B3 / B4 / B5 | B4 (T009) and B5 (T010–T013) can run alongside B2 once T001 lands |
| B5 | T010, T011, T012, T013 are independent |
| B8 | T021 (skip-comments) and T022 (migrations) are independent |

---

## Quality gates

- ✅ **TDD enforced.** T017 (impl) is blocked by T016 (tests), which is blocked by T015 (fixtures). Lint cannot ship without RED-then-GREEN.
- ✅ **Back-check.** T020–T023 block the merge — F03 cannot close while violations exist (or while findings lack disposition).
- ✅ **Analyze gate.** T024 blocks T025–T027.
- ✅ **Code review.** T025 blocks T026–T027. No CRITICAL/HIGH may exit.
- ✅ **CI required check.** T018 wires the lint as a required status; T019 proves it gates.

---

## Out-of-band (operator-run) gates

Tracked in `quickstart.md` as G-1, G-2, G-3. Not blocking F03 merge;
captured as deferred follow-ups in the F03 closing commit:

- **G-1.** Counsel review of `retention-policy.md`. Flips
  `$counsel_review: pending` → `reviewed_at: <date>`.
- **G-2.** Austin's reviewer pass on `schema-conventions.md`.
- **G-3.** Walk Scenarios 1–6 against the merged branch.

---

## Delegate suggestions (per task)

| Task | Delegate | Reason |
|---|---|---|
| T015, T016 | tdd-guide | Test-first authorship of the lint harness |
| T017 | drizzle-orm-expert (advisory) | Pattern recognition on Drizzle TS conventions |
| T024 | (built-in /speckit-analyze) | Cross-artifact consistency |
| T025 | (built-in /code-review) | Review pass |

The system suggested `django-backend-expert` and `security-reviewer`
for this phase. **Neither fits F03's surface:**
- `django-backend-expert` — no Django in this project.
- `security-reviewer` — F03 adds zero new attack surface (governance
  docs + a non-network bash script reading source code; no user input,
  no auth, no network). A security-review pass would produce a
  no-finding report. If operator policy mandates it anyway, T025
  can extend to include a security-review pass on the lint script for
  defense-in-depth (e.g., bash injection in grep patterns), but it is
  not on the critical path.

---

## Summary

- **Total tasks:** 27 (T001–T027)
- **Phases:** 9 (B1–B9)
- **Total effort:** ~23–25h (matches plan §6)
- **Critical-path duration with parallelism:** ~6.25h
- **TDD enforced:** B7 (lint) — fixtures → tests (RED) → impl (GREEN)
- **Quality gates:** back-check, analyze, code review, CI required check
