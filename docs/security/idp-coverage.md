# IdP Coverage Matrix

**Owner:** F02 (Identity & Auth), B7
**Spec ref:** spec.md FR-15, FR-16; FR-26b, FR-26c (Vercel-OIDC rejection)
**Constitution:** v2.0.0 §I.5 (AAA), §I.6 (defense-in-depth)
**Last reviewed:** 2026-05-11
**Reviewer:** F02 implementation team
**Next review trigger:** any new Spyglass surface accepting authenticated traffic; any change to the verifier set or AAL2 factor policy.

---

## Purpose

A single table that answers, for each Spyglass surface, *which
credential it accepts and which it rejects*. Auditors and incident
responders use this to bound the blast radius of a suspected leak
without re-reading the codebase.

Cross-reference: `credential-lifecycle.md` covers the lifecycle of
each credential kind; this file covers the *verifier topology*.

---

## 1. Credential kinds

| Kind | Issuer | Bearer | Carrier | Verifier path |
|---|---|---|---|---|
| **Clerk session** | Clerk | Human (operator, admin, member, seeker) | Session cookie | `clerkClient.sessions.verifySession` → `clerkSessionToTier` → materializer → `Principal` |
| **Agent JWT** | F02 issuer (`mintAgentCredential`) | Hosted agent in a run | `Authorization: Bearer <jwt>` | `verifyAgentCredential` (offline, JWKS-cached, revocations-list lookup) |
| **Service JWT** | F02 service-issuer (bootstrap or rotation) | Long-lived internal service | `Authorization: Bearer <jwt>` | `verifyServiceCredentialAtSurface` (wraps `assertNotVercelOidc` + offline JWT verify) |
| **Vercel OIDC** | Vercel platform | Vercel deployment process | `x-vercel-oidc-token` header | **Rejected at all in-app surfaces** by `assertNotVercelOidc` (B5.3) |

Only the first three are accepted by Spyglass code. The fourth is
listed so the rejection contract is explicit.

---

## 2. Surface ↔ credential matrix

✅ = accepted, ⛔ = rejected, ⚪ = not reachable at this surface
(routing layer never delivers traffic of this kind here).

| Surface | Clerk session | Agent JWT | Service JWT | Vercel OIDC |
|---|---|---|---|---|
| `(seeker)/*` (seeker app) | ✅ (tier=`seeker`, AAL1 OK) | ⚪ | ⚪ | ⛔ |
| `(employer)/*` (employer app) | ✅ (tier=`employer_*`, AAL2 required for admin) | ⚪ | ⚪ | ⛔ |
| `(operator)/*` (operator console) | ✅ (tier=`operator`, AAL2 required) | ⚪ | ⚪ | ⛔ |
| `app/api/agent/*` (agent tool surface — F08.5) | ⛔ | ✅ (scope-checked, TTL ≤ 2h) | ⛔ | ⛔ |
| `app/api/service/*` (internal service-to-service) | ⛔ | ⛔ | ✅ (generation + scope checked, Vercel-OIDC explicitly rejected) | ⛔ |
| `app/api/webhooks/clerk` | ⚪ | ⚪ | ⚪ | ⛔ — verified by `verifyClerkWebhook` Svix signature |

The routing layer (`apps/web/proxy.ts`) is what enforces the
"⚪ not reachable" rows: a seeker-tier session reaching `(operator)/*`
is redirected to sign-in; an agent JWT reaching `(operator)/*`
never produces a `Principal` because the resolver doesn't accept
`Authorization` headers on browser routes.

---

## 3. AAL2 verifier coverage (FR-15, FR-16)

Authentication factor types are owned by Clerk; F02 reads which
factor verified the current session via
`secondFactorVerificationAge` and decides AAL based on
`evaluateAal`. Per FR-15 / FR-16:

| Factor | Accepted as AAL2 | Recommended for new users | Notes |
|---|---|---|---|
| WebAuthn / passkey | ✅ | ✅ (default in Clerk onboarding copy) | NIST 800-63B-4 AAL2 native |
| TOTP (authenticator app) | ✅ | ✅ (secondary recommendation) | NIST 800-63B-4 AAL2 native |
| SMS OTP | ✅ (last resort) | ❌ | Permitted only when no other factor is enrolled; flagged on the operator/admin profile per FR-16 |
| Backup codes | ✅ (one-shot) | ⚪ (per-factor backup, not primary) | Treated as TOTP equivalent by Clerk; F02 inherits |
| Email magic-link | ❌ | ❌ | Not an AAL2 factor under our policy |

The age tolerance for AAL2 is governed by `evaluateAal` —
sessions whose second-factor verification is older than the
configured window step down to AAL1 and trigger
`redirect_step_up` at the proxy.

**Operator policy reminder.** Operators and `employer_admin` users
**cannot** demote AAL2 below the tier requirement (FR-13). An admin
who wants to relax MFA for a member must promote them out of the
admin tier first — the materializer enforces tier ↔ AAL alignment.

---

## 4. Vercel-OIDC rejection (FR-26b, FR-26c)

The Vercel deployment OIDC token (`x-vercel-oidc-token`) is a
useful identity for Vercel-platform integrations but **MUST NOT**
be honored as a Spyglass service credential at in-app surfaces.

Implementation:

- `assertNotVercelOidc(token)` parses the JWT's `iss` claim and
  rejects any token whose issuer matches Vercel's OIDC issuer
  (`https://oidc.vercel.com`) with the typed error
  `VercelOidcAtInAppSurfaceError` (`packages/auth/src/verifier/vercel-oidc-rejection.ts`).
- `verifyServiceCredentialAtSurface` calls `assertNotVercelOidc`
  before any cryptographic verification, so even a token that
  would otherwise pass signature verification is rejected on
  shape.
- A rejected token emits `service_credential.rejected_vercel_oidc`
  audit (NFR-10) for forensic capture.

Why this matters: a Vercel deployment that accidentally forwards
its own OIDC token to a Spyglass internal API would, without this
guard, be authenticated as *whatever principal we infer from the
token claims*. The guard ensures the rejection happens at the
shape layer, not at a policy-decision layer where the precedent
could drift.

**No** Spyglass surface accepts Vercel OIDC for authentication.
If a future integration needs to delegate authority to a Vercel
deployment, it must mint a Spyglass service credential under the
deployment's identity and present that — not the OIDC token
directly.

---

## 5. Clerk-hosted surfaces (out of scope here)

The Clerk-rendered sign-in / MFA / profile views are not Spyglass
surfaces; they are listed in `clerk-accessibility.md` for the
accessibility posture and in this section for completeness:

| Clerk URL | Audience | Spyglass-side responsibility |
|---|---|---|
| `/operator/sign-in/*` | Operator first-factor + step-up | None (Clerk owns); proxy redirects unauth + step-up here |
| `/employer/sign-in/*` | Employer first-factor + step-up | None (Clerk owns); proxy redirects unauth + step-up here |
| `/seeker/sign-in/*` | Seeker first-factor | None (Clerk owns); proxy redirects unauth here |
| `clerk.example.com/...` (Clerk-hosted) | Profile / MFA management | None (Clerk owns) |

Spyglass never mints, rotates, or revokes a Clerk session
directly — every human-session action flows through Clerk's
session API (see `ClerkSessionRevoker` and §1.3 of
`credential-lifecycle.md`).

---

## 6. Quick-reference: what fails closed

| Scenario | Result |
|---|---|
| Anonymous request to a guarded route | `redirect_sign_in` → Clerk sign-in for the route's audience |
| AAL1 request to an AAL2-required route | `redirect_step_up` → same Clerk URL (NFR-13: indistinguishable from first-factor) |
| Agent JWT to a browser route | Resolver returns null → guard throws `AnonymousAccessError` → error boundary renders `session_expired` banner |
| Vercel OIDC to any in-app surface | `VercelOidcAtInAppSurfaceError` → audit emit → 401 from the route handler |
| Service JWT with wrong audience or expired generation | `CredentialVerificationError` → audit emit → 401 |
| Revoked agent JWT inside its TTL | Verifier rejects after revocations-list propagation (≤60s, M-5) |
| Compromised signing key (in JWKS but force-retired) | New credentials minted under new `kid`; old credentials revoked per §4.3 of `credential-lifecycle.md` |

---

## Change log

| Date | Author | Change |
|---|---|---|
| 2026-05-11 | F02 implementation team | Initial matrix for B7 (T064). Cross-references credential-lifecycle.md §1-4 and B5.3 Vercel-OIDC rejection guard. |
