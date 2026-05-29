# Clerk MFA + Operator Org configuration runbook

**Owner:** F02 (Identity & Auth)
**Refs:** FR-9, FR-11, FR-12, FR-13, FR-14, FR-15, FR-16, T027, T028
**Last updated:** 2026-05-08

This runbook documents the **operational** configuration of Clerk that
F02's code assumes. It is the operator's checklist when bootstrapping
a new environment (development, preview, production) or rotating a
Clerk instance.

The proxy.ts middleware enforces AAL2 for every non-seeker tier
(`evaluateTierAal`) and the audience gate for `/operator` (FR-9). Both
gates rely on the configuration below being in place — the code alone
does **not** force MFA enrollment, and the operator org is **not**
created automatically.

---

## T027 — AAL2 verifier configuration (Clerk dashboard)

For each environment (`development`, `staging`, `production`):

1. **Sign in to the Clerk dashboard** for the target instance.
2. **User & Authentication → Multi-factor**:
   - Enable **Authenticator app (TOTP)** — required for AAL2 (FR-15).
   - Enable **Passkeys / WebAuthn** — recommended default per FR-15
     and NFR-12 onboarding copy.
   - **SMS**: enable as a fallback only (FR-16). Mark it as
     "deprioritized" in onboarding copy. SMS verifications are
     recorded as such in the audit pipeline (B5+).
   - **Backup codes**: enable. Issued at MFA enrollment; users must
     download or copy before leaving the page.
3. **User & Authentication → Email & Phone**:
   - **Email verification required** at sign-up (FR-10).
4. **Sessions → Session token customization**:
   - Confirm the token includes the `fva` (factor verification age)
     claim. Clerk emits this by default in v7+; the proxy reads
     `auth().factorVerificationAge[1]`.
5. **Save** and re-deploy the affected environment.

### Verification

After configuration:

- Create a fresh user, complete email verification, then sign in.
  Without enrolling a second factor, navigating to `/employer` or
  `/operator` should redirect back to the sign-in surface (AAL2
  step-up). After enrolling TOTP or a passkey, the same path should
  load.
- Visit `/operator` while signed in as a seeker. The response must
  be **404**, not 401/403 (FR-9 hidden surface; covered by
  `decide-access.test.ts`).

---

## T028 — Operator restricted Org per environment

Operator tier is **not** self-service in Clerk (FR-9 / FR-32). One
restricted Clerk Organization per environment maps to the Spyglass
operator role.

### One-time bootstrap (per environment)

1. **Clerk dashboard → Organizations → Create organization**:
   - Name: `Spyglass Operators (<env>)`
   - Slug: `spyglass-operators-<env>`
2. **Organization settings → Permissions**:
   - **Disable** "Allow members to invite new members".
   - **Disable** public discovery / signup. Membership is invite-only
     and managed exclusively by an existing operator.
3. **Copy the Clerk org ID** (`org_xxx`) shown in the URL or the org
   detail page.
4. **Set the env var** in the matching Vercel environment:
   ```bash
   vercel env add SPYGLASS_OPERATOR_CLERK_ORG_IDS <env>
   # Value: comma-separated list of operator org IDs.
   # Almost always exactly one ID per env; multiple is supported for
   # migrations.
   ```
5. **Redeploy** so the new env var takes effect; the proxy.ts
   middleware reads it on cold start.
6. **Add the first operator**:
   - Have the user sign up normally (creates a Clerk user).
   - Invite them to the operator org via the Clerk dashboard → Members.
   - Confirm by visiting `/operator` while signed in as that user;
     the page should load (after AAL2 enrollment).

### Verification

- A non-member of the operator org hitting `/operator` receives 404.
- A member with an active operator-org session at AAL2 sees the
  operator console (B6).
- Removing a member via the Clerk dashboard triggers
  `organizationMembership.deleted`, which the F02 webhook handler
  translates into:
  1. `clerkClient.sessions.revokeSession` for every active session.
  2. `disablePrincipal` in the DB.
  3. A `principal.disabled` audit event.
  See `processClerkDirective` (T026) for the orchestration. The
  observed end-to-end SLA must be ≤60s (FR-34).

---

## Clerk webhook endpoint

Each environment must configure one Clerk webhook endpoint pointing
at Spyglass:

```text
https://<deployment-host>/api/webhooks/clerk
```

Subscribe the endpoint to these events:

```text
user.created
user.updated
user.deleted
organizationMembership.created
organizationMembership.updated
organizationMembership.deleted
session.removed
invitation.created
invitation.updated
invitation.accepted
invitation.revoked
invitation.expired
organizationInvitation.created
organizationInvitation.updated
organizationInvitation.accepted
organizationInvitation.revoked
organizationInvitation.expired
```

Copy the endpoint signing secret from Clerk and set it as:

```bash
vercel env add CLERK_WEBHOOK_SIGNING_SECRET <env>
```

Invitation events are mirrored into `clerk_invitations` with a
normalized email hash, not the raw invitee email address. They do
not create principals. Principal creation still happens through
`user.created` for seekers and `organizationMembership.created` for
employer/operator membership.

---

## Drift audit (recurring)

Every quarter (or after any Clerk dashboard change):

- [ ] AAL2 verifiers still enabled in all three environments.
- [ ] SMS still flagged as fallback-only.
- [ ] Operator org membership matches the Spyglass-side runbook
      (no drift between Clerk dashboard members and the
      `principals.tier='operator'` rows).
- [ ] `SPYGLASS_OPERATOR_CLERK_ORG_IDS` matches the Clerk org ID for
      each env.
- [ ] Clerk webhook endpoint is subscribed to the full event list
      above, and recent deliveries return 204.
- [ ] Reconciliation Inngest job (T024) has reported `drift = 0` for
      the past 24h. (The drift metric lights up after F08 brings in
      the runtime; until then, manual spot-check.)

---

## Constitutional refs

- **§I.5.1** (cryptographically verifiable authentication) — AAL2 is
  the floor for every non-seeker tier per FR-11.
- **§I.5.2** (least privilege; separate trust boundary for operators)
  — operator org is restricted from self-service (FR-9 / FR-32).
- **§I.6** (fail-safe defaults) — the configuration above is the
  *external* prerequisite for the proxy.ts gate. The middleware
  fails closed when the configuration is missing (e.g., empty
  `SPYGLASS_OPERATOR_CLERK_ORG_IDS` means no one is an operator,
  not "everyone is an operator").
