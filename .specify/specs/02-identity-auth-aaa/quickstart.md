# F02 — Quickstart & Validation Scenarios

**Spec:** v1.2 · **Plan:** v1.0
**Date:** 2026-05-07

This document defines the **end-to-end validation scenarios** that
demonstrate F02 is working before merge. Each scenario is a manual or
scripted check; the test suite expressed in `/speckit-tasks` will
mechanize the ones that should be automated.

---

## Prerequisites

Before any scenario runs:

1. **F01 environment present.** `pnpm bootstrap` completes; `.env`
   manifest populated; Clerk dev instance configured; Neon dev
   branch provisioned.
2. **Clerk dev instance** has:
   - Email + password sign-in enabled
   - TOTP and WebAuthn (passkey) MFA factors enabled
   - Organizations enabled
   - A "Spyglass Operators" Org pre-created (operator restricted Org)
   - Webhook endpoint pointing at the local dev tunnel
3. **F02 migrations applied:** `principals`, `organizations`,
   `agent_credentials`, `service_credentials`, `signing_keys`,
   `audit_events_buffer`, `revocations` exist.
4. **Initial signing keys generated:** one EdDSA keypair for
   `purpose='agent'`, one for `purpose='service'`. JWKS endpoint
   returns both public keys.

---

## Scenario 1 — Seeker signup and lazy principal materialization (Story 1, EC-1)

**Setup.** Clerk webhook delivery is paused (simulating delay).

**Steps.**
1. Visit `/sign-in` (seeker route group), complete Clerk signup.
2. Immediately hit a seeker route requiring authentication.
3. Verify the route succeeds and a `principals` row exists with
   `kind='human'`, `tier='seeker'`, `external_idp='clerk'`.
4. No privileged action (e.g., ticket creation) is permitted yet —
   verify by attempting one and observing the typed failure.
5. Resume Clerk webhook delivery; verify the existing `principals`
   row is updated, not duplicated.

**Pass criteria.**
- Lazy materialization completes ≤ 200 ms after first authenticated
  request.
- No duplicate principal row.
- Audit event `principal.materialized` emitted with
  `materialization='lazy'`.

---

## Scenario 2 — Employer org with mandatory MFA (Story 2)

**Steps.**
1. Sign up a new employer admin via Clerk; create a Clerk Org
   "Acme Corp."
2. Verify the post-signup flow forces MFA enrollment before the
   user reaches any privileged employer route.
3. Enroll a passkey; complete login.
4. Invite a member; verify the invitation flow forces the member
   to enroll MFA on first login.
5. Verify both users' `principals` rows have `tier='employer_admin'`
   / `'employer_member'` and `org_id` correctly linked to the
   `organizations` row mirroring "Acme Corp."

**Pass criteria.**
- No privileged route reachable in an unenrolled state.
- TOTP, WebAuthn (passkey) factors are listed and selectable;
  passkey is the recommended default in onboarding copy
  (NFR-12).

---

## Scenario 3 — Operator AAL2 + scope enforcement (Story 3)

**Steps.**
1. Pre-add an operator-Org membership for a Clerk user.
2. Sign in via the operator URL (hidden — not linked from public
   surfaces). Verify the URL returns 404 from a non-operator
   session (FR-9 + frontend EC handling).
3. Verify MFA enrollment is mandatory for operators.
4. Authenticate as an operator with role `dossier-viewer`.
5. Attempt to invoke `auth.adminCredentials.issueAgent` — verify
   it fails closed with a generic error code; audit event emitted
   with the attempted action.
6. Re-authenticate as an operator with role `credential-issuer`;
   verify the same call succeeds.

**Pass criteria.**
- Operator URL is 404 (not 403) to non-operators.
- Scope-mismatch failures emit audit events naming the operator
  and the denied action.
- Role assignment is reflected in the typed `Principal.scopes`.

---

## Scenario 4 — Hosted agent credential issuance, verification, expiry, revocation (Story 4)

**Setup.** A test contract (id `test-contract-v1`) is registered with
a known scope set.

**Steps.**
1. As a test service principal, call `auth.agentCredentials.issue`
   with `(run_id=R1, side='seeker', contract_id='test-contract-v1',
   contract_version='1.0.0', ticket_id=T1, scope_set=[...])`.
2. Verify a JWT is returned, signed EdDSA, with the expected
   claims and a `jti` matching a new `agent_credentials` row.
3. Verify the JWT against `/.well-known/jwks.json` — verification
   p95 ≤ 2 ms (NFR-2).
4. Call the same `issue` again with identical inputs — verify
   idempotent conflict response (EC-8); the credential is NOT
   re-issued.
5. Wait until `expires_at`; verify a fresh verification fails closed.
6. Re-issue, then call `auth.agentCredentials.revoke`. Verify the
   credential appears in `revocations` and that verification fails
   closed within ≤ 60 s (FR-21).
7. Attempt to use a revoked credential against a tool dispatcher
   stub — verify `tool_unsupported` / unauthorized failure shape
   (EC-5, EC-6).

**Pass criteria.**
- Idempotent on `(run_id, side, contract_id, contract_version)`.
- Verification offline (no F02 round trip).
- Revocation propagation ≤ 60 s.
- Audit events: `agent_credential.issued`, `agent_credential.revoked`.

---

## Scenario 5 — Service-to-service authentication (Story 5)

**Steps.**
1. At deploy bootstrap, a service receives its initial F02-issued
   service credential.
2. Service A calls Service B with the credential; B's guard
   resolves a `Principal.kind === 'service'` and authorizes the
   request.
3. Attempt the same call with a stale (rotated-out) credential
   whose `expires_at` is past — verify rejection with the generic
   error code.
4. Attempt the call with a Vercel OIDC token instead of an
   F02-issued service credential — verify rejection (FR-26c) and
   audit event.

**Pass criteria.**
- No long-lived shared platform secret beyond the deploy-bootstrap
  exchange (FR-26).
- Vercel OIDC explicitly rejected at in-app service surfaces.

---

## Scenario 6 — Credential lifecycle: rotation, revocation, compromise drill (Story 6)

**Steps.**
1. Generate a new EdDSA keypair for `purpose='agent'`. Insert into
   `signing_keys` with `activated_at=NULL`.
2. Run the rotation runbook: activate the new key, retire the old
   one, set `verify_until` on the old to `max(expires_at)` of
   in-flight credentials.
3. Verify new credentials are signed under the new `kid`; existing
   credentials still verify under the old `kid` until they expire.
4. Run the "compromise drill": revoke all active credentials of
   a target service via the operator surface. Verify revocation
   propagation and audit emission.
5. Verify the runbook is the *only* path that produced the
   revocations (no manual DB edits in the audit trail).

**Pass criteria.**
- Old key remains in JWKS until `verify_until`.
- Drill completes inside the documented runbook step count.
- Audit trail attributes every action to the responder's
  `principal_id`.

---

## Scenario 7 — IdP outage degrades gracefully (NFR-8)

**Steps.**
1. Block outbound to Clerk in the dev environment.
2. Verify already-authenticated sessions continue to work until
   token expiry (Clerk session cookies are still valid).
3. Verify new sign-in attempts produce a clear, non-enumerating
   error.
4. Verify agent-credential issuance and verification continue to
   work — they don't depend on Clerk.

**Pass criteria.**
- No authenticated-user-visible blank page or 500 cascade.
- Error messages do not enumerate (NFR-13).

---

## Scenario 8 — Principal coverage CI assertion (NFR-11)

**Steps.**
1. Add a temporary route `apps/web/app/test-coverage-violation/route.ts`
   that bypasses `withPrincipal` and performs a write.
2. Run CI (`pnpm test:coverage-gate`).
3. Verify CI fails with a clear message naming the violating file.
4. Remove the temporary route; verify CI passes.

**Pass criteria.** Zero-anonymous-mutating-paths assertion is
mechanized and CI-blocking.

---

## Scenario 9 — Member-removal session revocation (Story 2 AC, FR-34)

**Steps.**
1. Employer admin removes member B from the Org.
2. Member B has an active session in another browser. Verify the
   next request from B's browser fails within ≤ 60 s.
3. Verify B's `principals` row has `disabled_at` set.

**Pass criteria.** Revocation latency target met; audit event
emitted.

---

## Scenario 10 — Enumeration resistance (NFR-13)

**Steps.**
1. Attempt sign-in with a non-existent email and a wrong password.
2. Attempt sign-in with an existing email and a wrong password.
3. Attempt to call `auth.principal.lookupByExternalId` for a
   non-existent ID and an existing ID without sufficient scope.

**Pass criteria.** Response status, body, and timing are
indistinguishable across the cases (within tolerance).

---

## Acceptance summary

When all 10 scenarios pass and the underlying success metrics
(M-1…M-6) hit their targets, F02 is merge-ready pending
`/security-review` (mandatory per Constitution §V.3).
