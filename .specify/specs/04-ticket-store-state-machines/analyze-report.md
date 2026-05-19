# F04 — `/speckit-analyze` Report (T046, post-implementation)

**Generated:** 2026-05-19
**Branch:** `04-ticket-store-state-machines`
**Scope:** Cross-artifact consistency check across `spec.md`, `plan.md`,
`research.md`, `data-model.md`, `contracts/*`, `quickstart.md`,
`quickstart-run-2026-05-19.md`, `tasks.md`, governance docs, and the
implemented F04 surface at HEAD `c0008bc`.
**Constitution:** v2.0.0
**Prior baseline:** `analyze-report.md` dated 2026-05-12 found 0
Critical, 0 High, 1 Medium, and 10 Low before implementation. The
Medium EC-8 gap was resolved by adding and completing T035b.

---

## Summary

| Severity | Count | Resolution |
|---|---:|---|
| CRITICAL | 0 | None |
| HIGH | 0 | None |
| MEDIUM | 0 | EC-8 implementation gap closed by T035b |
| LOW | 1 | Fixed inline: state-machine edge-count typo in `data-model.md` |
| INFO | 2 | B9 closure tasks remain by design |

**Verdict: PASS.** T046 acceptance is met: no CRITICAL/HIGH findings
and no unresolved MEDIUM findings. The only LOW drift was corrected in
this pass.

---

## 1. Constitutional Compliance

| Article | Status | Evidence |
|---|---|---|
| §I.1 Confidentiality | ✅ Compliant | Read primitives enforce tier-side filtering; B8 staged run found 0 audit-payload PII findings |
| §I.2 Integrity | ✅ Compliant | Typed transition catalogs, runtime validator, Mermaid parity tests, CHECK constraints, and transition audit events |
| §I.4 Data governance | ✅ Compliant | F04 data-classification, retention, and invariant docs landed; schema-lint remains the F03 gate |
| §I.5.1 Authentication | ✅ Compliant | Server actions and tRPC procedures use `getPrincipal`; principal-coverage gate recognizes the new surface |
| §I.5.2 Authorization | ✅ Compliant | `tickets.match.advance` and `tickets.transition.operator` scopes registered and enforced |
| §I.5.3 Accountability | ✅ Compliant | Transition events include `principal_id` and `correlation_id`; operator transitions include `reason_code` |
| §I.6 Defense in Depth | ✅ Compliant | TS validator + repo orchestration + SQL checks + CI gates all cover transition correctness |
| §I.A.1 Jurisdiction | ✅ Compliant | Source tickets carry jurisdictions; match tickets carry decision locus; amendment surface landed in T035b |
| §II Agent-Native | ✅ Compliant | Downstream features consume canonical read primitives; agents do not invent ticket state |
| §III Simplicity | ✅ Compliant | One domain package (`@spyglass/tickets`), no new service or infra |
| §IV.A Test-first | ✅ Compliant | RED/GREEN task pairs recorded through B3, B5, B6, and action wiring tests |
| §V.3 Review gates | ⏳ In progress | T046 complete in this report; T047 code/security review remains next |

No constitutional exceptions requested.

---

## 2. Spec → Plan → Implementation Coverage

### Functional Requirements

| FR group | Implemented surface | Status |
|---|---|---|
| FR-1 tables | `packages/db/src/schema/*tickets.ts`; migration + governance docs | ✅ |
| FR-2 state machines | `packages/tickets/src/transitions.ts`; Mermaid diagrams; parity tests | ✅ |
| FR-3 typed validators | `assertTransition` + typed errors and invariant checks | ✅ |
| FR-4 authenticated mutations | `apps/web/src/tickets/actions/*`; `apps/web/src/server/tickets.ts` | ✅ |
| FR-5 transition events | `packages/tickets/src/audit.ts`; JSON Schema contract; audit-shape tests | ✅ |
| FR-6 jurisdiction tagging | schema columns, repo inputs, staged run, T035b amendment path | ✅ |
| FR-7 identifiers | identifier helpers, sequence rollover helper, tests, runbook | ✅ |
| FR-8 idempotency | match repo duplicate-pair handling and staged run duplicate probe | ✅ |
| FR-9 read primitives | `packages/tickets/src/repo/read.ts` with isolation tests | ✅ |
| FR-10 renegotiation hook | source workflow and match repo support; staged run Scenario 8 | ✅ |
| FR-11 round bookkeeping | schema CHECKs + match advance validation | ✅ |
| FR-12 soft delete | F03 standard columns on ticket tables | ✅ |
| FR-13 F03 conformance | schema-lint-ready schema and governance entries | ✅ |
| FR-14 Mermaid artifact | `data-model.md` diagrams with test parity | ✅ |

All 14 FRs trace to code, docs, tests, or a closure artifact.

### Non-Functional Requirements

| NFR | Evidence | Status |
|---|---|---|
| NFR-1 transition coverage | `pnpm tickets:coverage` gate and transition tests | ✅ |
| NFR-2 read p90 targets | T030 10k benchmark and `docs/performance/f04-baseline.md` | ✅ |
| NFR-3 write p90 targets | T030 benchmark + B8 staged dev-run | ✅ |
| NFR-4 audit no-loss | in-transaction repo writes + rollback tests | ✅ |
| NFR-5 type enforcement | discriminated state/transition types | ✅ |
| NFR-6 jurisdiction gate readiness | jurisdiction columns shipped; policy gate remains F06-owned | ✅ |
| NFR-7 retention policy | `docs/data-governance/retention-policy.md` | ✅ |
| NFR-8 schema-lint | F03 schema convention comments and gate wiring | ✅ |
| NFR-9 cross-side isolation | read primitive tests and B8 Scenario 10 | ✅ |
| NFR-10 docs discipline | performance doc, runbook, credential lifecycle update | ✅ |

No NFR coverage gaps found.

### Edge Cases

| Edge case | Post-implementation status |
|---|---|
| EC-1 source withdrawn mid-negotiation | ✅ `withdrawSeekerIntent` rejects linked match with `source_withdrawn` |
| EC-2 employer partial fill | ✅ self-loop and headcount invariants covered |
| EC-3 concurrent match creation | ✅ idempotency constraint + duplicate probe |
| EC-4 operator missing reason_code | ✅ transition validator and action tests reject |
| EC-5 audit emission fails | ✅ transaction rollback tests |
| EC-6 round counter ceiling | ✅ schema CHECK and repo validator |
| EC-7 renegotiation | ✅ attempt/run reset covered in staged run |
| EC-8 jurisdiction amendment | ✅ T035b complete: seeker/employer amendment actions + tests |
| EC-9 identifier collision | ✅ sequence allocation + unique constraints + rollover runbook |

---

## 3. Plan → Tasks → Implementation Coverage

| Phase | Task range | Status |
|---|---|---|
| B1 | T001-T004 | ✅ Complete |
| B2 | T005-T009 | ✅ Complete |
| B3 | T010-T014 | ✅ Complete |
| B4 | T015-T018 | ✅ Complete |
| B5 | T019-T026 | ✅ Complete |
| B6 | T027-T031 | ✅ Complete |
| B7 | T032-T040 + T035b | ✅ Complete |
| B8 | T041-T045 | ✅ Complete |
| B9 | T046-T051 | ⏳ T046 complete in this report; T047-T051 remain |

The task ledger is internally consistent: all implementation phases are
closed and B9 remains the merge-closure track.

---

## 4. Data Model Consistency

| Entity / catalog | Spec | Plan | Data model | Implementation | Status |
|---|---|---|---|---|---|
| `seeker_tickets` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `employer_req_tickets` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `match_tickets` | ✅ | ✅ | ✅ | ✅ | ✅ |
| Seeker transitions | ✅ | ✅ | ✅ 8 edges | ✅ 8 edges | ✅ |
| Employer-req transitions | ✅ | ✅ | ✅ 8 edges | ✅ 8 edges | ✅ |
| Match transitions | ✅ | ✅ | ✅ 9 edges | ✅ 9 edges | ✅ |

**LOW-1 fixed inline:** `data-model.md` described seeker and
employer-req machines as "9 named edges" even though the diagrams,
transition catalogs, and tests all have 8. The prose now matches the
canonical diagrams and TypeScript catalogs.

---

## 5. Contract And Gate Alignment

| Contract / gate | Evidence | Status |
|---|---|---|
| Transition event schema | `contracts/transition-event.schema.yaml`; audit-shape tests | ✅ |
| `tickets-state-machine-coverage` | `scripts/check-tickets-state-machine.sh` | ✅ |
| `principal-coverage` | `scripts/check-principal-coverage.sh` scans server actions and tRPC files | ✅ |
| Performance baseline | `docs/performance/f04-baseline.md` | ✅ |
| Operator runbook | `docs/runbooks/ticket-lifecycle.md` | ✅ |
| Credential lifecycle impact | `docs/security/credential-lifecycle.md` | ✅ |

---

## 6. Remaining Closure Work

T046 is complete. Remaining B9 gates:

1. T047 — run `/code-review` and `/security-review`; save reports next
   to this analyze report.
2. T048 — run local closure checks: `pnpm schema:lint`,
   `pnpm tickets:coverage`, `pnpm -r run test`, and principal coverage.
3. T049-T051 — PR, merge, roadmap closeout, and F05/F06/F08 hand-off.

---

## Change Log

| Date | Author | Change |
|---|---|---|
| 2026-05-19 | speckit-analyze | T046 post-implementation pass. PASS with 0 CRITICAL, 0 HIGH, 0 MEDIUM. Fixed one LOW data-model edge-count typo inline. |
