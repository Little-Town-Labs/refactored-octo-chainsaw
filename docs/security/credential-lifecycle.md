# Credential Lifecycle Runbook

**Owner:** F02 (Identity & Auth), B7
**Spec ref:** spec.md FR-39, FR-40, FR-41; Quickstart Scenario 6
**Constitution:** v2.0.0 §I.5 (AAA), §I.6 (defense-in-depth), §I.C.1 (crypto-agility)
**Last reviewed:** 2026-05-11
**Reviewer:** F02 implementation team
**Next review trigger:** any change to issuance/rotation/revocation orchestrator surface; signing-key rotation cadence change; new credential kind.

---

## Why this runbook exists

Per spec FR-39 every credential kind has a documented procedure for
issuance, rotation, revocation, and compromise response. This file
is that procedure. It is the *only sanctioned path* for any
operator action against a credential — if a step here would lead
you to manually edit the database, escalate to the F02 owner first.

Audit attribution (FR-40) is satisfied automatically: every action
described here flows through the orchestrator(s) under
`packages/auth/src/issuer/*`, which emit structured audit events
tied to the responder's `principal_id`.

---

## Index

| Principal kind | Issue | Rotate | Revoke | Compromise |
|---|---|---|---|---|
| Human (Clerk-managed) | §1.1 | §1.2 | §1.3 | §1.4 |
| Agent (per-run JWT) | §2.1 | §2.2 | §2.3 | §2.4 |
| Service (long-lived JWT) | §3.1 | §3.2 | §3.3 | §3.4 |
| Signing keys (Ed25519) | §4.1 | §4.2 | §4.3 | §4.4 |

Cross-cutting:
- §5 Operator self-service surfaces (console URLs)
- §6 Audit-event names emitted per action
- §7 Time targets (SLAs) from spec §7

---

## 1. Human principals (Clerk-managed)

### 1.1 Issue (membership)

Humans are issued by Clerk; F02 materializes a `principals` row on
first authenticated request (lazy materialization, EC-1) or eagerly
via the Clerk webhook (EC-2). There is no operator-initiated
"issue human" step — invite a user via the Clerk dashboard for
their org, and Spyglass materializes the principal on first sign-in.

### 1.2 Rotate (tier change, MFA reset)

Tier promotion/demotion: change the user's org role in Clerk. The
webhook (`user.updated` / `organizationMembership.updated`) drives
the materializer to update `tier` on the principals row.

MFA factor rotation: handled inside Clerk's user-profile UI. No
Spyglass-side action required. The factor change does **not**
revoke active sessions; if you need that, follow §1.3.

### 1.3 Revoke (sign out all sessions)

Operator surface:
`/operator/console/credentials/<principal_id>/sign-out`.

For a **non-operator target**, submit the form with a reason code
and optional notes. All active Clerk sessions revoke within ~60s.

For an **operator target**, the two-operator gate fires:
1. First operator submits → orchestrator returns a `pending_approval`
   row with a 15-minute TTL and a shareable URL.
2. First operator sends the URL to a different operator.
3. Second operator opens the URL → reviews the request → submits.
   Self-approval is rejected at three layers: orchestrator
   `SelfApprovalError`, adapter SQL `WHERE initiated_by <> :approved_by`,
   table CHECK constraint.

EC-3 backstop: an operator who loses access to their MFA factor
can be signed out by two other operators via the same gate.

### 1.4 Compromise

Suspected compromise of a human credential:

1. **Within 5 minutes:** sign-out all sessions per §1.3.
2. **Within 1 hour:** in Clerk, force a password reset and require
   re-enrollment of all MFA factors on next sign-in.
3. **Within 24 hours:** review the operator audit log
   (`/operator/console/audit?principal_id=<id>`) for any actions
   taken by the compromised principal since the suspected
   incident; revoke any agent credentials issued by them (§2.3).
4. **Within 72 hours:** if any seeker / employer data was accessed,
   open an incident under F24 (breach-notification flow).

Reason code for §1.3 step 1 is `session_compromise`.

---

## 2. Agent credentials (per-run JWTs)

### 2.1 Issue

Agent credentials are minted at run dispatch by `issueAgentCredential`
(`packages/auth/src/issuer/issuance.ts`). The only sanctioned
operator-initiated path is the credential issuance form at
`/operator/console/credentials/issue` (FR-41), backed by
`issueAgentCredentialByOperator`. The form requires the operator to
hold the `agent_credential.issue` scope (verified by
`OPERATOR_CREDENTIAL_ISSUER` role membership).

The orchestrator enforces:
- Scope subset of the dispatched contract's tool surface (FR-19)
- TTL bounds: default 1800s, hard ceiling 7200s (FR-20, NFR-5
  via `MAX_TTL_SECONDS`)
- Idempotent on `(run_id, principal_id, side)` —
  `IssuanceConflictError` if duplicated

No manual JWT minting outside this path. Calling `mintAgentCredential`
directly from any code path other than the two orchestrators is a
review-blocking violation.

### 2.2 Rotate

Agent credentials are short-lived (max 2h) and not rotated in
place. If a long-running task needs a fresh credential, revoke the
old one (§2.3) and issue a new one (§2.1) with a new `(run_id,
side)` pair.

### 2.3 Revoke

Operator surface:
`/operator/console/credentials/<principal_id>/revoke`.

The form lists every live credential for the target principal_id
and revokes all of them on submit. Backed by `revokeAgentCredential`
which:

1. Inserts a revocations-list row per credential (verifier-side
   fast path).
2. Marks `revoked_at` on each `agent_credentials` row.
3. Emits `agent_credential.revoked` audit event per credential.

Reason codes: `run_cancelled`, `compromise_suspected`,
`operator_emergency`, `scope_violation_detected`.

Revocation propagation target: ≤60s end-to-end (M-5). Verifiers
poll the revocations list at this cadence; offline verification
inside the TTL window after revocation accepts up to one polling
interval of staleness.

### 2.4 Compromise

Suspected compromise of an active agent credential (e.g. a tool
was tricked into echoing the JWT into a log):

1. **Within 1 minute:** revoke via §2.3 with reason
   `compromise_suspected`. The revocations list propagates to
   verifiers in the next poll cycle.
2. **Within 15 minutes:** check the audit log for any tool calls
   the credential authorized after the suspected leak. Cross-
   reference with the `correlation_id` field to bound the blast
   radius to a single run.
3. **Within 1 hour:** review every other agent credential issued
   for the same `principal_id` in the prior 24h; revoke any whose
   issuance audit traces back to the same operator. If the
   operator account itself is suspected, follow §1.4 first.
4. Issue replacement credentials (§2.1) only after the
   compromise root cause is identified.

If the leak source is a tool that logs JWTs, escalate to F08.5
(tool surface owner) to scrub the offending tool before any
replacement issuance.

---

## 3. Service credentials (long-lived JWTs)

### 3.1 Issue (bootstrap)

Service credentials are bootstrapped via the bootstrap-exchange
handler (`packages/auth/src/issuer/service-issuance.ts`). The
caller presents a one-time `bootstrap_secret` set in the
operator's secret-store; the handler verifies, mints the initial
credential, and records the `(principal_id, generation=1)` row.

Bootstrap secrets are rotated quarterly (see §3.2) and never
re-used across services.

### 3.2 Rotate

Two paths:

**In-band (preferred):** the service presents its current valid
credential and receives `generation=N+1`. Old generation remains
valid until `verify_until` (default: `max(expires_at)` of issued
credentials), giving rolling deployments time to pick up the new
credential.

**Out-of-band (recovery):** rotate the bootstrap secret in the
secret-store, then run §3.1 to mint a fresh `generation=1`. Any
prior generations become orphans — revoke them per §3.3.

Cadence: rotate every 90 days minimum; sooner if any of:
- A service host changed (replace before destroying the old host).
- A bootstrap-secret leak is suspected (immediately).

### 3.3 Revoke

No operator UI yet (B6 only ships agent-credential revocation),
and no dedicated `revokeServiceCredential` orchestrator exists at
v0 — service-credential revocation flows through signing-key
force-retire (§4.3) which transitively invalidates every credential
signed under that `kid`:

1. Generate a new service-purpose key (§4.1) and activate it.
2. Force-retire the old key (§4.3) with `verify_until = now()` so
   all in-flight service credentials stop verifying within one
   JWKS-cache refresh.
3. Re-bootstrap the affected service at `generation=1` via §3.1
   (rotate the bootstrap secret first if compromise is suspected).
4. Confirm `service_credential.bootstrapped` audit fires for the
   replacement; no prior generation is reachable.

When B6+ ships a per-credential service revoke surface, that
becomes the preferred path and this section will reference it.
Until then, signing-key rotation is the only sanctioned emergency
mechanism for service-credential revocation.

### 3.4 Compromise

1. **Within 5 minutes:** revoke the compromised generation
   (§3.3). All downstream verifiers see the revocation within one
   poll cycle (~60s).
2. **Within 1 hour:** rotate the bootstrap secret out-of-band
   (§3.2 path 2) so a re-issuance attempt by the attacker fails.
3. **Within 24 hours:** if the credential was used to authenticate
   to any external system, escalate to F24 (incident response) for
   downstream notification.
4. The Vercel-OIDC rejection guard (B5.3) ensures a leaked Vercel
   deployment token cannot be replayed as a service credential at
   an in-app surface — verify the guard's audit events
   (`service_credential.rejected_vercel_oidc`) are empty during
   the incident window.

---

## 4. Signing keys (Ed25519)

### 4.1 Issue (initial activation)

The bootstrap of a new signing key, per
`packages/db/src/schema/signing-keys.ts` and Quickstart Scenario 6:

1. Generate an EdDSA keypair via
   `generateEdDSAKeypair()` (`packages/auth/src/issuer/keygen.ts`).
2. Store the private key in the secrets store
   (`AGENT_SIGNING_KEY_PKCS8` env or whichever your environment
   names it).
3. Insert a row into `signing_keys` with the JWK-form public key:
   ```sql
   INSERT INTO signing_keys (kid, purpose, algorithm, public_key_jwk, activated_at, verify_until)
   VALUES ($1, 'agent', 'EdDSA', $2::jsonb, NULL, NULL);
   ```
   `public_key_jwk` is the public key encoded as a JWK object
   (jose's `exportJWK()` returns the right shape). `activated_at=NULL`
   keeps it out of the JWKS list (it is pre-activation).

### 4.2 Rotate

Rolling rotation, no downtime:

1. Issue the new key per §4.1.
2. Activate: `UPDATE signing_keys SET activated_at = now() WHERE
   kid = $1`. The partial unique index `signing_keys_active_per_purpose_idx`
   enforces exactly one active key per purpose; this swap is the
   moment the new `kid` starts signing new credentials.
3. Retire the old: `UPDATE signing_keys SET retired_at = now(),
   verify_until = (SELECT max(expires_at) FROM agent_credentials
   WHERE kid = $old) WHERE kid = $old`. The old key remains in
   JWKS until `verify_until` so credentials it signed continue
   to verify until they expire naturally.
4. Once `now() > verify_until` for the old key, the JWKS index
   stops listing it (`signing_keys_jwks_idx`); the row is kept
   for audit but is no longer cryptographically active.

Cadence: every 180 days minimum (`agent` purpose), 365 days
(`service` purpose). Sooner on suspected compromise (§4.4).

### 4.3 Revoke (emergency)

Differs from §4.2 in that we do NOT respect `verify_until`:

1. Activate the new key (§4.2 step 2).
2. Force-retire the old: `UPDATE signing_keys SET retired_at =
   now(), verify_until = now() WHERE kid = $compromised`.
3. Issue revocations-list rows for every active credential signed
   under the compromised `kid` so verifiers reject them even
   inside their nominal TTL.

### 4.4 Compromise

A leaked private signing key is the **only** F02 incident with a
genuine "drop everything" posture, because an attacker can
mint arbitrary agent or service credentials at will.

1. **Within 5 minutes:** §4.3 force-revoke.
2. **Within 15 minutes:** re-issue every active agent credential
   in the affected `purpose` band under the new `kid`; revoke any
   that don't get re-issued (the orchestrator handles both sides
   atomically).
3. **Within 1 hour:** open an F24 incident; the credential leak
   is itself a security incident requiring breach review even if
   no downstream data access was observed.
4. **Within 72 hours:** post-incident: review the secrets-store
   access log for the leak vector and rotate any other secrets
   (Clerk webhook secret, bootstrap secrets, DB connection
   strings) that share the same blast radius.

---

## 5. Operator self-service surfaces

| Surface | URL | Backed by |
|---|---|---|
| List credentials | `/operator/console/credentials` | `listAgentCredentialsForOperator` |
| Issue agent credential | `/operator/console/credentials/issue` | `issueAgentCredentialByOperator` |
| Revoke agent credentials | `/operator/console/credentials/<principal_id>/revoke` | `revokeAgentCredential` |
| Sign-out (revoke all sessions) | `/operator/console/credentials/<principal_id>/sign-out` | `revokeAllSessionsForPrincipal` |
| Audit viewer | `/operator/console/audit` | `auditEventsBuffer` reader |

Every action above requires the operator audience + AAL2
(enforced by `proxy.ts` middleware) and the credential-issuer
role (verified inside each action).

---

## 6. Audit-event names

Per FR-40, every action emits a structured event:

| Action | Event name | Notes |
|---|---|---|
| Human session revoke initiated | `human_sessions.revoke_all_initiated` | First operator only, when target is operator |
| Human sessions revoked | `human_sessions.revoked_all` | `two_operator_gated` flag distinguishes EC-3 path |
| Human revoke denied | `human_sessions.revoke_all_denied` | `reason` field: `caller_not_operator`, `approval_not_found`, `approval_expired`, `approval_target_mismatch`, `approval_already_executed`, `self_approval` |
| Agent credential issued (run dispatch) | `agent_credential.issued` | |
| Agent credential issued (operator) | `agent_credential.issued_by_operator` | |
| Agent credential issue denied | `agent_credential.issue_denied`, `agent_credential.issue_by_operator_denied` | |
| Agent credential revoked | `agent_credential.revoked` | Reason from §2.3 |
| Service credential bootstrapped | `service_credential.bootstrapped` | Generation 1 |
| Service credential rotated | `service_credential.rotated` | Generation N → N+1 |
| Service credential rejected (Vercel OIDC) | `service_credential.rejected_vercel_oidc` | B5.3 guard |
| Service credential bootstrap denied | `service_credential.bootstrap_denied` | |
| Service credential rotation denied | `service_credential.rotation_denied` | |
| Principal materialized | `principal.materialized` | EC-1/EC-2 |
| Principal disabled | `principal.disabled` | Member removal (Story 2) |

Names are defined as a discriminated union in
`packages/auth/src/materialize/types.ts` — adding a new name
requires updating that union and the audit-sink writer.

---

## 7. Time targets (from spec §7)

| Metric | Target | Source |
|---|---|---|
| M-2 Materialization lag (eager via webhook) | p95 ≤ 5s | NFR-1 |
| M-3 Materialization lag (lazy at request) | p95 ≤ 100ms | NFR-1 |
| M-4 Agent credential issuance | p95 ≤ 50ms | NFR-2 |
| M-5 Revocation propagation (issue → verifier rejects) | ≤ 60s | spec §7 / FR-21 |
| M-6 Member-removal session revoke | ≤ 60s | FR-34 |

Compromise drill expectations (§2.4, §3.4, §4.4) are measured
against M-5. The "within 5 minutes" / "within 1 hour" timelines
on the compromise rows are *operator-response* targets, not
*system-propagation* targets — the system itself meets M-5 well
under the operator-response window in every drill.

---

## Change log

| Date | Author | Change |
|---|---|---|
| 2026-05-11 | F02 implementation team | Initial runbook for B7 (T063). Covers all four credential kinds per FR-39; cross-referenced with audit-event registry per FR-40 and operator surfaces from B6. |
