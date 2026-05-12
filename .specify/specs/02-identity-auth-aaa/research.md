# F02 — Technology Research

**Spec:** v1.2 · **Plan:** v1.0
**Date:** 2026-05-07
**Owner:** Gary

This document records the technology decisions taken during `/speckit-plan`
for F02 (Identity & Auth — AAA primitives). Each decision is anchored to
spec requirements and constitutional articles.

---

## Decision 1 — IdP for human authentication

**Question.** Who hosts signup, login, MFA, password reset, profile,
session management for seekers, employers, and operators?

**Options considered.**

| Option | Pros | Cons |
|--------|------|------|
| **Clerk** (chosen) | Mature; SOC2 Type II; Orgs primitive matches employer multi-tenancy; passkey + TOTP + SMS + WebAuthn AAL2; React/Next.js SDK first-party; PRD §6.1 commits it | Per-MAU cost at high seeker volume; vendor lock-in on hosted UI |
| **Neon Auth** (formerly Stack Auth) | Provisions users directly into Neon Postgres; lower per-MAU cost | Younger product (acquired 2024); Org semantics weaker than Clerk; SOC2 posture less mature |
| **Auth0** | Most mature; broad federation | Higher cost than Clerk at our tier; PRD §7 doesn't commit it; team unfamiliarity |
| **Build custom on Lucia/Auth.js** | Full control | Article I.5 / §I.6 explicitly disfavor rolling our own at Phase 0; expensive to harden to AAL2 |

**Chosen.** Clerk for all four human audiences (seeker, employer-admin,
employer-member, operator). Operators sit in a restricted Clerk
Organization inside the same Clerk instance with a hidden sign-in
surface and mandatory AAL2 MFA.

**Rationale.**
- PRD §3.4 / §6.1 commit Clerk; staying on the committed path keeps the
  PRD as the single source of truth.
- A split between Clerk (employer + operator) and Neon Auth (seeker) was
  considered and rejected (CL-1 in spec §8). Phase 0 alpha won't approach
  Clerk's 10k MAU free tier; the cost saving is theoretical, the
  complexity cost (~1.5–2× F02's surface) is real today.
- Constitution §I.6 (defense-in-depth) is a layering principle, not a
  multi-vendor principle. A second IdP is a parallel SPOF, not a layer.

**Tradeoffs accepted.**
- Per-MAU cost will increase if seeker traffic grows; acceptable until
  the v1 cost review (defined trigger: seeker MAU > 5,000 AND Clerk
  monthly cost > a defined threshold).
- We rely on Clerk's accessibility posture for the hosted UIs; this is
  documented in NFR-14's rationale.

**Migration door.** FR-2 mandates an IdP-agnostic `Principal` model so a
future split or migration is tractable without consumer changes.

---

## Decision 2 — Agent-credential format

**Question.** How are hosted agent credentials issued, formatted, and
verified by F08.5 (the tool dispatcher) and any other consumer?

**Options considered.**

| Option | Pros | Cons |
|--------|------|------|
| **Signed JWT, EdDSA (Ed25519)** (chosen) | Offline verification (no network on tool calls); small signature size; fast verify; standard libraries everywhere; matches Constitution §I.5.1's "signed JWT…or equivalent" | Revocation requires TTL + revocation list, not instant |
| Signed JWT, RS256 | Most widespread support | Larger signature; slower verification |
| Opaque token + Redis verification cache | Easier instant revocation | Adds Redis as a runtime dependency F02 doesn't otherwise need; fails closed if cache unreachable; per-call network cost violates NFR-2 |
| mTLS client cert | Strong identity | Operationally heavy at the agent-instance scale Parley produces |

**Chosen.** Signed JWT, EdDSA (Ed25519). JWKS endpoint published at
`/.well-known/jwks.json` for verifiers. TTL-bounded (≤30 min default,
≤2h ceiling). Revocation via a small in-memory + DB-backed revocation
list checked at mint time and at any cross-process refresh boundary.

**Rationale.**
- NFR-2 (≤2 ms p95 verify) is trivially met by EdDSA.
- Algorithm choice is registry-driven per Constitution §I.C.1 crypto-
  agility; we pin EdDSA for v0 but the verifier reads the JWT header.
- Short TTL means most "revocation" needs are satisfied by waiting for
  expiry; the revocation list handles the gap.

**Tradeoffs accepted.**
- Mid-credential revocation has a bounded propagation window (≤60s) by
  design; truly instantaneous revocation requires an opaque-token+cache
  posture we explicitly rejected.

**Library choice.** `jose` (panva/jose, MIT) for sign/verify and JWKS
serving. Mature, no Node-builtins-only constraint, works on Edge if we
ever need to verify there.

---

## Decision 3 — Service identity issuance

**Question.** Who issues credentials for service-to-service calls, and
how do platform OIDC tokens (Vercel) interact with them?

**Options considered.** See spec §8 CL-3.

**Chosen.** Hybrid. F02 issues all in-app service credentials (signed
JWT, EdDSA, scope-limited, rotated on a documented cadence). Vercel
OIDC tokens are accepted **only** at the deploy boundary
(GitHub-Actions → Vercel) and are not promoted to in-app
`Principal.kind === "service"`.

**Rationale.**
- F02 owns the `Principal` model and is the single trust anchor in-app.
- Platform OIDC tokens have semantics (audience, lifetime, claim shape)
  scoped to the deploy use-case; promoting them in-app couples
  application identity to platform identity in a way that's hard to
  unwind.

**Tradeoffs accepted.**
- A small bootstrap path: services receive their initial F02-issued
  credential at deploy time via an env-manifest-loaded, single-use
  exchange secret. This is the only "platform secret" pattern in F02
  and it's exchanged immediately for a real principal.

---

## Decision 4 — Token-signing key storage and rotation

**Question.** Where do EdDSA signing keys live, and how do we rotate
them?

**Options considered.**

| Option | Pros | Cons |
|--------|------|------|
| **Vercel-environment-variable scope** (chosen for v0) | Already in F01's manifest; encrypted at rest; per-environment isolation; FR-17 sanctioned | Manual rotation; export risk if env vars are over-shared |
| Cloud KMS (AWS KMS / Google Cloud KMS) | HSM-backed; audited use; centralized rotation | Adds a cloud account dependency F02 doesn't otherwise need; latency on sign |
| Vercel Secrets / Edge Config | Vercel-native | Edge Config not for secrets; Vercel Secrets is the same as env vars in this context |

**Chosen.** Vercel-environment-variable scope, with key rotation via the
F01 env manifest. Old `kid`s remain in JWKS for verification until the
last issued credential under them expires (NFR-5, EC-11).

**Rationale.** Constitution §I.C.1 sanctions HSM **or** Vercel-env scope
for production keys. KMS is a v1+ option if we move to a tier where the
extra controls justify the operational cost.

**Tradeoffs accepted.**
- Rotation is a runbook step, not a one-click action.
- Migration to KMS later requires the issuer to read from a new source;
  the issuance API does not change.

---

## Decision 5 — Webhook signature verification (Clerk inbound)

**Question.** How do we verify Clerk webhooks?

**Options considered.**
- **Svix-signed webhooks** (Clerk's standard) — chosen. Industry-
  standard SHA-256 HMAC; library `svix` is small and audited.
- Custom signature scheme — rejected (Constitution §I.6, no rolling our
  own where a standard exists).

**Chosen.** Svix verification on every inbound Clerk webhook. Replay
window enforced (≤5 minutes per Svix default). Failed verification →
401 + audit event, never silent retry.

---

## Decision 6 — Audit-event emission

**Question.** How does F02 deliver structured audit events to F05 when
F05 isn't built yet?

**Chosen.** F02 emits to a typed local event bus (an interface in
`packages/audit-events`) that initially writes to a Postgres
`audit_events_buffer` table. F05 later replaces the sink with the
hash-chained log without changing F02's emission API.

**Rationale.**
- Decouples F02's delivery from F05's storage — F02 doesn't block on
  F05's complexity.
- The buffer table is a forensic-grade record while F05 is in flight;
  Constitution §I.D (forensic readiness) is satisfied at v0.

---

## Decision 7 — Drizzle schema ownership for `principals`

**Question.** F03 owns the database schema (per the roadmap). Does F02
add tables, or wait for F03?

**Chosen.** F02 contributes the **auth-related tables** to the
F03 schema definition: `principals`, `agent_credentials`,
`agent_credential_revocations`, `service_credentials`,
`signing_keys`, `audit_events_buffer`. Migrations land alongside F02's
implementation; F03 is the broader umbrella.

**Rationale.** F02 and F03 are P0 Phase A and unblocked by F01. Coupling
tightly here is fine; the alternative (F03-first, F02 stub the data
layer) doubles the integration cost.

---

## Decision 8 — Coverage of "principal coverage" CI assertion (NFR-11)

**Question.** How do we mechanize "every guarded handler produces a
typed Principal"?

**Chosen.** A static check at CI time:

1. A type-level marker — every Next.js route handler, server action,
   tRPC procedure, and Inngest function imports its handler signature
   from `packages/auth`. The signature is generic over a `Principal`
   subtype and cannot be invoked without one.
2. A grep-style CI gate that asserts no handler bypasses the import
   (e.g., raw `export async function GET` outside `withPrincipal`).

**Rationale.** Type-level enforcement covers most of the surface;
the grep gate covers the gaps where TypeScript can't see (handler
discovery via filesystem conventions in App Router). Together they
satisfy NFR-11 with bounded ongoing maintenance cost.

---

## Decision 9 — Clerk version pinning and accessibility attestation

**Question.** NFR-14 says Spyglass-rendered auth-adjacent UI meets
WCAG 2.2 Level AA, and Clerk-hosted UI inherits Clerk's posture.
What's the documentation requirement?

**Chosen.**
- Pin a specific Clerk SDK version (`@clerk/nextjs` patch version) in
  `packages/auth/package.json`.
- Record the Clerk hosted-UI accessibility attestation URL, version
  reviewed, and review date in `docs/security/clerk-accessibility.md`.
- Re-review on each Clerk SDK major bump.

**Rationale.** Inheriting a vendor's posture is acceptable (Constitution
§III.1 + NFR-14), but auditors need a paper trail of which version was
inherited.

---

## Open Items (deferred to plan execution / future spec versions)

1. **Reconciliation cadence for missing-principal alert** (EC-2). Plan
   defaults to a 5-minute cadence with alert if drift > 0 for >15 min;
   confirmed at /speckit-tasks time.
2. **Two-operator step for `revokeAllSessionsForPrincipal` against an
   operator target** — implied by Constitution §I.5.3 + Story 3 but not
   spec-explicit. Plan adopts it; revisit if it adds friction.
3. **Operator-console kill-switch surface** — F06 owns kill switches;
   the operator console's audit-event viewer is the only F02 surface
   touching that data.
4. **Cache-Components / PPR shape** for `<PrincipalProvider>` —
   intentionally deferred per the React architecture doc §8 Q1.

---

## References

- `.specify/specs/02-identity-auth-aaa/spec.md` v1.2
- `.specify/specs/02-identity-auth-aaa/contracts/auth-api.yaml`
- `.specify/specs/02-identity-auth-aaa/contracts/auth-trpc.md`
- `.specify/specs/02-identity-auth-aaa/contracts/frontend-architecture.md`
- `.specify/memory/constitution.md` v2.0.0 (esp. §I.5, §I.6, §I.C, §II)
- `PRD.md` Draft v0.1 (§3.1–§3.4, §6.1, §7)
- Clerk: https://clerk.com/docs
- jose (panva/jose): https://github.com/panva/jose
- Svix: https://docs.svix.com
- NIST SP 800-63B (Digital Identity Guidelines)
- NIST SP 800-207 (Zero Trust Architecture)
