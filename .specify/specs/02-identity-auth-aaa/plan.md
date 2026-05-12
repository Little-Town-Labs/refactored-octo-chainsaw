# F02 — Implementation Plan

**Feature ID:** F02
**Slug:** `02-identity-auth-aaa`
**Branch:** `02-identity-auth-aaa`
**Plan version:** 1.0
**Spec version:** 1.2
**Date:** 2026-05-07
**Owner:** Gary
**Constitution refs:** v2.0.0 §I.5, §I.6, §I.C.1, §II, §III.1, §III.3
**Roadmap:** `.specify/roadmap.md` v1.1.0 (F02 row, Phase A)
**Companion artifacts:**
- `spec.md` — what we're building (WHAT)
- `research.md` — technology decisions and rationale
- `data-model.md` — Drizzle schema for auth tables
- `contracts/auth-api.yaml` — REST surfaces (Clerk webhook, JWKS)
- `contracts/auth-trpc.md` — tRPC routers (in-app)
- `contracts/frontend-architecture.md` — React/Next.js shape
- `quickstart.md` — validation scenarios

---

## 1. Executive Summary

F02 establishes the **AAA primitives** (Authentication, Authorization,
Accountability) for every actor that will touch Spyglass: human
seekers, employer admins/members, operators, hosted Parley agents, and
platform services. It is the gate every later feature passes through —
no F04+ feature ships without a verified `Principal` attached to its
mutations.

**Architecture in one paragraph.** Clerk hosts all human signup, login,
MFA, password reset, and profile UIs. Spyglass mirrors Clerk users into
a `principals` table via signed webhooks (with a lazy materialization
fallback). A typed `Principal` model in `packages/auth` is the single
authentication-result object every Next.js route, tRPC procedure, and
Inngest function consumes. Hosted agent credentials are EdDSA-signed
JWTs minted at run dispatch by F02's tRPC issuer, verified offline by
F08.5 against a published JWKS endpoint, with TTL ≤30 min plus a
revocation list for mid-credential revocation. Service-to-service calls
present F02-issued JWTs; Vercel OIDC tokens are accepted only at the
deploy boundary and never promoted to in-app service principals. The
`Principal` model is **IdP-agnostic by construction** so a future
migration or split (e.g., to Neon Auth on the seeker side) is
tractable without consumer changes.

---

## 2. Architecture Overview

### 2.1 Component Layout

```
apps/web/                                Next.js 16 App Router
├── proxy.ts                             auth middleware (Next 16 proxy)
├── app/
│   ├── (seeker)/                        seeker route group
│   │   ├── layout.tsx                   <PrincipalProvider tier="seeker">
│   │   ├── sign-in/[[...rest]]/         Clerk catch-all (hosted UI)
│   │   └── sign-up/[[...rest]]/
│   ├── (employer)/                      employer route group
│   │   ├── layout.tsx                   <PrincipalProvider> + AAL2 gate
│   │   └── sign-in/[[...rest]]/
│   ├── (operator)/                      operator route group (hidden)
│   │   ├── layout.tsx                   <PrincipalProvider> + AAL2 + role gate
│   │   ├── sign-in/[[...rest]]/         Clerk catch-all, restricted Org
│   │   ├── credentials/                 issue/list/revoke agent creds
│   │   └── audit/                       audit-event viewer
│   ├── api/
│   │   ├── webhooks/clerk/route.ts      Svix-verified webhook ingress
│   │   └── trpc/[trpc]/route.ts         tRPC handler
│   └── .well-known/
│       └── jwks.json/route.ts           public JWKS

packages/
├── auth/                                THIS FEATURE owns this package
│   ├── src/
│   │   ├── principal.ts                 Principal type + discriminators
│   │   ├── guard.ts                     getPrincipal(), withPrincipal()
│   │   ├── scopes.ts                    scope registry (additive)
│   │   ├── issuer/                      EdDSA JWT mint
│   │   ├── verifier/                    JWT verify (used by F08.5)
│   │   ├── revocation.ts                live revocation list
│   │   ├── webhook/                     Clerk → principals reconciler
│   │   └── trpc/                        F02's tRPC routers
│   └── package.json                     name: @spyglass/auth
├── audit-events/                        F02 emits; F05 will consume
│   └── src/
│       ├── event-types.ts               typed event names
│       └── sink.ts                      buffer-table sink (v0)
└── db/                                  F03 owns; F02 contributes tables
    └── src/schema/
        ├── principals.ts
        ├── organizations.ts
        ├── agent-credentials.ts
        ├── service-credentials.ts
        ├── signing-keys.ts
        ├── revocations.ts
        └── audit-events-buffer.ts
```

### 2.2 Data Flow — Human Authentication

1. User loads any Spyglass URL.
2. Next.js `proxy.ts` runs Clerk's session resolver.
3. `materializePrincipal()` looks up `principals` by `(external_idp, external_id)`. If missing, lazy-creates the row (EC-1) and emits `principal.materialized`.
4. The audience gate verifies the principal's tier matches the route group; mismatch → 404 for operator (FR-9 hidden surface) or 403 elsewhere.
5. Typed `Principal` is stamped onto request headers and consumed by the RSC tree via `getPrincipal()` (memoized per request via `React.cache`).

### 2.3 Data Flow — Hosted Agent Credential

1. Parley dispatcher (F08) calls `auth.agentCredentials.issue` with `(run_id, side, contract_id, contract_version, ticket_id, scope_set)` over a service-trusted tRPC channel.
2. Issuer checks idempotency on `(run_id, side, contract_id, contract_version)`; on hit, returns conflict (no JWT rebroadcast — see API design summary).
3. Issuer mints EdDSA-signed JWT using the active `signing_keys` row for `purpose='agent'`. Persists `agent_credentials` metadata.
4. F08.5 receives the JWT, verifies offline against JWKS, and consults the revocation list at cross-process refresh boundaries.
5. On revocation, F02 inserts into `revocations`; the next refresh sees it.

### 2.4 Data Flow — Service-to-Service

1. At deploy bootstrap, each service exchanges a one-shot env-manifest secret with F02 for an initial service credential. The bootstrap secret is rotated on every deploy.
2. Inter-service calls present the JWT in the `Authorization` header.
3. Receiving service's guard verifies offline and authorizes scope.

---

## 3. Technology Stack

(Full rationale in `research.md`.)

| Concern | Choice | Why |
|---------|--------|-----|
| IdP for humans | **Clerk** (all four audiences; operators in restricted Org) | PRD §6.1 commits it; Phase 0 volume doesn't justify a split |
| Agent credential format | **Signed JWT, EdDSA (Ed25519)** | Offline verify; small signature; <2ms p95 |
| Service identity | **F02-issued JWT (in-app), Vercel OIDC at deploy boundary only** | Single trust anchor in-app; platform tokens stay platform-scoped |
| Crypto library | **`jose` (panva/jose, MIT)** | Mature; works on any runtime; standard JWKS support |
| Webhook signature | **Svix** | Clerk's standard; HMAC SHA-256 |
| ORM | **Drizzle** (PRD §7) | Type-safe; matches Neon Postgres |
| RPC | **tRPC** in-app, **REST** for webhooks/JWKS only | PRD §7 commits tRPC; REST is for external producers |
| Signing-key storage | **Vercel env-var scope** (v0); KMS deferred | Constitution §I.C.1 sanctioned; KMS is a v1+ option |
| Audit-event delivery | **`packages/audit-events` → buffer table → F05 later** | Decouples F02 from F05 readiness |

---

## 4. Technical Decisions Log

Numbered for traceability; full pros/cons in `research.md`.

| # | Decision | Chosen | Article it satisfies |
|---|----------|--------|----------------------|
| 1 | Human IdP | Clerk-only | §I.5.1, PRD §6.1 |
| 2 | Agent credential format | Signed JWT, EdDSA | §I.5.1, §I.C.1 |
| 3 | Service identity | Hybrid (F02 anchor + Vercel OIDC at boundary) | §I.5.1, §I.5.2 |
| 4 | Signing-key storage | Vercel env-var scope (v0) | §I.C.1 (sanctioned alternative) |
| 5 | Webhook verification | Svix | §I.6 (no rolling our own) |
| 6 | Audit emission | Local typed event bus → buffer table → F05 sink later | §I.D, §I.5.3 |
| 7 | Schema ownership | F02 contributes auth tables to F03's umbrella | F02/F03 are co-Phase-A |
| 8 | Principal-coverage CI gate | Type-level marker + grep gate | NFR-11 |
| 9 | Clerk version pinning | Pin patch version + accessibility attestation file | NFR-14, §III.1 |

---

## 5. Implementation Phases

Phase boundaries are spec-driven, not time-boxed. Each phase has a
gate; the next phase does not start until the gate passes.

### Phase B1 — `packages/auth` skeleton + Principal model

**Outputs.**
- `packages/auth` scaffolded with the Drizzle schema files (under `packages/db/src/schema/`).
- `Principal` type, discriminators, scope registry.
- `getPrincipal()` / `withPrincipal()` API contracts (no Clerk integration yet — stubs against fake principals for testing).
- The "principal coverage" CI gate wired up against the empty surface.

**Gate.** Type-check passes; `withPrincipal` rejects calls without a typed principal at compile time; CI gate is green on a known-empty repo.

### Phase B2 — Clerk integration + webhook reconciler

**Outputs.**
- Clerk SDK pinned in `packages/auth`; route groups created.
- Next.js `proxy.ts` wires Clerk session resolution + `materializePrincipal`.
- `app/api/webhooks/clerk/route.ts` Svix-verified webhook handler.
- Migrations: `principals`, `organizations`.
- Lazy materialization path (EC-1) with audit event.

**Gate.** Quickstart Scenarios 1, 2, and 9 pass.

### Phase B3 — MFA + role/scope gates

**Outputs.**
- Operator route group with hidden sign-in surface (404 to non-operators).
- AAL2 enforcement on operator + employer-admin entries.
- `requireRole`, `requireScope` declarative guards.
- Operator role registry (dossier-viewer, policy-gate-operator, credential-issuer).

**Gate.** Quickstart Scenario 3 passes; CI gate still green.

### Phase B4 — Agent-credential issuance + JWKS

**Outputs.**
- `signing_keys` table + bootstrap script that generates the first EdDSA keypair into Vercel env scope.
- `auth.agentCredentials.issue`, `revoke`, `listForRun`, `listRevoked` tRPC procedures.
- `app/.well-known/jwks.json/route.ts` published.
- `revocations` table + Inngest cleanup job.
- Verifier helper (consumed later by F08.5).

**Gate.** Quickstart Scenario 4 passes; verification offline benchmark ≤2ms p95.

### Phase B5 — Service-credential issuance + bootstrap exchange

**Outputs.**
- `auth.serviceCredentials.issue` and rotation procedure.
- Deploy-time bootstrap exchange (env-manifest secret → service principal).
- Vercel-OIDC-rejection guard on in-app service surfaces (FR-26c).

**Gate.** Quickstart Scenario 5 passes.

### Phase B6 — Operator console UI

**Outputs.**
- Credentials list / issue / revoke pages.
- Audit-event viewer page.
- Sign-out confirmation; MFA-step banners.
- WCAG 2.2 AA verification checklist completed.

**Gate.** Quickstart Scenarios 7, 10 pass; manual a11y review completed.

### Phase B7 — Lifecycle runbooks + compromise drill

**Outputs.**
- `docs/security/credential-lifecycle.md` (rotation, revocation, compromise).
- `docs/security/clerk-accessibility.md` (NFR-14 paper trail).
- `docs/security/idp-coverage.md` (FR-15/FR-16 verifier coverage).
- Tabletop compromise drill executed; output recorded.

**Gate.** Quickstart Scenario 6 passes; runbooks reviewed by Gary.

### Phase B8 — `/security-review` + threat model

**Outputs.**
- `/security-review` agent run; CRITICAL/HIGH findings addressed.
- Threat model document (STRIDE or equivalent) at `.specify/specs/02-identity-auth-aaa/threat-model.md`.
- All 10 quickstart scenarios passing.
- M-1 through M-6 success metrics measured.

**Gate.** Mandatory per Constitution §V.3. No merge without it.

### Phase B9 — Merge

PR opened, full Phase A6-class CI green (lint, type-check, tests, SBOM,
secret scan, dependency audit, principal-coverage gate). `/code-review`
agent run. Squash-merge to `main`.

---

## 6. Security Considerations

### 6.1 Threat Vectors and Mitigations

| Threat | Mitigation |
|--------|-----------|
| **Credential exfiltration** (Clerk session, agent JWT, service JWT) | Vercel env-var scope only (FR-17); no logs of credentials (NFR-6); short TTL on agent/service (FR-20); revocation list for mid-flight (FR-21) |
| **Privilege escalation via scope inflation** | Scope set is fixed at issuance (FR-19); no API to expand a credential's scope; type-level enforcement via `requireScope` |
| **Webhook spoofing** | Svix signature verification on every inbound (Decision 5) |
| **Replay** | Svix replay window (≤5 min); JWT `iat`/`exp` claims; correlation IDs in audit events |
| **Enumeration** | Stable, generic error codes (NFR-13); `NOT_FOUND` returned in place of `FORBIDDEN` for lookups; constant-time response shape |
| **Trust inheritance / SSRF / token leakage to upstream** | No long-lived shared secret (FR-26); zero-trust on every request (FR-29); Vercel OIDC explicitly rejected on in-app service surfaces (FR-26c) |
| **MFA bypass** | AAL2 enforced for operator + employer-admin (FR-11/12/13); Clerk handles factor lifecycle |
| **Audit tampering** | F02 writes append-only to buffer; F05 will hash-chain. F02's emission is structured + correlation-ID-bound |
| **Operator account compromise** | Restricted Org with hidden sign-in surface; AAL2; per-action audit; documented compromise drill |
| **Key compromise** | Rotation runbook (Decision 4); old `kid` retained for verification only until last-issued-credential expires (NFR-5, EC-11) |

### 6.2 OWASP ASVS V2/V3/V4 Coverage

- **V2 Authentication:** Clerk + AAL2 + non-enumerating errors.
- **V3 Session Management:** Clerk-managed sessions; revoke-all action; bounded inactivity expiry.
- **V4 Access Control:** Single declarative authorization surface (FR-27); zero-trust (FR-29); fail-closed defaults (FR-28).

### 6.3 Mandatory Reviews

- **`/security-review`** before Phase B9 merge (Constitution §V.3, Roadmap §573).
- **Threat model** before Phase B8 implementation review (Constitution §V.3).

---

## 7. Performance Strategy

| Target | NFR | Approach |
|--------|-----|----------|
| Guard p50 ≤10 ms, p95 ≤30 ms | NFR-1 | Memoize `getPrincipal()` per request via `React.cache` / AsyncLocalStorage; cache `materializePrincipal` lookups by Clerk user ID for session lifetime |
| Agent JWT verify p95 ≤2 ms | NFR-2 | EdDSA + `jose` library; JWKS cached with 5-min TTL on the verifier side |
| Issuance p95 ≤50 ms warm | tRPC contract | Single insert into `agent_credentials` + sign; no synchronous webhook fan-out |
| Revocation propagation ≤60 s | FR-21 | Insert into `revocations`; verifiers consult on cross-process refresh; for hot-path tools, the dispatcher refreshes opportunistically |
| JWKS cache freshness | EC-11 | Set `Cache-Control: public, max-age=300, stale-while-revalidate=86400` on JWKS response |

---

## 8. Testing Strategy

Per `~/.claude/rules/testing.md` (TDD; 80%+ coverage; unit + integration + E2E).

### 8.1 Test Tiers

| Tier | Surface | Tool |
|------|---------|------|
| Unit | `Principal` discriminators; scope registry; JWT mint/verify; revocation-list logic; webhook signature | Vitest |
| Integration | tRPC procedures end-to-end against an ephemeral Postgres branch; Clerk webhook handlers with fixture payloads | Vitest + Testcontainers / Neon dev branches |
| E2E | The 10 quickstart scenarios | Playwright (per `e2e-runner` agent) |
| CI gate | Principal-coverage assertion (NFR-11) | Custom script; runs in PR pipeline |
| Performance | Guard latency, JWT verify latency | Vitest + autocannon for HTTP surfaces |

### 8.2 Coverage Targets

- 80%+ on `packages/auth` source per global rule.
- 100% of mutating routes through the principal-coverage gate (NFR-11 / M-1).
- Every quickstart scenario has at least one mechanized E2E test.

### 8.3 Test Data

- Clerk dev instance with seeded test users for each tier.
- Neon dev branch reset per test run.
- Synthetic agent contracts and rubrics (F07a/F07b stubs) sufficient for credential-issuance tests.

---

## 9. Deployment Strategy

F02's deploy is incremental within the existing F01 pipeline:

1. **Migrations** ship via Drizzle's migration mechanism (F01 has the runner).
2. **Signing keys** generated once per environment via the bootstrap script; committed to Vercel env vars.
3. **Clerk dev → staging → production** instances configured progressively. Webhook URLs updated per environment.
4. **Service-credential bootstrap** runs on first deploy of each service; the bootstrap secret is rotated on each subsequent deploy.
5. **Rollout posture:** F02 lands behind a feature flag `auth.v1` that can disable agent-credential issuance for emergency rollback. (The flag does not disable human auth — that would orphan all sessions.)

**Rollback playbook.** Disable `auth.v1` flag → agent credential issuance halts → in-flight runs complete under their already-issued credentials → revoke remaining via the operator console if the cause is a security event.

---

## 10. Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Clerk pricing surprise at MAU scale | Med | Med | FR-2 keeps the model IdP-agnostic; v1 cost review reopens CL-1 |
| Webhook delivery delay leaves stale principals | Med | Low | Lazy materialization path (EC-1) + reconciliation job (EC-2) |
| Signing-key compromise | Low | Critical | Rotation runbook + `verify_until` window; HSM/KMS as v1+ upgrade path |
| Operator-Org membership mis-set in Clerk | Low | High | Membership managed by Spyglass-side config (FR-9), not Clerk self-service; audit on every change |
| Vercel env-var leak | Low | Critical | Constitution §I.C.1 sanctioned scope; rotation runbook; SBOM tracking of Vercel CLI versions used to push |
| F08.5 not ready when agent issuance lands | Med | Low | F02's verifier helper is consumable today; F08.5 imports it when it lands |
| `/security-review` flags HIGH issues late | Med | Med | Run `/security-review` after Phase B6, not at Phase B8, to catch issues earlier |

---

## 11. Constitutional Compliance

| Article | Compliance |
|---------|-----------|
| §I.5.1 Authentication | Every principal authenticated; cryptographically verifiable agents (Decision 2); MFA AAL2 (Phase B3) |
| §I.5.2 Authorization | Least privilege (FR-19, FR-24); zero-trust (FR-29); scoped, short-lived agent credentials (Decision 2) |
| §I.5.3 Accountability | Stable opaque `principal_id` (FR-2); structured events on every privileged action (Decision 6) |
| §I.6 Defense-in-Depth | Fail-safe deny; no ambient long-lived secrets (FR-26); bootstrap exchange replaces shared secrets immediately |
| §I.C.1 Crypto-agility | Algorithm registry (Decision 4); EdDSA pinned, configurable |
| §II Agent-Native | Agent identity is a first-class `Principal.kind` (FR-1, FR-17–FR-22) |
| §III.1 WCAG 2.2 AA | Operator console gated by Phase B6 a11y review; Clerk inheritance documented (Decision 9) |
| §III.3 Contract evolution | `@spyglass/auth` semver-disciplined per F01 conventions |
| §V.3 `/security-review` | Mandatory at Phase B8 before merge |

**Exceptions:** None.

---

## 12. Open Items Tracked for `/speckit-tasks`

Carried forward from research.md and the agent reports:

1. Reconciliation cadence threshold for "drift exceeds threshold" alert (EC-2).
2. Two-operator step for `revokeAllSessionsForPrincipal` against an operator target.
3. Whether `revocations` is a real table vs. materialized view (default: real table).
4. Operator audit pagination (URL searchParams vs signed cookie — recommendation: searchParams).
5. EC-1 lazy-materialization variant — `'pending'` state as a discriminated `Principal` variant for exhaustiveness.
6. Operator-console kill-switch placement (F06 owns; F02 only views).
7. Cache-Components / PPR shape for `<PrincipalProvider>` (deferred).

These resolve into ordered tasks in `/speckit-tasks`.

---

## 13. Effort Estimate (rough)

Per roadmap, F02 is **M (2–4 weeks)**. Phase breakdown estimate:

| Phase | Estimate |
|-------|----------|
| B1 — `packages/auth` skeleton | 2 days |
| B2 — Clerk integration + webhook | 3 days |
| B3 — MFA + role/scope gates | 2 days |
| B4 — Agent credentials + JWKS | 4 days |
| B5 — Service credentials + bootstrap | 2 days |
| B6 — Operator console UI | 3 days |
| B7 — Runbooks + drill | 1 day |
| B8 — `/security-review` + threat model | 2–3 days (depends on findings) |
| B9 — Merge | 0.5 day |
| **Total** | **~3 weeks** (within the M complexity envelope) |

---

## 14. Document Provenance

- `spec.md` v1.2 (clarifications resolved 2026-05-07)
- `research.md` v1.0 (this plan)
- `data-model.md` v1.0
- `contracts/auth-api.yaml`
- `contracts/auth-trpc.md`
- `contracts/frontend-architecture.md`
- `quickstart.md`
- API design synthesized by `api-architect` agent
- Frontend architecture synthesized by `react-component-architect` agent
- Constitution v2.0.0
- Roadmap v1.1.0
- PRD Draft v0.1
