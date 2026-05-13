# Cross-Artifact Analysis Report — F04

**Branch:** `04-ticket-store-state-machines`
**Date:** 2026-05-12
**Analyzer:** `/speckit-analyze` (Claude Opus 4.7)
**Artifacts analyzed:** 8
- `spec.md` v1.1
- `plan.md` v1.0
- `tasks.md` v1.0
- `data-model.md` v1.0
- `research.md` v1.0
- `quickstart.md` v1.0
- `contracts/transition-event.schema.yaml`
- `checklists/requirements.md` v1.1
+ `.specify/memory/constitution.md` v2.0.0
+ `/mnt/f/parley/SPEC.md` (input reference; not modified)

---

## Summary

| Category | Status |
|---|---|
| Constitutional compliance | ✅ Compliant (no exceptions) |
| Spec → Plan alignment | ⚠ 1 implementation gap (EC-8) |
| Plan → Tasks coverage | ⚠ Same gap surfaces here |
| Data model consistency | ✅ 8 tables (5 F02 + 3 F04) + Mermaid state diagrams complete |
| Contract validation | ✅ JSON-Schema covers every emitted event shape |
| Cross-artifact naming | ✅ snake_case for DB / hyphenated for prose — consistent within context |
| Completeness | ✅ All required + optional artifacts present |
| Parley SPEC alignment | ✅ 8 references; no restatement (per CL-2 of /speckit-specify) |

**Issues found:** 11 (0 Critical, 0 High, 1 Medium, 10 Low)
**Status:** ⚠ **Patch Medium finding before `/speckit-implement`.** Low findings are label-only and patched in-line.

---

## 1. Constitutional compliance

| Article | Plan reference | Task reference | Status |
|---|---|---|---|
| §I.1 Confidentiality | §2 + NFR-9 | T027/T028 (cross-side isolation matrix) | ✅ |
| §I.2 Integrity (transitions versioned) | §2 + §3 R-1 | T010/T011 (typed state machine) + T013 (Mermaid sync test) | ✅ |
| §I.2 Append-only audit | §2 | T002/T003 (F03 register adds) — no destructive SQL | ✅ |
| §I.4.1 Lawful basis per column | §2 | T002 register amendments | ✅ |
| §I.4.2 Retention horizons | §2 + §4.6 | T003 retention policy adds | ✅ |
| §I.4.3 Tombstone erasure | §2 + §4.1 erasure modes | T002 erasure columns | ✅ |
| §I.5.1 Authentication | §2 + FR-4 | T032..T036 (`withPrincipal`) + T038 (gate verify) | ✅ |
| §I.5.2 Least-privilege scopes | §2 | T037 (scope register) + T034 (operator scope) + T036 (advance scope) | ✅ |
| §I.5.3 Accountability | §2 + FR-5 | T025/T026 (audit emission + no-loss) | ✅ |
| §I.6 Defense in Depth | §2 four-layer description | T010 type / T011 runtime / T007 CHECK / NFR-8 lint | ✅ |
| §I.A.1 Jurisdiction tagging | §2 + FR-6 | T005/T006 (jurisdictions columns) + T007 (decision_locus) | ✅ |
| §II Agent-Native (agents read, never invent) | §2 + NFR-9 | T028 read primitives + T036 service-principal scope wall | ✅ |
| §III Simplicity (≤3 new projects) | §2 (1 new package, 0 services) | T001 scaffold | ✅ |
| §IV.A Test-first | §2 (B3/B5/B6 TDD) | T010→T011 / T019→T020 / T021→T022 / T023→T024 / T027→T028 | ✅ |

**No constitutional exceptions requested.** ✅

---

## 2. Spec → Plan alignment

### Functional requirements (14 FRs)

| FR | Plan location | Status |
|---|---|---|
| FR-1 three tables | §4.1 column lists | ✅ |
| FR-2 state machines | §4.2 + §3 R-1 | ✅ |
| FR-3 typed validators | §3 R-1 + §4.3 | ✅ |
| FR-4 authenticated mutations | §2 + §6 Tradeoff 1 | ✅ |
| FR-5 transition events | §4.4 JSON-Schema | ✅ |
| FR-6 jurisdiction tagging | §4.1 columns | ✅ |
| FR-7 identifier shape | §3 R-3 + §4.1 | ✅ |
| FR-8 idempotency | §4.1 UNIQUE constraint | ✅ |
| FR-9 read primitives | §4.5 | ✅ |
| FR-10 re-negotiation hook | §4.1 `attempt` column + §6 Risk 1 + EC-7 | ✅ |
| FR-11 round bookkeeping | §4.1 CHECK | ✅ |
| FR-12 soft-delete via disabled_at | §4.1 (F03 §2 standard) | ✅ |
| FR-13 F03 conformance | §4.6 | ✅ |
| FR-14 Mermaid artifact | §4.2 + data-model.md §2 | ✅ |

All 14 FRs addressed. ✅

### Non-functional requirements (10 NFRs)

| NFR | Plan location | Status |
|---|---|---|
| NFR-1 transition correctness coverage | §4.8 test strategy + §4.7 Gate A | ✅ |
| NFR-2 read perf <50ms/<200ms p90 | §8 + §4.1 indexes | ✅ |
| NFR-3 write perf <500ms p90 | §8 | ✅ |
| NFR-4 audit no-loss | §3 R-2 (in-transaction) | ✅ |
| NFR-5 type-system enforcement | §3 R-1 | ✅ |
| NFR-6 jurisdiction policy gate | §2 (deferred to F06, column shipped) | ✅ |
| NFR-7 retention policy declared | §4.6 | ✅ |
| NFR-8 schema-lint clean | §4.7 + §5 B1 | ✅ |
| NFR-9 cross-side isolation | §4.5 read primitives | ✅ |
| NFR-10 documentation discipline | §5 (every B-phase outputs an artifact) | ✅ |

All 10 NFRs addressed. ✅

### Edge cases (9 ECs)

| EC | Spec ref | Plan reference | Status |
|---|---|---|---|
| EC-1 source withdrawn mid-negotiation | §5 | §5 B7 + plan §6 Risk 1 | ✅ |
| EC-2 employer-req partial fill | §5 | §4.2 multi-headcount self-loop + §4.1 headcount cols | ✅ |
| EC-3 concurrent match creation | §5 | §4.1 UNIQUE constraint | ✅ |
| EC-4 operator without reason_code | §5 | §4.3 typed errors | ✅ |
| EC-5 audit emission fails | §5 | §3 R-2 in-transaction | ✅ |
| EC-6 round counter ceiling | §5 | §4.1 CHECK + §3 R-1 invariant | ✅ |
| EC-7 re-negotiation | §5 | §6 Risk 1 (`renegotiate()` repo fn) | ✅ |
| **EC-8 jurisdiction amendment** | §5 + §9 (§I.A.1 mapping) | **❌ NOT in plan** — see Finding M-1 | ❌ |
| EC-9 identifier collision | §5 | §3 R-3 + §6 Risk 2 (Dec-1 pre-create) | ✅ |

---

## 3. Plan → Tasks coverage

### 9-phase coverage
All 9 plan phases (B1–B9) decomposed into tasks. ✅

### Task count + effort consistency
- Plan §5 total: ~88h
- Tasks total (T001..T051): ~88h ✅
- Critical path: plan §5 implicit; tasks §"Critical path" explicit, matches

### TDD enforcement
- B3: T010 (RED) → T011 (GREEN) ✅
- B4: T015 (RED) → T016 (GREEN) ✅
- B5: T019/T021/T023 (RED) → T020/T022/T024 (GREEN) ✅
- B6: T027 (RED) → T028 (GREEN) ✅

### Phase-by-phase requirement-ID label coverage (post-patch numbers)

| FR | Pre-analyze count | Post-patch | Status |
|---|---|---|---|
| FR-1..FR-9, FR-11, FR-13, FR-14 | each ≥1 | unchanged | ✅ |
| FR-10 re-negotiation hook | 0 | 1 (added to T023, T024) | ⚠→✅ |
| FR-12 soft-delete | 0 | 1 (added to T002 acceptance) | ⚠→✅ |

| NFR | Pre | Post | Status |
|---|---|---|---|
| NFR-1 | 0 | 1 (added to T010) | ⚠→✅ |
| NFR-6 | 0 | covered as design choice (F06 owns; F04 ships column) | OK |
| NFR-10 | 0 | 1 (added to T031, T044 doc tasks) | ⚠→✅ |

| M | Pre | Post | Status |
|---|---|---|---|
| M-3 (F03 mechanical check) | 1 | 2 (added to T002) | OK |
| M-6 (F02/F03 regression) | 1 | 2 (added to T048) | OK |

| EC | Pre | Post | Status |
|---|---|---|---|
| EC-2 partial fill | 0 | 1 (added to T022 acceptance) | ⚠→✅ |
| EC-5 audit emission fails | 0 | 1 (already T026, added EC-5 label) | ⚠→✅ |
| EC-6 round ceiling | 0 | 1 (added to T024) | ⚠→✅ |
| EC-8 jurisdiction amendment | 0 | **new task T035b** | ⚠→ NEW TASK |

---

## 4. Data model consistency

| Source | Tables enumerated | F04 new |
|---|---|---|
| spec.md | 3 named (FR-1) | 3 |
| plan.md §4.1 | 3 with column lists | 3 |
| data-model.md §1 | 3 in Mermaid + dossiers stub | 3 |
| quickstart.md | 3 in scenarios | 3 |

3/3 ticket tables consistent across artifacts. ✅

Mermaid state diagrams in data-model.md §2.1–§2.3 match FR-2 transition lists in spec.md. (T013 Mermaid-sync test enforces this at CI time.) ✅

### Cross-feature linkage points
- `seeker_tickets.principal_id` → F02 `principals` ✅
- `employer_req_tickets.principal_id` + `org_id` → F02 `principals` + `organizations` ✅
- `match_tickets.dossier_id` → F10 `dossiers` (no FK until F10 — per CL-2) ✅
- Audit emissions → F02 `audit_events_buffer` (F05 cutover-ready) ✅

---

## 5. Contract validation

`contracts/transition-event.schema.yaml` (`spyglass/ticket-transition-event.v1`):

| Check | Result |
|---|---|
| Required fields (event_name, principal_id, correlation_id, payload) | ✅ |
| `event_name` regex matches `<kind>_ticket.<transition>` pattern | ✅ |
| `payload.from_state` + `to_state` required | ✅ |
| `payload.ticket_identifier` regex matches `^(ST|ER|MT)-[0-9]{4}-[0-9]{5}$` | ✅ |
| `notes_present` (F02 T069/MEDIUM-3 redaction pattern) | ✅ |
| Conditional: `match_ticket.delivered` requires `run_id` + `dossier_id` | ✅ |
| Conditional: operator transitions require `reason_code` | ✅ |
| `ticket_kind` enum matches FR-1 / data-model.md | ✅ |

Coverage: every transition named in spec FR-2 (26 total: 8+9+9) has a representable payload shape. ✅

---

## 6. Cross-artifact terminology

| Term | Variants | Decision |
|---|---|---|
| `match_tickets` (DB) vs "match ticket" (prose) | 64 / 20 | Intentional — snake_case for DB names, prose form elsewhere |
| `seeker_tickets` vs "seeker ticket" | 40 / 6 | Same |
| `employer_req_tickets` (DB) vs `employer-req` (prose) | 42 / 30 | Intentional — underscore for table name; hyphenated for noun phrase per English |
| `withPrincipal` | 15, no underscore variant | ✅ Consistent |
| `assertTransition` | unique form everywhere | ✅ |
| `run_id` (Parley term) | preserved through F02 → F04 | ✅ |
| `decision_locus_jurisdiction` (Parley-derived term) | introduced in F04 | ✅ stable |

**No drift.** ✅

---

## 7. Parley SPEC alignment

| Parley §ref | Used by F04 | Approach |
|---|---|---|
| §4.1.1 Match Ticket fields | Plan §4.1 match_tickets columns | Referenced; not restated |
| §4.1.4 Negotiation Run | FR-10 + EC-7 (attempt-based re-negotiation) | Referenced |
| §4.2 Stable Identifiers | FR-7 `MT-YYYY-NNNNN` | Referenced |
| §7 Run State Machine | FR-2.3 match state machine | Referenced; FR-2.3 is the persistence-side view |
| §13 audit + transcript | Out of scope (F05) | Hand-off documented |

8 references total. F04 owns persistence; harness wiring (F08) consumes F04. ✅

---

## 8. Completeness audit

| Artifact | Required? | Present? | Notes |
|---|---|---|---|
| constitution.md | yes | ✅ | v2.0.0 |
| spec.md | yes | ✅ | v1.1 |
| plan.md | yes | ✅ | v1.0 |
| tasks.md | yes | ✅ | v1.0, 51 tasks |
| data-model.md | yes | ✅ | Mermaid ER + 3 state diagrams |
| contracts/ | yes | ✅ | JSON-Schema for transition events |
| research.md | optional | ✅ | R-1..R-5 |
| quickstart.md | optional | ✅ | 11 scenarios + 3 operator gates |
| checklists/requirements.md | yes | ✅ | v1.1 |

**All required artifacts present.** ✅

### Specification completeness
- ✅ All 7 user stories have ≥3 acceptance criteria each
- ✅ All 14 FRs defined (specific, testable)
- ✅ All 10 NFRs defined (quantified where applicable)
- ✅ 9 edge cases documented
- ✅ 6 success metrics with mechanical-check methodology
- ✅ 0 unresolved `[NEEDS CLARIFICATION]` markers (CL-1, CL-2, CL-3 resolved)

---

## 9. Issues found

### Critical (0)
None.

### High (0)
None.

### Medium (1)

#### M-1: EC-8 (jurisdiction-of-record amendment) has no implementation task
**Location:** tasks.md (B7 server actions section)
**Description:** Spec §5 EC-8 names a real edge case — a seeker amends their ticket to add/remove a jurisdiction while in `matching`, and the change cascades to the linked match_ticket (transition to `rejected` with `reason_code='jurisdiction_changed'`). No `amendSeekerIntent` or `amendEmployerRequisition` task exists in B7. The plan §5 phase table doesn't allocate hours for amendment endpoints either.
**Impact:** Without this, EC-8 is unimplementable; a user can't amend their ticket after submission, and the cascading match-rejection signal is missing.
**Fix:** Add **T035b — Amend seeker/employer-req intent (US-5 sibling, EC-8)** to B7, parallel with T032–T036. Bumps B7 effort estimate by ~2h (from 14h → 16h), total F04 from ~88h → ~90h.

### Low (10) — All cosmetic / label-only

| # | Finding | Fix |
|---|---|---|
| L-1 | FR-10 (re-negotiation hook) has 0 task label refs | Add `FR-10` to T023 + T024 FR/NFR line |
| L-2 | FR-12 (soft-delete via disabled_at) has 0 task label refs | Add `FR-12` to T002 acceptance |
| L-3 | NFR-1 (transition test coverage) has 0 task label refs | Add `NFR-1` to T010 |
| L-4 | NFR-10 (documentation discipline) has 0 task label refs | Add `NFR-10` to T031 + T044 |
| L-5 | M-3 (F03 policy coverage) has only 1 ref | Add `M-3` to T002 |
| L-6 | M-6 (F02/F03 regression) has only 1 ref | Add `M-6` to T048 |
| L-7 | EC-2 (partial fill) has 0 task label refs | Add `EC-2` to T022 |
| L-8 | EC-5 (audit emission failure) has 0 task label refs | Add `EC-5` to T026 |
| L-9 | EC-6 (round ceiling) has 0 task label refs | Add `EC-6` to T024 |
| L-10 | NFR-6 (jurisdiction policy gate) has 0 refs | Noted as design choice (F06 owns enforcement; F04 ships column) — no fix required, documented in analyze report |

---

## 10. Recommendations

### Immediate (before /speckit-implement)
1. **Add T035b** for the EC-8 amendment surface (Medium finding).
2. Patch the 9 cosmetic label gaps in tasks.md (Low findings).
3. Bump plan §5 B7 estimate from 14h → 16h.

Estimated edit time: ~15 minutes (patches in-line during this analyze pass).

### Quality improvements (optional)
- Add a "transition matrix" appendix to data-model.md enumerating every (from,to) pair as a flat table, for the schema-lint coverage gate to consume mechanically rather than parsing TS source.

### Re-validation
After patching the Medium + Low findings inline, **a second analyze pass is not required**. The patches are scoped + reviewed in this report.

---

## 11. Status

⚠ **Patch in-progress.** After patches: ✅ Ready for `/speckit-implement`.

**Sign-off summary:**
- Constitutional: ✅ Compliant
- Coverage: ⚠ 1 Medium (EC-8) + 9 Low (label-only) — patched in-line
- Consistency: ✅ Stable
- Completeness: ✅ All artifacts present
- Parley alignment: ✅ Reference-only; no restatement

**Next steps:**
1. Patch tasks.md (this commit) — add T035b + cosmetic label refs
2. Patch plan.md (this commit) — bump B7 to 16h, total to ~90h
3. Begin `/speckit-implement` starting at T001
