# Cross-Artifact Analysis Report — F03

**Branch:** `03-db-schema-migrations`
**Date:** 2026-05-12
**Analyzer:** `/speckit-analyze` (Claude Opus 4.7)
**Artifacts analyzed:** 8
- `spec.md` v1.1
- `plan.md` v1.0
- `tasks.md` v1.0
- `data-model.md` v1.0
- `research.md` v1.0
- `quickstart.md` v1.0
- `contracts/data-classification.schema.yaml`
- `checklists/requirements.md` v1.1
+ `.specify/memory/constitution.md` v2.0.0

---

## Summary

| Category | Status |
|---|---|
| Constitutional compliance | ✅ Compliant (no exceptions requested) |
| Spec → Plan alignment | ✅ Complete (12/12 FR, 6/6 NFR addressed) |
| Plan → Tasks coverage | ✅ Complete (9/9 phases decomposed, 27 tasks) |
| Data model consistency | ✅ Complete (8/8 F02 tables represented) |
| Contract validation | ✅ Single JSON-Schema contract present; register itself authored during B2 |
| Cross-artifact naming | ✅ Consistent ("data class", "retention", "tombstone", "schema-lint" stable) |
| Completeness | ✅ All required artifacts present + optional research + quickstart |

**Issues found:** 6 (0 Critical, 0 High, 5 Medium, 1 Low)
**Status:** ✅ **Ready for `/speckit-implement`.** Medium findings should be patched first but do not block.

---

## 1. Constitutional compliance

Per `plan.md §12` and `spec.md §9`:

| Article | Requirement | Status | Evidence |
|---|---|---|---|
| §I.2 Integrity | Invariants versioned & catalogued | ✅ | FR-3 → T010–T013 |
| §I.2 Append-only audit | No destructive change on audit tables outside tombstone | ✅ | FR-5 → T009 §8 + lint R6 (T017) |
| §I.4.1 Lawful basis | Per-personal-data-column basis recorded | ✅ | FR-10 → T003–T006 |
| §I.4.2 Retention | Per-class horizons, never indefinite | ✅ | FR-2 → T007 |
| §I.4.3 Tombstone | Per-column erasure mode | ✅ | FR-9 → T003–T006 |
| §I.4.4 Data-subject rights | Linkage path recorded | ✅ | FR-8 → T003–T006 |
| §I.5.3 Accountability | Unchanged | ✅ | F03 weakens nothing |
| §I.B Phased posture | Counsel-reviewable artifact | ✅ | T007 with `$counsel_review: pending` flag |
| §III Simplicity | Max 3 projects, no premature abstraction | ✅ | 0 new packages; 1 lint script; 4 docs |
| §IV.A Test-first | Tests precede implementation | ✅ | T015 → T016 (RED) → T017 (GREEN) |

**No constitutional exceptions requested.** ✅

---

## 2. Spec → Plan alignment

### Functional requirements (12 FRs)

| FR | Spec topic | Plan location | Status |
|---|---|---|---|
| FR-1 | Data-classification register | §4.1 + register contract | ✅ |
| FR-2 | Retention horizons per class | §4.2 | ✅ |
| FR-3 | Integrity-invariant catalog | §4.4 | ✅ |
| FR-4 | Migration conventions | §4.3 §8 | ✅ |
| FR-5 | Schema-evolution policy | §4.3 §8 (destructive forbidden) | ✅ |
| FR-6 | Schema-lint script | §4.5 (rules R1–R7) | ✅ |
| FR-7 | Canonical ER diagram | §4.6 + `data-model.md` | ✅ |
| FR-8 | Data-subject linkage map | §4.1 (`data_subject_linkage`) | ✅ |
| FR-9 | Erasure-mode declaration | §4.1 (per-column `erasure`) | ✅ |
| FR-10 | Lawful-basis per column | §4.1 (`default_lawful_basis`) | ✅ |
| FR-11 | Convention conformance back-check | §4.7 | ✅ |
| FR-12 | Documentation cross-reference | §4.1 (`file:`/`migration:` per table) | ✅ |

All 12 FRs addressed in plan.

### Non-functional requirements (6 NFRs)

| NFR | Spec topic | Plan location | Status |
|---|---|---|---|
| NFR-1 | Documentation discoverability | §4 (paths pinned to repo) | ✅ |
| NFR-2 | Schema-lint runtime <15s | §4.5 + R-1 rationale | ✅ |
| NFR-3 | Register machine-readability | §4.1 + JSON-Schema contract | ✅ |
| NFR-4 | Versioning discipline | §4 (each artifact carries version/owner) | ✅ |
| NFR-5 | Register PR audit trail | §1 (separate-PR discipline implicit) | ⚠ M-2 |
| NFR-6 | Tombstone path discoverability | §4.2 placeholder + F05 link | ⚠ M-3 |

---

## 3. Plan → Tasks coverage

All 9 plan phases (B1–B9) have a corresponding `## Phase` section in tasks.md, each with at least one task.

**Effort consistency.** Plan §6 = 23–25h total; tasks.md sum = 23.25–25.25h. ✅

**TDD enforcement.** Plan §7 → tasks.md T015 → T016 (RED) → T017 (GREEN). ✅

**Dependency graph.** Plan §6 implicit ordering matches tasks.md explicit `Blocked by` graph. Critical path documented in tasks.md (6.25h with parallelism). ✅

---

## 4. Data model consistency

Register tables (`docs/data-governance/data-classification.yaml` — authored by T003–T006) cover the same 8 entities as `data-model.md §2`:

| Table | data-model.md | register (planned) | F02 schema module |
|---|---|---|---|
| `organizations` | ✅ | T003 | `packages/db/src/schema/organizations.ts` |
| `principals` | ✅ | T003 | `packages/db/src/schema/principals.ts` |
| `agent_credentials` | ✅ | T004 | `packages/db/src/schema/agent-credentials.ts` |
| `service_credentials` | ✅ | T004 | `packages/db/src/schema/service-credentials.ts` |
| `revocations` | ✅ | T004 | `packages/db/src/schema/revocations.ts` |
| `signing_keys` | ✅ | T005 | `packages/db/src/schema/signing-keys.ts` |
| `audit_events_buffer` | ✅ | T006 | `packages/db/src/schema/audit-events-buffer.ts` |
| `revoke_all_sessions_approvals` | ✅ | T006 | `packages/db/src/schema/revoke-all-sessions-approvals.ts` |

8/8 tables represented. Relationships in Mermaid `erDiagram` match the `.references()` calls in the F02 schema modules.

**No missing entities.** ✅

---

## 5. Contracts validation

`contracts/data-classification.schema.yaml` defines the JSON-Schema for the register. Cross-checked:

- Required fields (`$schema_version`, `$generated`, `$last_reviewed`, `$owner`, `data_classes`, `tables`) match plan §4.1 example.
- `data_classes[].erasure_mode` enum ∈ {hard_delete, tombstone, redact_in_place} matches FR-9.
- `data_classes[].sensitivity` enum ∈ {low, medium, high, critical} consistent with industry practice (FIPS-199-derived).
- `tables[].data_subject_linkage.role` enum ∈ {self, actor, target, initiator, approver, none} — covers the F02 patterns (principals=self, audit_events_buffer=actor, revoke_all_sessions_approvals=target/initiator/approver, signing_keys=none).
- Pattern `^[a-z][a-z0-9_]*$` for IDs and table names matches PostgreSQL identifier conventions.

**No contract drift.** ✅

F03 does not introduce HTTP/GraphQL contracts — none expected (governance feature, no API surface). ✅

---

## 6. Cross-artifact terminology consistency

Sampled terms across spec / plan / tasks:

| Term | Spec | Plan | Tasks | Status |
|---|---|---|---|---|
| "data class" / `data_classes` | both forms used consistently (prose vs. YAML key) | same | same | ✅ |
| "retention horizon" | ✅ | ✅ | ✅ | ✅ |
| "tombstone" | ✅ | ✅ | ✅ | ✅ |
| "schema-lint" | hyphenated everywhere (no `schema_lint` variant) | ✅ | ✅ | ✅ |
| "register" vs. "classification register" | "register" used as short form after first definition | same | same | ✅ |
| "back-check" (FR-11) | ✅ | §4.7 | T020–T023 | ✅ |
| `transitional:f05` sentinel | spec §8 CL-3 | plan §4.1, §4.2 | T007 | ✅ |
| "G-1/G-2/G-3" operator-run gates | not in spec | plan §13 (sign-off) | tasks.md "Out-of-band" + quickstart | ✅ |

**No terminology drift.** ✅

---

## 7. Completeness audit

| Artifact | Required? | Present? | Notes |
|---|---|---|---|
| `constitution.md` | yes | ✅ | v2.0.0 |
| `spec.md` | yes | ✅ | v1.1 |
| `plan.md` | yes | ✅ | v1.0 |
| `tasks.md` | yes | ✅ | v1.0, 27 tasks |
| `data-model.md` | yes | ✅ | 8 entities + Mermaid ER |
| `contracts/` | yes | ✅ | JSON-Schema contract present |
| `research.md` | optional | ✅ | 4 research items (R-1..R-4) |
| `quickstart.md` | optional | ✅ | 6 verification scenarios + 3 operator gates |
| `checklists/requirements.md` | yes (per `/speckit-specify`) | ✅ | v1.1 |
| Architecture diagram | optional | ✅ | Mermaid `erDiagram` embedded in data-model.md |

**All required artifacts present.** ✅

### Specification completeness

- ✅ All 5 user stories have ≥3 acceptance criteria each
- ✅ All 12 FRs defined (testable, specific)
- ✅ All 6 NFRs defined (quantified where applicable: NFR-2 <15s)
- ✅ 7 edge cases documented (EC-1..EC-7)
- ✅ 6 success metrics with mechanical-check methodology (M-1..M-6)
- ✅ 0 unresolved `[NEEDS CLARIFICATION]` markers (CL-1, CL-2, CL-3 resolved)

---

## 8. Issues found

### Critical (0)
None.

### High (0)
None.

### Medium (5)

#### M-1: FR-12 has no task with explicit ID reference
**Location:** tasks.md
**Description:** FR-12 (documentation cross-reference) is implicitly satisfied by T002–T006 (which include `file:` and `migration:` per table) and T010–T013 (which include test file pointers in the invariant catalog), but no task carries `FR-12` in its **FR/NFR refs:** line.
**Impact:** Low — coverage exists; only the traceability label is missing.
**Fix:** Add `FR-12` to T002 (register authorship is the umbrella) and T010 (catalog entries cross-reference tests).

#### M-2: NFR-5 (register PR audit trail) is policy, not task
**Location:** tasks.md
**Description:** NFR-5 ("material changes to the register reviewable as discrete PRs") is a *process* rule, not an implementation step. tasks.md doesn't reference it because there is nothing to "do" — the discipline is enforced socially / in `schema-conventions.md`.
**Impact:** Low — covered if the convention doc names it.
**Fix:** Extend T009 acceptance criteria with a checkbox: "schema-conventions.md §10 (or new section) names the register-PR discipline".

#### M-3: NFR-6 (tombstone path discoverability) — placeholder not yet wired
**Location:** tasks.md
**Description:** NFR-6 says the spec links the tombstone procedure for every `tombstone`-mode column. Until F05 ships, the link is a placeholder. Tasks.md doesn't explicitly create the placeholder.
**Impact:** Low — coverage exists in plan §4.2 (the policy mentions F05 will own).
**Fix:** Extend T007 acceptance criteria with: "retention-policy.md links a placeholder section `### Tombstone procedure (pending F05)`".

#### M-4: M-2 (register column-coverage metric) not explicit in T003–T006 acceptance
**Location:** tasks.md
**Description:** M-2 is the mechanical check that the register's column count equals the schema's column count. T003–T006 say "column coverage 100%" but don't reference M-2 by ID.
**Impact:** Cosmetic.
**Fix:** Add `M-2` to T003–T006 **FR/NFR refs:** line.

#### M-5: M-6 (F02 no-regression) not in any task acceptance
**Location:** tasks.md
**Description:** M-6 ("no F02 quickstart scenario or test regresses") should appear as a hard checkbox in T026 (PR) or T027 (squash-merge). Currently absent.
**Impact:** Risk that pre-merge `pnpm -r run test` step is skipped.
**Fix:** Add to T026 acceptance: "[ ] `pnpm -r run test` green on PR head (M-6)".

### Low (1)

#### L-1: M-4 (invariant catalog completeness) implicit in T010–T013 acceptance
**Location:** tasks.md
**Description:** T010–T013 acceptance criterion ("Row count matches CHECK + unique + partial + FK count") is M-4 in everything but name. Same fix pattern as M-4 above — add the ID label.
**Impact:** Cosmetic.
**Fix:** Add `M-4` to **FR/NFR refs:** lines for T010–T013.

---

## 9. Recommendations

### Immediate (before /speckit-implement)
Patch the 5 Medium findings inline. All are label-only or single-checkbox edits on tasks.md:
- M-1 → add `FR-12` ref to T002, T010
- M-2 → extend T009 acceptance
- M-3 → extend T007 acceptance
- M-4 → add `M-2` ref to T003–T006
- M-5 → add M-6 acceptance to T026
- L-1 → add `M-4` ref to T010–T013

Estimated edit time: ~10 minutes.

### Quality improvements (deferred)
- None blocking. Optional follow-up: write a `glossary.md` if more features are added under this slug.

### Re-validation
Re-run `/speckit-analyze` is **not required** after the 5 Medium fixes — they are label-only and a second pass would only re-confirm what this report already concludes. The next gate is `/speckit-implement`.

---

## 10. Status

✅ **F03 is ready for `/speckit-implement`.**

The 5 Medium findings are cosmetic / traceability fixes and should be patched in-line before or during T001. They do not change the work, only its labeling.

**Sign-off summary:**
- Constitutional: ✅ Compliant
- Coverage: ✅ Complete
- Consistency: ✅ Stable
- Completeness: ✅ All artifacts present
- Traceability: ⚠ 5 cosmetic label gaps (Medium) + 1 cosmetic gap (Low)

**Next steps:**
1. Patch Medium findings in tasks.md (~10 min)
2. Commit the F03 SDD artifacts to branch
3. Begin `/speckit-implement` starting at T001
