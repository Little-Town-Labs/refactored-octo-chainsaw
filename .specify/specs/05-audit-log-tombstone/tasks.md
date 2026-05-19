# Tasks — F05 Audit Log + Transcript Store + Tombstone

**Spec:** v0.1 · **Plan:** v0.1 · **Tasks:** v0.1 (2026-05-19)
**Owner:** Gary

Status legend: 🟡 Ready · 🔴 Blocked · 🟢 In Progress · ✅ Complete · ⏸ Deferred

---

## Phase B1 — Governance + contracts (4h)

### T001 — Register F05 data classes and canonical tables
**Status:** ✅ Complete · **Effort:** 1h · **Blocked by:** none
**Description.** Update `docs/data-governance/data-classification.yaml` for `audit_log_events`, `transcript_turns`, `tombstone_records`, and `evidence_exports`.

**Acceptance:**
- [x] All new tables and personal-data columns have class and erasure modes.
- [x] `pnpm schema:lint` remains clean.

### T002 — Replace F03 "pending F05" retention placeholders
**Status:** ✅ Complete · **Effort:** 1h
**Description.** Update `docs/data-governance/retention-policy.md` so tombstone references point to the F05 procedure and transitional `audit_events_buffer` notes name the cutover path.

**Acceptance:**
- [x] No unresolved "pending F05" tombstone placeholder remains.
- [x] Counsel-review pending markers remain where operational sign-off is required.

### T003 — Add F05 invariants to governance docs
**Status:** ✅ Complete · **Effort:** 1h
**Description.** Update `docs/data-governance/integrity-invariants.md` for hash-chain uniqueness, source replay uniqueness, transcript idempotency, and tombstone uniqueness.

**Acceptance:**
- [x] Every planned CHECK/UNIQUE/FK/index invariant is documented.

### T004 — Validate F05 JSON Schema contracts
**Status:** ✅ Complete · **Effort:** 1h
**Description.** Add schema validation tests for `.specify/specs/05-audit-log-tombstone/contracts/*.schema.yaml`.

**Acceptance:**
- [x] Contract fixtures pass validation.
- [x] Deliberately invalid fixtures fail.

---

## Phase B2 — Canonical audit schema + hash chain (14h)

### T005 — Hash-chain verifier tests (RED)
**Status:** ✅ Complete · **Effort:** 2h
**Description.** Add tests for deterministic canonical serialization, event hashing, previous-hash linking, and mutation detection.

**Acceptance:** tests compile and fail before implementation. ✅

### T006 — Add F05 audit schema and migration
**Status:** ✅ Complete · **Effort:** 3h
**Description.** Add `audit_log_events`, `tombstone_records`, and `evidence_exports` schema modules plus migration `0006_f05_audit_log_tombstone.sql`.

**Acceptance:**
- [x] Migration applies cleanly.
- [x] Governance docs match schema columns.

### T007 — Implement hash-chain serializer and verifier
**Status:** ✅ Complete · **Effort:** 3h
**Description.** Implement canonical serialization, `computeEventHash`, and chain verification.

**Acceptance:**
- [x] T005 tests pass.
- [x] Deliberate mutation fixture fails verification at the expected row.

### T008 — Canonical audit writer
**Status:** ✅ Complete · **Effort:** 3h
**Description.** Implement writer that appends canonical events transactionally and computes hash links.

**Acceptance:**
- [x] Append emits valid chain links.
- [x] Concurrent append behavior is deterministic or safely serialized.

### T009 — Audit-chain performance baseline
**Status:** ✅ Complete · **Effort:** 3h
**Description.** Seed 10,000 events and record verification timing.

**Acceptance:**
- [x] Verification completes under 30 seconds.
- [x] Results captured in F05 quickstart-run artifact.

---

## Phase B3 — Buffer replay and cutover (8h)

### T010 — Replay idempotency tests (RED)
**Status:** ✅ Complete · **Effort:** 2h
**Description.** Test exact-once replay from `audit_events_buffer` using `source_table/source_event_id`.

**Acceptance:** duplicate replay does not create duplicate canonical rows. ✅

### T011 — Implement replay command
**Status:** ✅ Complete · **Effort:** 3h
**Description.** Add `packages/db/scripts/f05-audit-replay.ts` or package equivalent.

**Acceptance:**
- [x] Replay succeeds after partial failure retry.
- [x] Source references are preserved.

### T012 — Wire post-cutover audit sink path
**Status:** ✅ Complete · **Effort:** 3h
**Description.** Update DB-backed audit sink or adapter so post-cutover canonical writes preserve F02/F04 event semantics.

**Acceptance:**
- [x] Existing F02/F04 audit tests remain green.
- [x] Canonical audit rows appear for new emitted events.

---

## Phase B4 — Transcript store (10h)

### T013 — Transcript schema and idempotency tests (RED)
**Status:** ✅ Complete · **Effort:** 2h
**Description.** Test transcript append, duplicate `(run_id, side, turn_index)`, audit linkage, and denied read access.

**Acceptance:** tests fail before implementation. ✅

### T014 — Add transcript schema and migration coverage
**Status:** ✅ Complete · **Effort:** 2h
**Description.** Add `transcript_turns` schema and migration coverage if not already included in T006.

**Acceptance:**
- [x] Unique idempotency invariant present.
- [x] FK/indexes support match/run lookup.

### T015 — Implement transcript append/read primitives
**Status:** ✅ Complete · **Effort:** 4h
**Description.** Implement scoped transcript append and read APIs.

**Acceptance:**
- [x] T013 tests pass.
- [x] Transcript append emits/links audit event.

### T016 — Transcript append benchmark
**Status:** ✅ Complete · **Effort:** 2h
**Description.** Seed transcript turns and record append p90.

**Acceptance:**
- [x] p90 append under 200ms in seeded dev run.

---

## Phase B5 — Tombstone procedure (14h)

### T017 — Tombstone procedure tests (RED)
**Status:** ✅ Complete · **Effort:** 3h
**Description.** Test successful audit tombstone, transcript tombstone, already-tombstoned rejection, legal-hold rejection, and missing lawful-basis rejection.

**Acceptance:** tests fail before implementation. ✅

### T018 — Implement tombstone target resolver
**Status:** ✅ Complete · **Effort:** 3h
**Description.** Resolve erasure targets from subject references across canonical audit and transcript stores.

**Acceptance:**
- [x] Target resolver returns deterministic target sets.
- [x] Legal-hold targets are excluded or denied per policy.

### T019 — Implement atomic tombstone execution
**Status:** ✅ Complete · **Effort:** 5h
**Description.** Redact target payload/content, insert tombstone record, emit tombstone audit event, and preserve chain verification.

**Acceptance:**
- [x] T017 success and denial tests pass.
- [x] Chain verifier stays valid after tombstone.

### T020 — Tombstone runbook
**Status:** ✅ Complete · **Effort:** 3h
**Description.** Add `docs/runbooks/audit-log-tombstone.md` with operator steps, counsel gates, rollback limits, and verification commands.

**Acceptance:**
- [x] Runbook covers request intake, execution, verification, and evidence export.

---

## Phase B6 — Evidence reads/export (8h)

### T021 — Evidence export authorization tests (RED)
**Status:** ✅ Complete · **Effort:** 2h
**Description.** Test scoped and unscoped audit/transcript/export reads.

**Acceptance:** unscoped principals denied by default. ✅

### T022 — Implement evidence query/export primitives
**Status:** ✅ Complete · **Effort:** 4h
**Description.** Query by match id, run id, principal id, correlation id, and date range; generate deterministic manifests.

**Acceptance:**
- [x] Export includes chain verification status and tombstone markers.
- [x] Manifest hash is deterministic.

### T023 — Operator/counsel review documentation
**Status:** ✅ Complete · **Effort:** 2h
**Description.** Document evidence export workflow and allowed purposes.

**Acceptance:**
- [x] Docs identify required scopes and review purposes.

---

## Phase B7 — Back-check, reviews, and closure (8h)

### T024 — Execute quickstart scenarios
**Status:** ✅ Complete · **Effort:** 2h
**Description.** Run all F05 quickstart scenarios and save `quickstart-run-<date>.md`.

**Acceptance:**
- [x] All scenarios pass or have documented deferrals.

### T025 — Run `/speckit-analyze`
**Status:** ✅ Complete · **Effort:** 1h
**Acceptance:**
- [x] No CRITICAL/HIGH findings remain.

### T026 — Run `/code-review` and mandatory `/security-review`
**Status:** ✅ Complete · **Effort:** 2h
**Acceptance:**
- [x] No CRITICAL/HIGH findings remain.

### T027 — Final verification
**Status:** ✅ Complete · **Effort:** 2h
**Description.** Run package tests, type-check, lint, schema-lint, and F05 performance scripts.

**Acceptance:**
- [x] All local gates pass.

### T028 — Roadmap and handoff update
**Status:** ✅ Complete · **Effort:** 1h
**Description.** Mark F05 complete in roadmap and add handoff notes for F06/F07/F08/F10/F24.

**Acceptance:**
- [x] Roadmap reflects F05 closure.
- [x] Handoff notes name stable audit/transcript/tombstone seams.

---

## Dependency graph

```text
T001 -> T002 -> T003 -> T006
T004 -> T005 -> T007 -> T008 -> T009
T008 -> T010 -> T011 -> T012
T006 -> T013 -> T014 -> T015 -> T016
T008 + T015 -> T017 -> T018 -> T019 -> T020
T008 + T015 -> T021 -> T022 -> T023
T009 + T016 + T019 + T022 -> T024 -> T025 -> T026 -> T027 -> T028
```

## Summary

- **Total tasks:** 28
- **Estimated effort:** ~66h
- **TDD enforced:** hash-chain verifier, replay, transcript idempotency, tombstone, and evidence authorization
- **Mandatory review:** `/security-review`
