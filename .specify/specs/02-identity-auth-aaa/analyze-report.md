# F02 — `/speckit-analyze` Report

**Generated:** 2026-05-07
**Scope:** Cross-artifact consistency check across spec.md v1.2,
plan.md v1.0, research.md v1.0, data-model.md v1.0,
contracts/auth-api.yaml, contracts/auth-trpc.md,
contracts/frontend-architecture.md, quickstart.md, tasks.md v1.0.
**Constitution:** v2.0.0
**Mode:** Read-only. No file writes other than this report.

---

## Summary

| Severity | Count |
|----------|-------|
| BLOCKER  | 0     |
| HIGH     | 0     |
| MEDIUM   | 4     |
| LOW      | 6     |
| INFO     | 3     |

**Verdict:** **PASS.** No blockers; all spec requirements traced to plan,
contract, data-model, quickstart scenario, and at least one task.
MEDIUM and LOW findings are tracked for `/speckit-tasks` follow-up
or B7 documentation; none block proceeding to `/speckit-implement`.

---

## 1. Coverage Matrix

### 1.1 FR → tasks (sampling, full mapping verified)

| FR | Plan section | Contract | Task IDs |
|----|--------------|----------|----------|
| FR-1 | §3 Stack, §4 #1 | trpc §1 | T002, T003 |
| FR-2 | §3 Stack, §4 #1 | trpc §1, api §webhook | T009, T019, T023 |
| FR-3 | §2 | trpc §1 | T002, T003 |
| FR-4 | §2.3 | trpc §3 | T042, T043 |
| FR-6–10 | §2.2, §5 B2 | api §webhook | T013–T026 |
| FR-11–13 | §5 B3 | trpc §2 | T027–T030 |
| FR-15–16 | §5 B3 | — | T027 (Clerk config) |
| FR-17–22 | §2.3, §5 B4 | trpc §3, api §jwks | T035–T048 |
| FR-23–26c | §2.4, §5 B5 | trpc §4 | T049–T055 |
| FR-27–32 | §2.1, §5 B3 | frontend-arch §4 | T031, T032, T033 |
| FR-33–35 | §5 B6 | trpc §2 | T060, T026 |
| FR-36–38 | §2.1 | trpc §0, §guard | T006, T011, T012 |
| FR-39–41 | §5 B7 | — | T063–T065, T057, T058 |
| FR-42 | research §1 (migration door) | trpc §1 (IdP-agnostic) | T002 (typed model) |

All 42+ FRs trace to at least one plan section, contract entry, and task. ✅

### 1.2 NFR → measurement

| NFR | Target | Measured by |
|-----|--------|-------------|
| NFR-1 | guard p50 ≤10ms / p95 ≤30ms | T012 (CI gate) + T071 |
| NFR-2 | verify p95 ≤2ms | T040 benchmark + T071 |
| NFR-3 | session expiry non-blocking | T026 |
| NFR-4 | secrets in F01 manifest | T037 |
| NFR-5 | signing-key rotation grace | T037, T065 |
| NFR-6 | no creds in logs | T011 (lint rule, see L-3 below) |
| NFR-7 | bounded auth-failure event volume | T024 (job + alerting) |
| NFR-8 | graceful Clerk-outage degrade | Quickstart Scenario 7, T071 |
| NFR-9 | explicit issuance/verification failure modes | T040, T042 |
| NFR-10 | structured audit on every privileged action | All implementation tasks (audit-emission invariant) |
| NFR-11 | principal-coverage CI assertion | T011, T012 |
| NFR-12 | passkey-first onboarding copy | T061 |
| NFR-13 | no enumeration | T031, T046, T071 |
| NFR-14 | WCAG 2.2 AA + Clerk attestation | T014, T062 |

All NFRs have a mechanism. ✅

### 1.3 Story → quickstart scenario → task

| Story | Quickstart | Tasks |
|-------|-----------|-------|
| 1 (seeker signup) | Scenario 1 | T013, T015, T016, T019, T021 |
| 2 (employer Org + MFA) | Scenario 2, 9 | T022, T026, T027, T030 |
| 3 (operator + MFA + scopes) | Scenario 3 | T028, T030, T032, T033, T034 |
| 4 (agent credential) | Scenario 4 | T035–T048 |
| 5 (service-to-service) | Scenario 5 | T049–T055 |
| 6 (lifecycle) | Scenario 6 | T037, T045, T058, T063, T065 |
| 7 (single Principal model) | (cross-cutting; CI gate) | T002–T012 |

Every story has an executable scenario and a task chain. ✅

### 1.4 Edge cases → handling

| EC | Mechanism | Task IDs |
|----|-----------|----------|
| EC-1 | Lazy materialization | T019, T021 |
| EC-2 | Reconciliation Inngest job | T024 |
| EC-3 | Out-of-band MFA recovery; two-operator on op-target | T066 |
| EC-4 | Member-removal session revoke | T025, T026 |
| EC-5/6 | Verify/authz fail-closed | T046 |
| EC-7 | Service-cred deployment binding (see M-1 finding) | T052, T055 |
| EC-8 | Idempotency on `(run_id, side, contract_id, contract_version)` | T042, data-model unique idx |
| EC-9 | Clerk rate-limit non-enumerating + telemetry | T031 (gate test), Clerk-side config |
| EC-10 | New-scope additivity | T004, T005 (registry) |
| EC-11 | JWKS old-`kid` retention until last expiry | T037, T038 |
| EC-12 | Revoke-all-sessions audit + reauth-only undo | T060 |

All 12 ECs have at least one task. ✅

---

## 2. Findings

### MEDIUM

**M-1.** EC-7 ("service credential leaked + used from outside its
deployment") is partially implemented. `service_credentials` schema
records `service_version` on the principal but no
`deployment_binding` claim is checked at verify time. The spec says
"if credential carries deployment-binding metadata, mismatched usage
is rejected; if not, the response is rotation per the documented
procedure." Plan adopts the latter (rotation), but tasks don't
explicitly call out the choice.
*Recommendation.* Add a one-line note to T052 / T055 confirming v0
relies on rotation, not deployment-binding enforcement; defer the
binding to a v1 hardening pass.

**M-2.** Reconciliation cadence threshold (EC-2) is mentioned in
plan §12 Q1 (default: 5-minute cadence; alert if drift > 0 for >15
min) but is not encoded in T024's acceptance criteria.
*Recommendation.* Refine T024 acceptance to name the cadence and the
alert threshold explicitly.

**M-3.** plan §10 lists "F08.5 not ready when agent issuance lands"
as a Med/Low risk. F02 publishes a verifier helper (T041) consumable
today, but the contract between F02 and F08.5 is described in
auth-trpc.md only by reference. There is no explicit interface
package or shared types file named.
*Recommendation.* Confirm in B4 that the verifier helper is exported
from `packages/auth/src/verifier/` with stable types F08.5 imports
unchanged.

**M-4.** Operator-console kill-switch placement (plan §12 Q5).
F06 owns kill switches; F02 only views audit events. The spec
appropriately scopes this out (§1.2 Out of scope). The risk is that
B6's audit viewer may be misread as a control surface during review.
*Recommendation.* T059 acceptance criteria should note explicitly:
"viewer is read-only; no kill-switch action surface in v0."

### LOW

**L-1.** `auth-api.yaml` covers Clerk webhook + JWKS only (per design
decision). Make sure `/speckit-tasks` consumers know that REST is
deliberately limited and tRPC is the in-app surface; this is in
plan §3 but not in tasks.md.

**L-2.** Tasks T042, T044 list performance gates; the actual
benchmark harness isn't named. Convention from F01 was Vitest's
`bench` mode. State that explicitly so implementers don't reinvent.

**L-3.** NFR-6 ("no credentials in logs") is mapped to T011 (CI
gate) but the spec describes it as "a CI-checkable lint rule or
test." T011's current scope is the principal-coverage gate. Suggest
splitting into T011a (principal coverage) and T011b (no-credentials
lint rule) to make the assertion explicit.

**L-4.** PRD draft version is "Draft v0.1, 2026-05-05" and was
clarified-then-reverted on 2026-05-07. The PRD itself is unchanged,
but the resolved-clarifications log in spec §8 references PRD §3.4
amendment 2026-05-07 inside CL-1's history, then notes "PRD impact:
None" for the final decision. Reader-friendly clarity could be
improved by labeling the rejected option more prominently.

**L-5.** quickstart.md prerequisites mention a "test contract
`test-contract-v1`" used in Scenario 4. F07a (Agent Contract
Registry) does not yet exist. Either ship a fixture-only stub in
B4 or document that Scenario 4 will be re-validated against the
real registry once F07a lands. Recommend the former.

**L-6.** Two-operator step for op-target session revoke (T066) is
in B7, but B6 already builds the operator console. If a B6 reviewer
exercises revoke-all-sessions during testing without the gate, the
test will succeed without the safety check. Recommend moving T066
into B6 as a prerequisite to T060, or explicitly scoping T060's
revoke-all to non-operator targets only.

### INFO

**I-1.** All Constitution articles cited in spec/plan are present
and aligned with v2.0.0. No drift detected.

**I-2.** Tasks total 78. F01 had 39 tasks for similar Phase-A
complexity (M); F02's higher count reflects the cross-cutting
nature of auth and the test-first requirement on guards/JWT mint/
revocation.

**I-3.** Worktree isolation per `~/.claude/rules/git-workflow.md`
is appropriate for B4 and B7 (signing-key bootstrap, drill).
Implementers should use `isolation: "worktree"` for those phases.

---

## 3. Constitutional Compliance

| Article | Status |
|---------|--------|
| §I.5.1 Authentication | ✅ All FRs traced |
| §I.5.2 Authorization | ✅ Single guard surface (FR-27) + zero-trust (FR-29) traced |
| §I.5.3 Accountability | ✅ Audit-emission invariant on all impl tasks; principal_id in every event |
| §I.6 Defense-in-Depth | ✅ Fail-safe deny (FR-28); short TTL + revocation list (FR-21); webhook signature (T022); no shared platform secret (FR-26) |
| §I.A.* (regulatory) | n/a (F02 doesn't ship policy gates) |
| §I.C.1 Crypto-agility | ✅ EdDSA pinned, registry shape (Decision 4) |
| §I.D Forensic readiness | ✅ Audit buffer table; `/security-review` mandatory at B8 |
| §II Agent-Native | ✅ Agent identity is first-class `Principal.kind` (FR-17–22) |
| §III.1 WCAG 2.2 AA | ✅ T062 + Clerk attestation (T014) |
| §III.3 Contract evolution | ✅ Scope registry additive (FR-31); migration door (FR-2) |
| §V.3 `/security-review` mandatory | ✅ T068 at B8 gate |

No exceptions claimed. ✅

---

## 4. Recommendations Before `/speckit-implement`

1. **Apply L-3** (split T011 into a + b) and **M-1, M-2, M-4**
   (refine acceptance criteria for T024, T052/T055, T059) before
   beginning implementation. These are 5-minute edits to
   `tasks.md` and reduce review friction at PR time.
2. **Apply L-6** (move T066 into B6 or scope T060) — also a
   5-minute edit, prevents a real testing gap.
3. **Apply L-5** (decide fixture-stub vs. defer Scenario 4) so
   B4 implementers don't block on F07a.
4. **L-1, L-2, L-4** are documentation polish; defer to B7.

After these touch-ups, `/speckit-implement` is unblocked.

---

## 5. Decision

**Proceed to `/speckit-implement`** after applying the four
5-minute touch-ups above (or accept them as known carry-overs into
B6/B7 — the implementer's call).

No BLOCKER or HIGH findings. The artifact set is internally
consistent and constitutionally compliant.
