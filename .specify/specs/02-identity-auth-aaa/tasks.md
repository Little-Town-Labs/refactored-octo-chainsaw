# F02 — Tasks

**Spec:** v1.2 · **Plan:** v1.0 · **Research:** v1.0
**Tasks version:** 1.1 (analyze-report touch-ups applied 2026-05-07)
**Date:** 2026-05-07
**Branch:** `02-identity-auth-aaa`

---

## How to read this file

Tasks are grouped by plan sub-phase (B1–B9). Each task has:

- **ID** (`T###`) — stable; referenced from PR titles and commits.
- **Title** — imperative, one line.
- **Description** — what to do, in 1–3 sentences.
- **Acceptance** — measurable; how to verify "done."
- **Refs** — spec FRs/NFRs/stories/EC satisfied; or plan §.
- **Story tag** — primary user story served (per spec §3).
- **Blocks / Blocked by** — dependency edges.
- **Effort** — XS (≤1h), S (1–3h), M (3–6h), L (6–12h).

**Parallel execution:** Tasks within the same sub-phase that don't
depend on each other can run in parallel. Cross-phase parallelism is
explicit in `Blocks / Blocked by`.

**TDD discipline:** Per `~/.claude/rules/testing.md`, write the test
or CI assertion *before* the implementation that satisfies it. Tasks
named `…test` or `…gate` ship before the matching implementation
task.

---

## Sub-phase B1 — `packages/auth` skeleton + Principal model

| ID   | Title                                                                | Effort | Blocks       | Blocked by | Story | Refs |
|------|----------------------------------------------------------------------|--------|--------------|------------|-------|------|
| T001 | Create `packages/auth` package skeleton                              | S      | T002–T010    | —          | 7     | FR-1, plan §2.1 |
| T002 | Define `Principal` discriminated union (test-first)                  | S      | T003+        | T001       | 7     | FR-1, FR-2, FR-3, FR-4, FR-5 |
| T003 | Implement `Principal` types and helpers                              | S      | T004, T011   | T002       | 7     | FR-1–5 |
| T004 | Define scope registry contract (test-first)                          | XS     | T005, T030   | T003       | 7     | FR-30, FR-31, FR-32 |
| T005 | Implement scope registry                                             | XS     | T006         | T004       | 7     | FR-30–32 |
| T006 | `getPrincipal()` and `withPrincipal()` API stubs (compile-only)      | S      | T007, T020   | T003, T005 | 7     | FR-36, FR-37 |
| T007 | Tests for `withPrincipal` typed-rejection (compile-time + runtime)   | S      | T008         | T006       | 7     | FR-37, NFR-11 |
| T008 | Implement `withPrincipal` runtime (against fake principals)          | S      | T009         | T007       | 7     | FR-37 |
| T009 | Drizzle schema files: `principals`, `organizations` (test-first)     | M      | T010, T013   | T001       | 1, 2  | data-model §principals, §organizations |
| T010 | Migration: principals + organizations                                 | S      | T013         | T009       | 1, 2  | data-model |
| T011a | CI gate: principal-coverage assertion (script + test fixture)        | M      | T012         | T006       | 7     | NFR-11, M-1, plan Decision 8 |
| T011b | CI gate: no-credentials-in-logs lint rule + test fixture              | S      | T012         | T006       | 7     | NFR-6 |
| T012 | Wire principal-coverage + no-creds gates into CI (`.github/workflows/ci.yml`) | S | — | T011a, T011b | 7 | NFR-6, NFR-11 |

**B1 gate.** Type-check passes; `withPrincipal` rejects calls without
a typed principal at compile time; CI gate green on empty repo;
schema migrations apply cleanly to a fresh Neon dev branch.

---

## Sub-phase B2 — Clerk integration + webhook reconciler

| ID   | Title                                                                  | Effort | Blocks       | Blocked by | Story | Refs |
|------|------------------------------------------------------------------------|--------|--------------|------------|-------|------|
| T013 | Pin Clerk SDK version in `packages/auth/package.json`                   | XS     | T014         | T010       | 1     | FR-6, plan Decision 9 |
| T014 | Document Clerk accessibility attestation (`docs/security/clerk-accessibility.md`) | XS | — | T013 | 7 | NFR-14 |
| T015 | Create route groups `(seeker)`, `(employer)`, `(operator)` with stub layouts | S | T016, T020 | T013 | 1, 2, 3 | plan §2.1 |
| T016 | Mount Clerk catch-all `sign-in/[[...rest]]` per group                   | S      | T017         | T015       | 1, 2  | FR-6 |
| T017 | Tests: route group audience gating (404 for operator non-match)        | M      | T018         | T016       | 3     | FR-9 |
| T018 | Implement `proxy.ts` (Next.js 16 middleware) — Clerk session resolution | M     | T019         | T017       | 1, 2, 3 | FR-29, FR-36 |
| T019 | Implement `materializePrincipal` (eager + lazy paths) with tests       | M      | T021, T024   | T018, T010 | 1     | FR-2, EC-1 |
| T020 | `<PrincipalProvider>` (server component + client projection)           | S      | T021         | T006, T015 | 7     | FR-37, frontend-arch |
| T021 | Tests: lazy materialization on first authenticated request             | M      | T022         | T019, T020 | 1     | EC-1, Quickstart Scenario 1 |
| T022 | Clerk webhook handler (Svix-verified) at `app/api/webhooks/clerk/`     | M      | T023         | T010, T013 | 1, 2  | FR-6, FR-7, plan Decision 5 |
| T023 | Tests: Clerk webhook idempotency + signature verification              | M      | T024         | T022       | 1, 2  | FR-2, EC-1, EC-2 |
| T024 | Reconciliation Inngest job — 5-min cadence; alert if drift > 0 sustained > 15 min (EC-2) | S | — | T019, T022 | 1 | EC-2, plan §12 Q1 |
| T025 | Tests: member-removal session revocation (≤60s)                        | M      | T026         | T022       | 2     | FR-34, Quickstart Scenario 9 |
| T026 | Implement member-removal session revocation                             | M      | —            | T025       | 2     | FR-34 |

**B2 gate.** Quickstart Scenarios 1, 2, and 9 pass.

---

## Sub-phase B3 — MFA + role/scope gates

| ID   | Title                                                                | Effort | Blocks  | Blocked by | Story | Refs |
|------|----------------------------------------------------------------------|--------|---------|------------|-------|------|
| T027 | Configure Clerk dev/staging/prod for AAL2 (TOTP + WebAuthn + SMS-fallback) | S | T028 | T013 | 2, 3 | FR-11, FR-15, FR-16 |
| T028 | Pre-create "Spyglass Operators" restricted Org per environment        | S      | T029    | T027       | 3     | FR-9 |
| T029 | Tests: AAL2 enforcement on operator + employer-admin entries          | M      | T030    | T028       | 2, 3  | FR-11, FR-12, FR-13 |
| T030 | Implement AAL2 gate in route group layouts                            | S      | T031    | T020, T029 | 2, 3  | FR-11–13 |
| T031 | Tests: `requireRole` and `requireScope` declarative guards            | M      | T032    | T005, T008 | 3, 7  | FR-27, FR-28, FR-30 |
| T032 | Implement `requireRole` / `requireScope` server helpers + `<RequireScope>` cosmetic client component | M | T033 | T031 | 3, 7 | FR-27–32 |
| T033 | Operator role registry: dossier-viewer, policy-gate-operator, credential-issuer | S | T053 | T032 | 3 | FR-32 |
| T034 | Tests: operator URL returns 404 (not 403) for non-operators           | S      | —       | T030       | 3     | FR-9 |

**B3 gate.** Quickstart Scenario 3 passes; CI gate still green;
operator URL is 404 to non-operators.

---

## Sub-phase B4 — Agent-credential issuance + JWKS

| ID   | Title                                                                | Effort | Blocks   | Blocked by | Story | Refs |
|------|----------------------------------------------------------------------|--------|----------|------------|-------|------|
| T034b | Test-fixture stub for `test-contract-v1` (F07a not ready yet; ship a fixture-only stub for B4/B8 tests, replaced when F07a lands) | XS | T040 | — | 4 | quickstart §Setup, plan §10 |
| T035 | Drizzle schema: `signing_keys`, `agent_credentials`, `revocations`    | M      | T036     | T010       | 4     | data-model |
| T036 | Migration for B4 tables                                               | S      | T037     | T035       | 4     | data-model |
| T037 | Bootstrap script: generate first EdDSA keypair, write to env manifest | M      | T038     | T036       | 4, 6  | plan Decision 4 |
| T038 | Tests: JWKS endpoint returns active + verify-only keys                | S      | T039     | T037       | 4     | EC-11, plan §7 |
| T039 | Implement `app/.well-known/jwks.json/route.ts`                        | S      | T046     | T038       | 4     | NFR-2 |
| T040 | Tests: EdDSA mint/verify round-trip + p95 ≤2ms benchmark              | M      | T041     | T037       | 4     | NFR-2 |
| T041 | Implement `packages/auth/src/issuer/` (mint) and `verifier/` (verify) | M      | T042     | T040       | 4     | FR-18 |
| T042 | Tests: `auth.agentCredentials.issue` idempotency (EC-8)               | M      | T043     | T041       | 4     | EC-8, FR-19, FR-20 |
| T043 | Implement `auth.agentCredentials.issue` tRPC procedure                | M      | T044, T045 | T042     | 4     | FR-17, FR-19, FR-20 |
| T044 | Tests: revocation propagation ≤60s                                    | M      | T045     | T043       | 4, 6  | FR-21 |
| T045 | Implement `auth.agentCredentials.revoke` + `revocations` write path    | M      | T046     | T044       | 4, 6  | FR-21 |
| T046 | Tests: scope-mismatch fails closed; emits audit event                 | S      | T047     | T043, T045 | 4     | EC-5, EC-6, FR-22 |
| T047 | Implement `auth.agentCredentials.listForRun`, `listRevoked`           | S      | T048     | T045       | 6     | plan contracts/auth-trpc |
| T048 | Inngest job: prune expired rows from `revocations` daily              | S      | —        | T045       | 4     | data-model §revocations |

**B4 gate.** Quickstart Scenario 4 passes; verify p95 ≤2ms;
issuance p95 ≤50ms warm.

---

## Sub-phase B5 — Service-credential issuance + bootstrap exchange

| ID   | Title                                                                | Effort | Blocks  | Blocked by | Story | Refs |
|------|----------------------------------------------------------------------|--------|---------|------------|-------|------|
| T049 | Drizzle schema: `service_credentials`                                 | S      | T050    | T010       | 5     | data-model |
| T050 | Migration for `service_credentials`                                   | XS     | T051    | T049       | 5     | data-model |
| T051 | Tests: deploy-bootstrap exchange (one-shot env secret → service principal) | M | T052 | T050 | 5 | FR-26, FR-26a |
| T052 | Implement bootstrap-exchange handler + rotation. Note: v0 relies on rotation (not deployment-binding enforcement) for EC-7; binding deferred to v1. | M | T053 | T051 | 5, 6 | FR-25, FR-26a, EC-7 |
| T053 | Tests: Vercel-OIDC-on-in-app-service-surface rejection                | S      | T054    | T032, T052 | 5     | FR-26c |
| T054 | Implement Vercel-OIDC-rejection guard                                  | XS     | —       | T053       | 5     | FR-26b, FR-26c |
| T055 | Tests: service-credential rotation without deploy                      | S      | —       | T052       | 5, 6  | FR-25, NFR-5 |

**B5 gate.** Quickstart Scenario 5 passes.

---

## Sub-phase B6 — Operator console UI

| ID   | Title                                                                | Effort | Blocks  | Blocked by | Story | Refs |
|------|----------------------------------------------------------------------|--------|---------|------------|-------|------|
| T056 | Operator credentials list page (`/operator/credentials`)             | M      | T057    | T030, T047 | 3     | frontend-arch §6 |
| T057 | Operator credential issue form (manual / emergency path)             | M      | T058    | T056, T043 | 3, 6  | FR-41, frontend-arch §6 |
| T058 | Operator credential revoke action                                     | S      | T059    | T056, T045 | 3, 6  | FR-41 |
| T059 | Audit-event viewer (`/operator/audit`) — searchParams pagination; **read-only**, no kill-switch action surface in v0 (F06 owns) | M | T060 | T030 | 3 | NFR-10, plan §12 Q4, spec §1.2 |
| T059b | Two-operator step required for `revokeAllSessionsForPrincipal` against operator targets (EC-3) | S | T060 | T032 | 3, 6 | EC-3, plan §12 Q2 |
| T060 | Sign-out confirmation component (all-devices option for operator/admin; revoke-all on op target requires two-operator gate from T059b) | S | T061 | T020, T059b | 2, 3 | FR-35 |
| T061 | MFA-step banners (non-enumerating copy)                                | S      | T062    | T030       | 2, 3  | NFR-13, NFR-12 |
| T062 | WCAG 2.2 AA verification checklist for operator console pages         | M      | —       | T056–T061  | 3     | NFR-14, §III.1 |

**B6 gate.** Quickstart Scenarios 7, 10 pass; manual a11y review
completed and recorded.

---

## Sub-phase B7 — Lifecycle runbooks + compromise drill

| ID   | Title                                                                | Effort | Blocks  | Blocked by | Story | Refs |
|------|----------------------------------------------------------------------|--------|---------|------------|-------|------|
| T063 | `docs/security/credential-lifecycle.md` (issuance, rotation, revocation, compromise) | M | T064 | — | 6 | FR-39, FR-40 |
| T064 | `docs/security/idp-coverage.md` (FR-15/FR-16 verifier coverage)       | XS     | T065    | T063       | 6     | FR-15, FR-16 |
| T065 | Compromise tabletop drill — execute and record output                 | M      | —       | T063, T056 | 6     | FR-39 |

**B7 gate.** Quickstart Scenario 6 passes; runbooks reviewed by Gary.

---

## Sub-phase B8 — `/security-review` + threat model

| ID   | Title                                                                | Effort | Blocks  | Blocked by | Story | Refs |
|------|----------------------------------------------------------------------|--------|---------|------------|-------|------|
| T067 | Threat model document (STRIDE) at `.specify/specs/02-identity-auth-aaa/threat-model.md` | M | T068 | T056–T065 | — | Constitution §V.3 |
| T068 | Run `/security-review` agent against full F02 surface                 | L      | T069    | T067       | —     | Constitution §V.3, Roadmap §573 |
| T069 | Address CRITICAL/HIGH findings from `/security-review`                | L      | T070    | T068       | —     | Constitution §V.3 |
| T070 | Re-run `/security-review` after fixes; record clean output            | S      | T071    | T069       | —     | Constitution §V.3 |
| T071 | Measure success metrics M-1 through M-6 against the running build     | M      | T072    | T056–T065  | —     | spec §7 |
| T072 | Run all 10 quickstart scenarios end-to-end; record results            | M      | —       | T068       | —     | quickstart |

**B8 gate.** `/security-review` clean; all metrics on target; all
quickstart scenarios pass.

---

## Sub-phase B9 — `/code-review`, `/simplify`, merge

| ID   | Title                                                                | Effort | Blocks  | Blocked by | Story | Refs |
|------|----------------------------------------------------------------------|--------|---------|------------|-------|------|
| T073 | Run `/code-review` agent on full F02 diff                             | M      | T074    | T072       | —     | global rule |
| T074 | Address CRITICAL/HIGH issues from `/code-review`                      | M      | T075    | T073       | —     | global rule |
| T075 | Run `/simplify` on changed files                                      | S      | T076    | T074       | —     | global rule |
| T076 | Open PR; ensure full CI green (lint, type, tests, SBOM, scans, principal-coverage gate) | M | T077 | T075 | — | global CI |
| T077 | `/speckit-analyze` on final state — must report zero blockers         | XS     | T078    | T076       | —     | speckit phase 7 |
| T078 | Squash-merge to `main`                                                | XS     | —       | T077       | —     | git workflow |

**B9 gate.** PR merged; F02 closed.

---

## Effort summary

| Sub-phase | Tasks | Estimated effort |
|-----------|-------|------------------|
| B1 | 13 | ~2 days |
| B2 | 14 | ~3 days |
| B3 | 8 | ~2 days |
| B4 | 15 | ~4 days |
| B5 | 7 | ~2 days |
| B6 | 8 | ~3 days |
| B7 | 3 | ~1 day |
| B8 | 6 | 2–3 days |
| B9 | 6 | 0.5–1 day |
| **Total** | **80** | **~3 weeks** |

---

## Cross-task notes

- **TDD invariant.** For every numbered "Tests: …" task, the test
  ships in the same commit as (or before) the implementation task it
  precedes. Per `~/.claude/rules/verification.md`, no implementation
  task is marked complete until its tests pass.
- **Audit emission tasks are implicit.** Every implementation task
  that mutates state must emit the audit event named in
  `contracts/auth-trpc.md`. Reviewers verify on PR.
- **Performance gates run in CI.** T040, T044's targets (NFR-1/2)
  are CI-asserted, not just local-checked.
- **`/security-review` runs at B8 gate**, not at end. This catches
  HIGH issues earlier than B9 and gives time to address them before
  merge.

---

## Document provenance

- spec.md v1.2
- plan.md v1.0
- research.md v1.0
- data-model.md v1.0
- contracts/auth-api.yaml
- contracts/auth-trpc.md
- contracts/frontend-architecture.md
- quickstart.md
