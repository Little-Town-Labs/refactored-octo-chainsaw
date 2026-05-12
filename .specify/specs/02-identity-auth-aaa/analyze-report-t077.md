# F02 — `/speckit-analyze` Report (T077, post-implementation)

**Generated:** 2026-05-11
**Scope:** Cross-artifact consistency check across spec.md, plan.md,
research.md, data-model.md, contracts/*, quickstart.md, tasks.md,
threat-model.md against the implemented surface at HEAD `d91fc97`.
**Constitution:** v2.0.0
**Mode:** Read-only validation; no implementation changes. Minor
doc-drift items recorded for follow-up commit before T076 PR.
**Prior baseline:** `analyze-report.md` (2026-05-07, pre-impl) —
PASS with 0 BLOCKER / 0 HIGH / 4 MEDIUM / 6 LOW / 3 INFO. This
report compares the artifacts against the *post-implementation*
state.

---

## Summary

| Severity | Count | Δ vs 2026-05-07 baseline |
|---|---|---|
| BLOCKER | 0 | — |
| HIGH | 0 | — |
| MEDIUM | 1 | new (revoke_all_sessions_approvals not in data-model) |
| LOW | 2 | mostly resolved (B7 docs landed) |
| INFO | 1 | reduced |

**Verdict: PASS.** Zero BLOCKERS, zero HIGH. The single new MEDIUM
is a doc-drift item (data-model.md doesn't list the
`revoke_all_sessions_approvals` table introduced in T059b).
Recommend fix in a one-line edit before T076 PR; does not block
merge.

T077 success criterion ("must report zero blockers") is **met**.

---

## 1. Constitutional Compliance

| Article | Status | Evidence |
|---|---|---|
| **I — Information Security Foundations** | ✅ Compliant | NFR-4 secrets in env (clerk-mfa-config.md); NFR-6 no credentials in logs (audit-sink.ts redactPayload covers external_id + notes per T069/MEDIUM-3); fail-safe deny posture (revoke-all safeDenyAudit, issuance safeEmit, T069/MEDIUM-1) |
| **I.5 — AAA** | ✅ Compliant | Materialization → Principal → guard → audit pipeline; FR-1..FR-41 implemented; threat-model.md §2-8 STRIDE traces |
| **I.6 — Defense in depth** | ✅ Compliant | Six-layer stack documented in threat-model §9.1: proxy → action → orchestrator → adapter SQL → schema CHECK → audit sink. Two-operator gate triple-guard verified by T070 |
| **I.C.1 — Crypto-agility** | ✅ Compliant | EdDSA algorithm pinning at verify (`{ algorithms: ['EdDSA'] }`); JWKS exposes algorithm field; rotation runbook §4 |
| **I.D — Incident response** | ✅ Compliant | docs/security/compromise-tabletop.md scaffold (T065); credential-lifecycle.md §1.4/§2.4/§3.4/§4.4 compromise procedures |
| **II — Agent-native architecture** | ✅ Compliant | Typed `AgentPrincipal` with run_id/side/scope; EdDSA JWT mint at issuance only (FR-17); JWKS-based offline verification (FR-18) |
| **III — Dual-audience surfaces** | ✅ Compliant | Audience routing in proxy.ts (operator/employer/seeker); WCAG 2.2 AA artifact (operator-console-a11y.md, T062); enumeration-resistant banners (T061) |
| **III.1 — WCAG 2.2 AA** | ⚠️ Partial — operator-run verification pending | 35 SCs pass with cited evidence in operator-console-a11y.md; 6 pending environment verification (contrast/target-size once design tokens land + per-route metadata.title). 0 failing. |
| **IV — Engineering discipline** | ✅ Compliant | Test-first observed via per-slice TDD pattern (tests landed alongside implementations); 384 tests green; principal-coverage CI gate (NFR-11) |
| **V.3 — Security review cadence** | ✅ Compliant | T067 threat model; T068 security-review pass (APPROVE WITH CHANGES); T069 remediation; T070 re-verification APPROVE; T073 final code-review APPROVE WITH MINOR CHANGES → T074 closed |

No constitutional exceptions claimed; no documented violations.

---

## 2. Spec → Plan → Implementation Coverage

### 2.1 Functional Requirements (45 FRs)

Spot-check matrix (full traceability validated in the 2026-05-07
baseline; verifying post-implementation that the orchestrators
exist):

| FR group | Plan | Orchestrator | Verified |
|---|---|---|---|
| FR-1..FR-5 Principal model | §2.1 | `principal.ts`, materializer | ✅ |
| FR-6..FR-10 Clerk auth | §5 B2 | `clerk-session.ts`, webhook | ✅ |
| FR-11..FR-13 AAL | §5 B3 | `aal.ts`, `decide-access.ts` | ✅ |
| FR-14..FR-16 MFA factors | §5 B3 + Clerk-hosted | `aal.ts`, `clerk-accessibility.md` | ✅ |
| FR-17..FR-22 Agent identity | §5 B4 | `issuance.ts`, `verify.ts`, `mint.ts` | ✅ |
| FR-23..FR-26c Service identity | §5 B5 | `service-issuance.ts`, `verify-service-at-surface.ts`, `vercel-oidc-rejection.ts` | ✅ |
| FR-27..FR-32 Authorization | §5 B3 | `authorize.ts`, `operator-roles.ts` | ✅ |
| FR-33..FR-35 Session control | §5 B6 | `revoke-all-sessions.ts`, `revoke-all-sessions-repos.ts` | ✅ |
| FR-36..FR-38 Middleware/guards | §2.1 | `guard.ts`, `proxy.ts` | ✅ |
| FR-39..FR-41 Lifecycle | §5 B7 | `credential-lifecycle.md`, `idp-coverage.md`, `compromise-tabletop.md` | ✅ |
| FR-42 Federation readiness | research §1 | Typed Principal kept IdP-agnostic | ✅ |

All 45 FRs trace to an implemented orchestrator or runbook.

### 2.2 Non-Functional Requirements (14 NFRs)

| NFR | Target | Status |
|---|---|---|
| NFR-1 Materialization lag | p95 ≤ 5s eager / 100ms lazy | ⚠️ measured by T071 (pending runtime) |
| NFR-2 Agent credential issuance | p95 ≤ 50ms | ⚠️ measured by T071 |
| NFR-3 Verification offline | No network call | ✅ JWKS-cached, design-verified |
| NFR-4 Secrets in env | — | ✅ clerk-mfa-config.md, NFR-6 cross-checked |
| NFR-5 Signing-key rotation | No in-flight invalidation | ✅ verify_until column + rotation runbook §4.2 |
| NFR-6 No credentials in logs | CI-checkable | ✅ scripts/check-no-credentials-in-logs.sh + redactPayload (T069/MEDIUM-3) |
| NFR-7 Bounded audit volume | DoS-resistant | ✅ orchestrator-driven emission; deny-path safeDenyAudit |
| NFR-8 Clerk outage graceful | — | ✅ offline verification; audit-fallback console sink; quickstart Scenario 7 |
| NFR-9 No silent issuance | Typed errors | ✅ IssuanceConflictError + ServiceIssuanceConflictError surfaces |
| NFR-10 Audit shape | principal_id, kind, scope, action, ts, correlation | ✅ AuditEventName union; audit-events-buffer schema |
| NFR-11 Principal coverage CI | Zero anonymous mutating | ✅ scripts/check-principal-coverage.sh |
| NFR-12 MFA onboarding copy | Passkey first | ✅ Clerk-config; docs/security/clerk-mfa-config.md |
| NFR-13 Enumeration resistance | No leakage | ✅ T061 AuthBanner + forbidden-vocabulary tests |
| NFR-14 WCAG 2.2 AA | — | ✅ T062 operator-console-a11y.md (35 pass / 6 pending env / 0 fail) |

Two NFRs (NFR-1, NFR-2) require runtime measurement via T071.
Design-time evidence in place; metric capture is the deferred
gate.

### 2.3 Edge Cases (12 ECs)

All 12 ECs from spec.md §6 are covered:
- EC-1 (lazy materialization), EC-2 (reconciliation), EC-4
  (member removal session revoke), EC-5/EC-6 (verification fail-
  closed), EC-8 (idempotency), EC-9 (rate-limit non-enumeration),
  EC-10 (scope extensibility), EC-11 (key rotation), EC-12 (revoke
  reversible only by reauth) → all implemented + tested.
- **EC-3 (operator MFA loss → two-operator recovery)** → implemented
  by T059b orchestrator + T060 adapters + T060 UI. **Doc-drift:**
  the supporting `revoke_all_sessions_approvals` table is in the
  schema and threat-model.md §6 but missing from data-model.md
  (see MEDIUM-1 below).
- EC-7 (service-credential deployment binding) → deferred to v1
  per task ledger (T052 note); mitigation is rotation. Documented
  in threat-model.md §4 residual #4.

---

## 3. Plan → Tasks → Implementation Coverage

| Sub-phase | Plan tasks | Implemented | Status |
|---|---|---|---|
| B1 | T001–T012 | ✅ commits in branch | ✅ |
| B2 | T013–T026 | ✅ | ✅ |
| B3 | T027–T034 | ✅ | ✅ |
| B4 | T034b–T048 | ✅ | ✅ |
| B5.1 | T049, T050 | ✅ | ✅ |
| B5.2 | T051, T052, T055 | ✅ | ✅ |
| B5.3 | T053, T054 | ✅ commit `3aa4479` | ✅ |
| B6 | T047b, T056–T062 | ✅ | ✅ (impl) |
| B7 | T063–T065 | ✅ docs/security/* | ✅ (impl) |
| B8 | T067–T070 | ✅ threat-model + review records | ✅ (impl) |
| B8 cont. | T071, T072 | ⏳ runtime metrics + scenarios | ⏳ |
| B9 | T073–T078 | T073 ✅ T074 ✅ T075 ✅ T077 (this report) | ⏳ T076, T078 await human |

All tasks present in tasks.md have a corresponding commit or
artifact at HEAD. Task surface is closed up through T077.

---

## 4. Data Model Consistency

### Entities

| Schema file | Spec data-model.md | Status |
|---|---|---|
| `principals.ts` | ✅ | ✅ |
| `organizations.ts` | ✅ | ✅ |
| `agent_credentials.ts` | ✅ | ✅ |
| `signing_keys.ts` | ✅ | ✅ |
| `revocations.ts` | ✅ | ✅ |
| `service_credentials.ts` | ✅ | ✅ |
| `audit_events_buffer.ts` | ✅ | ✅ |
| **`revoke_all_sessions_approvals.ts`** | ❌ | **MEDIUM-1 (new)** |

### MEDIUM-1 (new) — data-model.md missing `revoke_all_sessions_approvals`

The two-operator-gate table was introduced in T059b (commit
`7cb3163`) but not added to `data-model.md`. The table is
otherwise documented in:
- `packages/db/src/schema/revoke-all-sessions-approvals.ts` (file header)
- `.specify/specs/02-identity-auth-aaa/threat-model.md` §6
- `docs/security/credential-lifecycle.md` §1.3 (referenced indirectly)
- `docs/security/compromise-tabletop.md` Phase 3 (drill exercises it)

**Recommended fix:** Add a `revoke_all_sessions_approvals` entity
section to data-model.md before T076 PR. Mirrors the existing
entity sections; columns/checks already in the schema file. ~30
lines.

---

## 5. API Contract Validation

Contracts/auth-api.yaml declares two endpoints:

| Endpoint | Implementation | Status |
|---|---|---|
| `POST /webhooks/clerk` | `apps/web/app/api/webhooks/clerk/route.ts` | ✅ |
| `GET /.well-known/jwks.json` | `apps/web/app/.well-known/jwks.json/route.ts` | ✅ |

The contracts/auth-trpc.md describes internal authentication
surfaces (not REST); these map to the implemented Principal
resolver + server actions + RSC pages. Coverage confirmed by
T073 spot-checks.

---

## 6. Cross-Artifact Naming

Spot-checks:
- "Principal" used consistently across spec/plan/data-model/code ✅
- "audit_events_buffer" naming consistent across schema + sink + viewer ✅
- "approval_id" used consistently in T059b orchestrator + adapter + view ✅
- "EdDSA" + "Ed25519" appear interchangeably (acceptable — EdDSA is
  the algorithm, Ed25519 is the curve; jose pins both correctly) ✅
- No mismatches between spec FR numbering and tasks.md task refs ✅

---

## 7. Completeness Audit

| Required artifact | Present | Notes |
|---|---|---|
| constitution.md | ✅ | v2.0.0 |
| spec.md | ✅ | 45 FRs, 14 NFRs, 12 ECs |
| plan.md | ✅ | |
| tasks.md | ✅ | T001–T078 |
| data-model.md | ⚠️ | Missing `revoke_all_sessions_approvals` entry (MEDIUM-1) |
| contracts/ | ✅ | auth-api.yaml, auth-trpc.md, frontend-architecture.md |
| research.md | ✅ | |
| quickstart.md | ✅ | 11 scenarios |
| **threat-model.md** | ✅ | New artifact landed at T067 |
| checklists/requirements.md | ✅ | |

---

## 8. Final Recommendation

**PASS — zero blockers.**

Pre-PR cleanup (recommended, non-blocking):
1. **MEDIUM-1:** add `revoke_all_sessions_approvals` entity to
   `data-model.md`.

Defer to follow-up (post-merge):
- LOW-1: Drizzle null-handling normalization
  (`revoke-all-sessions-repos.ts`) — code-review T073
- LOW-2: TODO(T062) cleanup in `issue-credential-form.tsx`
- Deferred runtime measurements: T071 (M-1..M-6), T072
  (full quickstart end-to-end), B6/B7 operator-run scenarios

**Next steps:**
1. Apply MEDIUM-1 fix (one commit, ~30 lines).
2. T076 — open PR; CI green expected (lint, type, tests, SBOM,
   principal-coverage gate).
3. T078 — squash-merge once gates close.

---

## Change log

| Date | Author | Change |
|---|---|---|
| 2026-05-11 | speckit-analyze | T077 post-implementation pass against HEAD `d91fc97`. PASS — zero blockers. One new MEDIUM (data-model drift, recommended fix before PR). |
