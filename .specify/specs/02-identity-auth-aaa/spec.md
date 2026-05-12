# Feature Specification — F02 Identity & Auth (Clerk + AAA Primitives)

**Feature ID:** F02
**Slug:** `02-identity-auth-aaa`
**Branch:** `02-identity-auth-aaa`
**Phase:** A — Foundation
**Priority:** P0 (Critical)
**Complexity:** M (2–4 weeks)
**Status:** Draft v1.2 (clarifications resolved 2026-05-07; CL-1 reverted to Clerk-only)
**Created:** 2026-05-07
**Owner:** Gary
**Constitution refs:** v2.0.0 §I.5 (AAA), §I.5.1–§I.5.3, §I.6
(Defense-in-Depth & Secure-by-Default), §II (Agent-Native Architecture),
§III.3 (Contract evolution)
**Roadmap:** `.specify/roadmap.md` v1.1.0 (F02)
**PRD:** `PRD.md` §3.1–§3.3 (users), §3.4 (deliberately not SaaS),
§5 (architecture overview), §6.1 (Clerk in v0 scope), §6.2 (BYO out
of v0), §7 (committed stack)
**Depends on:** F01 (monorepo, env management, supply-chain baseline)
**Blocks:** F04 (ticket store — every mutation needs a principal),
F22 (employer console), every later feature with an authenticated
surface

---

## 1. Overview

Establish identity, authentication, authorization, and accountability
(the AAA triad of Constitution §I.5) for every principal that will
ever touch Spyglass: human seekers, human employer-admins, human
operators, hosted agents (seeker advocates and employer advocates),
and platform services.

This feature is the gate every later feature passes through. Nothing
in F04+ ships without a verified principal attached to its mutations.

### 1.1 Why this feature exists

- Constitution §I.5 makes AAA co-equal with the CIA triad. No
  anonymous mutating actions are permitted, ever; this requires a
  working identity layer before the first writeable surface.
- Constitution §I.5.1 requires cryptographically verifiable agent
  identity. The Parley runner (F08) consumes verified principals; it
  must not have to invent them. F02 is where that primitive is
  defined and issued.
- Constitution §I.5.2 requires least-privilege, scoped, short-lived
  credentials for agents, and zero-trust authorization on every
  request. F08.5 (tool dispatcher) enforces this *at the type level*
  — but it relies on F02 to actually mint and verify the tokens.
- Constitution §I.5.3 requires every privileged action to be
  attributable to an identified principal. F05 (audit log) records
  the principal; F02 establishes the principal.
- PRD §3.4 commits to "deliberately not SaaS" — there is no Spyglass
  account-management code; Clerk hosts signup/login/profile entirely.
  F02 codifies that boundary so it cannot drift.
- PRD §6.1 commits Clerk for both seeker (single-user) and employer
  (Clerk Orgs) sides in v0. Operators sit in a restricted Clerk
  Organization inside the same Clerk instance, with a hidden sign-in
  surface and mandatory AAL2 MFA. (See CL-1 in §8 for why the split
  to Neon Auth was considered and rejected for v0.)

### 1.2 Scope

**In scope:**
- Human authentication via **Clerk** for every audience (signup,
  login, session, profile, password reset, email verification) for
  seekers, employer-admins, employer members, and operators.
- **Clerk Organizations** for the employer side (multi-tenant);
  **single-user Clerk accounts** for the seeker side; **a restricted
  Clerk Organization inside the same Clerk instance** for operators,
  with a hidden sign-in surface and mandatory AAL2 MFA.
- The Spyglass app implements no custom views for any of these
  flows (PRD §3.4, §6.1).
- The internal `Principal` model is **IdP-agnostic by construction**
  so a future migration or split is tractable without reshaping
  consumers (see FR-2).
- Multi-factor authentication (NIST 800-63B AAL2 or higher) required
  for operator and employer-admin surfaces.
- A unified **principal model** that names every actor (human, agent,
  service) consistently across the platform.
- Agent identity: cryptographically verifiable credentials issued to
  hosted agents, scoped per run, short-lived, revocable.
- Service identity: machine-to-machine credentials for inter-service
  calls and webhook senders/receivers.
- Authorization primitives: role definitions, scope definitions, and
  a single authorization-decision surface every later feature calls.
- Session management: token formats, expiry, refresh, revocation.
- Authentication middleware/guards usable by every Next.js route,
  every Inngest function, every API endpoint, and every tool
  dispatcher invocation (F08.5).
- Verification of the principal on every request (zero-trust per
  Constitution §I.5.2).
- Credential lifecycle procedures: rotation, revocation, compromise
  response — documented, not ad-hoc.
- Operator-admin surface for issuing/revoking agent credentials
  (minimal — Clerk-hosted UI plus an internal CLI is sufficient for
  v0).

**Out of scope (deferred):**
- BYO seeker agent federation via OIDC / OAuth 2.0 with DPoP/mTLS /
  W3C Verifiable Credentials. Constitution §I.5.1 names this as
  required *when BYO ships*. Roadmap defers BYO to v1 (Phase 2+);
  F02 must not preclude it but does not implement it.
- BYO employer agent federation (v1+).
- Authorization policy specific to match-tickets (F04 owns this; F02
  ships the *primitive*, F04 wires the rules).
- Audit-log integration (F05 owns the log; F02 emits the events).
- Per-jurisdiction policy gates (F06).
- Tool-dispatcher integration (F08.5 — F02 mints the credentials it
  consumes).
- Operator console UI beyond what Clerk provides plus a minimal
  internal CLI.
- Webhook-signature verification for inbound provider webhooks
  (F23 — F02 ships the crypto primitives; F23 wires per-provider
  rules).

---

## 2. Stakeholders & Users

| Role | What they need from F02 |
|------|--------------------------|
| **Seeker (consumer)** | Frictionless signup/login via Clerk; profile management; ability to enable optional MFA; clear session behavior across devices |
| **Employer admin** | Clerk Org creation/management; mandatory MFA; ability to invite members; role assignment within the org |
| **Employer member** | Org-scoped login; mandatory MFA; access only to their org's tickets and dossiers |
| **Operator** | Mandatory MFA; scoped privileges (e.g., dossier-viewer ≠ kill-switch operator); per-action attribution in logs |
| **Hosted agent (Parley)** | A signed, scoped, short-lived credential issued at run dispatch; cannot exceed its scope; revocable mid-run |
| **Platform service** | Machine-to-machine credentials usable for inter-service calls without ambient long-lived secrets |
| **Security/compliance auditor** | Evidence that every mutation is tied to an authenticated principal; a documented credential-lifecycle procedure; verifiable AAL2+ for privileged surfaces |
| **Future-feature developer** | A single, well-typed authentication/authorization API; consistent principal type across packages; no duplication of auth logic |

---

## 3. User Stories

### Story 1 — Seeker signup and login

**As a** prospective seeker,
**I want** to sign up and log in via the same hosted experience that
manages my profile,
**So that** I can use Spyglass without ever interacting with a
custom account-management surface I have to trust separately.

**Acceptance criteria:**
- [ ] Signup, login, password reset, email verification, and profile
      management are all served by Clerk's hosted UI; the Spyglass
      app contains no custom account-management views.
- [ ] A returning seeker reaches an authenticated state in a single
      flow with no Spyglass-side account-creation step beyond
      whatever Clerk webhooks produce automatically.
- [ ] The seeker has a stable, opaque internal `principal_id` that
      is *not* equal to the Clerk user ID and is the only identifier
      every later feature uses to attribute actions.
- [ ] Optional MFA is available to seekers via Clerk; not enforced.

**Priority:** High

---

### Story 2 — Employer org with mandatory MFA

**As an** employer admin,
**I want** to create an organization, invite my team, and have
everyone enrolled in MFA,
**So that** my team's access to candidate dossiers is protected to
NIST 800-63B AAL2 from day one.

**Acceptance criteria:**
- [ ] An employer admin can create a Clerk Org and invite members.
- [ ] First login by any org member is gated on MFA enrollment;
      members cannot reach a privileged surface in an unenrolled
      state.
- [ ] AAL2 verifiers (TOTP, WebAuthn/passkey, SMS as last resort)
      are available; passkey is the recommended default surfaced in
      onboarding.
- [ ] Role assignment within the org distinguishes at minimum
      `admin` from `member`; only admins can invite/remove members
      or change roles.
- [ ] Removing a member revokes that member's active sessions
      across all surfaces within a bounded interval (target ≤ 60s).

**Priority:** High

---

### Story 3 — Operator with scoped privileges and MFA

**As an** operator,
**I want** to log in with mandatory MFA and operate with only the
privileges my role grants,
**So that** my mistakes have a small blast radius and my actions
are attributable in the audit log.

**Acceptance criteria:**
- [ ] Operator login enforces AAL2 MFA — there is no path to an
      operator surface with single-factor auth.
- [ ] At least three operator roles are defined out of the box
      (e.g., `dossier-viewer`, `policy-gate-operator`,
      `credential-issuer`); the set is extensible without code
      changes to F02 itself.
- [ ] An operator's session token carries the role + scope; every
      privileged action is rejected if the token lacks the required
      scope (zero-trust per Constitution §I.5.2).
- [ ] Every operator action emits a structured event with the
      operator's `principal_id`, the role, the action, and a
      correlation ID — consumed by F05's audit log.
- [ ] No operator role grants unrestricted ambient access; every
      role's scope is enumerated.

**Priority:** High

---

### Story 4 — Hosted agent gets a scoped, short-lived credential

**As the** Parley runner (F08),
**I want** to receive a freshly minted, scoped, short-lived
credential per run,
**So that** the agent's actions are cryptographically attributable
to a specific run, side, and contract version, and a leaked token
expires before it matters.

**Acceptance criteria:**
- [ ] On run dispatch, the runner requests a credential bound to
      `(run_id, side, contract_id, contract_version, ticket_id)`
      and a scope set derived from the contract's tool surface.
- [ ] Credential lifetime defaults to the run's expected duration
      plus a small grace window (target: ≤ 30 minutes total);
      lifetime is configurable per contract but capped at a
      hard ceiling (target: ≤ 2 hours).
- [ ] The credential is verifiable offline by the tool dispatcher
      (F08.5) — verification does not require a callback to F02
      on every tool call.
- [ ] Revocation is effective within a bounded interval (target
      ≤ 60s) via a revocation list or short token TTL with refresh,
      whichever the implementation chooses.
- [ ] An agent presenting a credential whose scope does not cover
      the requested tool fails closed; the failure is logged with
      the principal and the attempted action.
- [ ] Agents do not hold ambient long-lived secrets; no agent
      principal can be issued a credential without an explicit
      run-dispatch event.

**Priority:** High

---

### Story 5 — Service-to-service authentication

**As a** platform service (e.g., dossier signer, channel adapter),
**I want** to authenticate to other services without holding a
shared long-lived secret,
**So that** lateral compromise of one service does not grant
ambient access to others.

**Acceptance criteria:**
- [ ] Inter-service calls present a verifiable principal (signed
      JWT or equivalent) tied to the calling service's identity.
- [ ] No service holds another service's credentials; every
      credential is service-specific and scope-limited.
- [ ] Service credentials rotate on a documented schedule;
      rotation does not require a deploy.
- [ ] A service whose credential is revoked stops being able to
      call other services within a bounded interval (target
      ≤ 60s) without a deploy.

**Priority:** High

---

### Story 6 — Credential lifecycle: rotation, revocation, compromise

**As a** security responder,
**I want** documented procedures for rotating, revoking, and
responding to compromise of any principal's credentials,
**So that** my response is fast and attributable, not improvised.

**Acceptance criteria:**
- [ ] Procedures are documented in `docs/security/` (or
      equivalent) for: human credential reset, agent credential
      revocation, service credential rotation, and full-tenant
      session revocation.
- [ ] Each procedure names a single command, runbook step, or UI
      action — not a sequence of ad-hoc database edits.
- [ ] Each procedure produces an audit event tied to the
      responder's `principal_id`.
- [ ] A "compromise drill" exists as a tested procedure — even if
      it's only a tabletop run in v0 — and its output is recorded.

**Priority:** Medium

---

### Story 7 — Single principal model across packages

**As a** future-feature developer,
**I want** one well-typed `Principal` model imported from one
package,
**So that** I never have to translate between Clerk users, agent
JWT subjects, and service identities at the call site.

**Acceptance criteria:**
- [ ] A single `@spyglass/auth` (or equivalent) package exports
      the `Principal` type and all authentication/authorization
      helpers.
- [ ] The `Principal` discriminates between `human`, `agent`, and
      `service` kinds at the type level; consumers cannot conflate
      them by accident.
- [ ] Every authenticated request handler — Next.js route, Inngest
      function, tRPC procedure — has a typed `Principal` available
      without per-handler boilerplate.
- [ ] Calls without a `Principal` fail to type-check, not at
      runtime, wherever statically possible.

**Priority:** High

---

## 4. Functional Requirements

Stated in capability terms. Where PRD §7 has committed a specific
technology (Clerk), the requirement still describes the *capability*
and notes the committed tool in parentheses for traceability.

### 4.1 Principal model

- **FR-1.** A single `Principal` type names every actor that can
  authenticate. Its discriminator covers at least `human`, `agent`,
  and `service`.
- **FR-2.** Every `Principal` carries an opaque, stable
  `principal_id` distinct from any external IdP identifier. The
  external IdP identifier (Clerk user ID for human principals;
  agent JWT subject; service identity) is recorded alongside it
  for traceability but is not the system-of-record key. The
  principal model is **IdP-agnostic by construction** — consumers
  never branch on which IdP issued a human session, and adding a
  second IdP later does not require reshaping consumers.
- **FR-3.** Human principals carry an account-tier discriminator
  distinguishing at least `seeker`, `employer_admin`,
  `employer_member`, and `operator`.
- **FR-4.** Agent principals carry the run binding fields
  (`run_id`, `side`, `contract_id`, `contract_version`,
  `ticket_id`) named in Story 4.
- **FR-5.** Service principals carry the service name and the
  deployed version producing the credential.

### 4.2 Human authentication (Clerk)

- **FR-6.** Signup, login, session management, password reset, and
  email verification are served by Clerk's hosted experience; the
  Spyglass app implements no custom views for any of these flows
  (PRD §3.4, §6.1).
- **FR-7.** **Clerk Organizations** back the employer-side
  multi-tenant model; every employer user belongs to exactly one
  Org per session. Cross-org session switching uses Clerk's
  standard mechanism.
- **FR-8.** Seeker accounts are single-user Clerk accounts (no
  Org).
- **FR-9.** Operator accounts are a **restricted Clerk Organization
  inside the same Clerk instance employers use**, with a hidden
  sign-in surface (operator URL not linked from the public
  marketing or employer landing pages). Operator role membership is
  managed by Spyglass-side configuration, not by self-service in
  Clerk. Operators are subject to the strictest MFA requirements
  (FR-11) regardless of any employer-Org defaults.
- **FR-10.** Email verification is required before any seeker or
  employer-member action that creates a ticket or accepts an
  invitation.

### 4.3 Multi-factor authentication

- **FR-11.** MFA conforms to NIST SP 800-63B AAL2 or higher for
  operator and employer-admin surfaces (Constitution §I.5.1).
- **FR-12.** MFA is mandatory — not optional — for operator and
  employer-admin sessions; enrollment is gated before any privileged
  action.
- **FR-13.** Employer members inherit the MFA requirement of their
  org; an admin cannot demote the requirement below AAL2.
- **FR-14.** Seeker MFA is available and recommended but optional.
- **FR-15.** Supported AAL2 verifiers include TOTP and
  WebAuthn/passkey; passkey is the recommended default surfaced in
  onboarding copy.
- **FR-16.** SMS-based MFA is permitted only as a last-resort
  fallback per NIST SP 800-63B-4 guidance and is recorded as such in
  the operator/admin's authenticator profile.

### 4.4 Agent identity

- **FR-17.** Hosted agent credentials are minted at run dispatch by
  a single, audited issuance path; no other code path produces an
  agent credential.
- **FR-18.** Agent credentials are **signed JWTs using EdDSA
  (Ed25519)**, distributed to verifiers via a published public key
  (JWKS or equivalent). Verification is offline — no network call
  to F02 on tool invocation. Algorithm choice is configurable per
  Constitution §I.C.1 crypto-agility, but EdDSA is the v0 default
  for signature size and verification cost (see NFR-2).
- **FR-19.** Agent credentials carry a scope set derived from the
  dispatched contract's tool surface (F08.5). The scope cannot be
  expanded after issuance.
- **FR-20.** Agent-credential lifetime is bounded: default ≤ 30
  minutes, hard ceiling ≤ 2 hours, configurable per contract within
  that ceiling.
- **FR-21.** Agent credentials are revocable. The default revocation
  posture is **short TTL** (FR-20) plus a **revocation list checked
  at credential mint time and at any cross-process boundary that
  refreshes a token**. Mid-credential revocation propagates within a
  bounded interval (target ≤ 60s) via the revocation list; tokens
  whose remaining TTL is below that interval rely on TTL alone.
- **FR-22.** A claimed agent principal that fails verification is
  rejected with no privileged action performed and a structured
  event emitted to the audit pipeline (F05).

### 4.5 Service identity (hybrid: F02 + Vercel OIDC at boundary)

- **FR-23.** Inter-service calls present a verifiable principal;
  no inter-service call is anonymous.
- **FR-24.** Service credentials are scope-limited; a service
  cannot use its credential to invoke a peer outside its declared
  scope.
- **FR-25.** Service credentials rotate without a deploy; the
  rotation cadence is documented.
- **FR-26.** No service holds another service's credentials; no
  shared "platform secret" exists.
- **FR-26a.** **F02 is the trust anchor for in-app service
  identity.** Platform-internal service-to-service credentials are
  issued by F02's issuance path (signed JWT, EdDSA, scope-limited),
  bootstrapped at deploy time and rotated on the documented
  cadence.
- **FR-26b.** **Vercel OIDC tokens are accepted only at the trust
  boundary where they natively appear** — e.g., GitHub-Actions →
  Vercel deploy authentication. They are not promoted to the
  in-app `Principal.kind === "service"` model; that role is
  reserved for F02-issued credentials.
- **FR-26c.** A service presenting a Vercel OIDC token to an
  in-app service surface (rather than the deploy boundary) is
  rejected by the authentication guard with a structured failure.

### 4.6 Authorization

- **FR-27.** Authorization decisions are made by a single, typed
  surface (`@spyglass/auth` or equivalent); no feature implements
  ad-hoc authorization checks.
- **FR-28.** Default access decisions are deny (Constitution §I.6
  fail-safe defaults; Saltzer & Schroeder 1975).
- **FR-29.** Every request is authorized on its own merits;
  authorization is never inherited from a prior request, network
  position, or referer (zero-trust per NIST SP 800-207).
- **FR-30.** Roles and scopes are declarative (configuration or
  typed constants), not scattered conditionals.
- **FR-31.** Adding a new role or scope does not require changes
  inside `@spyglass/auth` itself — feature packages declare the
  scopes they require, and authorization decisions are computed
  against those declarations.
- **FR-32.** Operator roles are extensible without modifying F02
  source — at minimum `dossier-viewer`, `policy-gate-operator`,
  `credential-issuer` ship in v0.

### 4.7 Sessions

- **FR-33.** Human session lifetime, refresh behavior, and
  inactivity expiry are configured centrally and follow NIST SP
  800-63B AAL2 guidance for the privileged surfaces.
- **FR-34.** Removing a human principal (Clerk user delete; org
  member removal) revokes that principal's active sessions across
  surfaces within a bounded interval (target ≤ 60s).
- **FR-35.** A "revoke all sessions" administrative action exists
  for operators and emits an audit event.

### 4.8 Middleware & guards

- **FR-36.** Every Next.js route, Inngest function, and API
  endpoint runs through an authentication guard before any
  business logic; routes that intentionally permit anonymous
  access are explicitly marked, not implicit.
- **FR-37.** The guard returns a typed `Principal` (or rejects
  with a structured failure); no handler ever sees a raw,
  un-typed credential.
- **FR-38.** The tool dispatcher (F08.5) consumes an agent
  `Principal` produced by F02; the dispatcher does not invent or
  re-derive agent identity from per-call data.

### 4.9 Lifecycle & operations

- **FR-39.** Documented procedures exist for credential issuance,
  rotation, revocation, and compromise response covering each
  principal kind (human, agent, service).
- **FR-40.** Rotation and revocation produce audit events tied to
  the responder's `principal_id`.
- **FR-41.** A minimal operator command (CLI subcommand or
  internal admin endpoint) issues and revokes agent credentials
  outside of run dispatch — used for emergency response and
  testing.

### 4.10 Federation readiness (no v0 implementation)

- **FR-42.** The agent-credential issuance path supports an
  external-issuer pluggable interface (OIDC, OAuth 2.0 with
  DPoP/mTLS, or W3C Verifiable Credentials) without changes to
  consumers downstream. v0 ships only the hosted-agent issuer;
  the interface is shaped now so v1 BYO does not require a
  refactor of F02's public API.

---

## 5. Non-Functional Requirements

### 5.1 Performance

- **NFR-1.** Authentication-guard overhead on a request is
  bounded; target ≤ 10 ms p50, ≤ 30 ms p95 measured at the guard
  itself (excluding any downstream IdP round trip on cold cache).
- **NFR-2.** Agent-credential verification is offline (FR-18);
  per-call cost is dominated by signature verification and target
  ≤ 2 ms p95.
- **NFR-3.** Session expiry/refresh decisions do not block hot
  paths beyond a single typed lookup.

### 5.2 Security

- **NFR-4.** All secrets used by F02 (signing keys, IdP API keys,
  webhook secrets) live in the environment manifest established
  by F01 and are never committed.
- **NFR-5.** Signing keys for agent-credential issuance are
  rotatable; rotation does not invalidate in-flight credentials
  before their natural expiry unless the responder explicitly
  chooses revocation.
- **NFR-6.** No credential of any kind appears in logs at any
  level; a CI-checkable lint rule or test enforces this on F02's
  output paths.
- **NFR-7.** All authentication failures emit structured events
  suitable for anomaly detection (Constitution §I.6 defense in
  depth); event volume is bounded so a brute-force attempt does
  not DoS the audit pipeline.

### 5.3 Reliability

- **NFR-8.** A Clerk outage degrades gracefully: existing valid
  sessions continue to function until expiry; new logins fail
  with a clear error.
- **NFR-9.** Credential issuance and verification have explicit,
  documented failure modes — no path silently issues a credential
  that later fails verification.

### 5.4 Auditability

- **NFR-10.** Every privileged action emits a structured event
  consumable by F05 with at minimum: `principal_id`, principal
  kind, role/scope used, action, timestamp, correlation ID. F05
  owns durability; F02 owns event shape and emission.
- **NFR-11.** F02 ships with a "principal coverage" assertion in
  CI: a test that fails if any guarded handler can be reached
  without producing a typed `Principal`. (Mechanism is plan-time;
  the requirement is: zero anonymous mutating paths.)

### 5.5 Usability

- **NFR-12.** Onboarding copy for MFA recommends passkey first;
  TOTP second; SMS only on user request and with a clear caveat.
- **NFR-13.** Error messages on authentication failure are
  user-actionable but do not leak whether an account exists, an
  MFA factor type, or any other information that aids enumeration
  attacks (OWASP ASVS V2).

### 5.6 Accessibility

- **NFR-14.** Any Spyglass-rendered authentication-adjacent UI
  (sign-out confirmations, role-elevation prompts, MFA-step
  banners) meets WCAG 2.2 Level AA per Constitution §III.1.
  Clerk-hosted UI inherits Clerk's accessibility posture, which
  is documented in the rationale.

---

## 6. Edge Cases & Error Handling

| # | Case | Required behavior |
|---|------|-------------------|
| EC-1 | Clerk webhook delivery delayed; user logs in before their internal `Principal` row exists | Authentication succeeds; the missing row is materialized lazily on first authenticated request, with no privileged action permitted before materialization completes |
| EC-2 | Clerk webhook never arrives | A reconciliation job (cadence documented) materializes missing principals; alert fires if drift exceeds a threshold |
| EC-3 | Operator's MFA factor is lost | A documented out-of-band recovery procedure exists; recovery is itself an audited action requiring a second operator |
| EC-4 | Employer admin removes a member while that member has an active session | Member's sessions are revoked within ≤ 60s (FR-34); any in-flight tool call by the member's principal fails closed |
| EC-5 | Agent credential is presented after expiry | Verification fails closed; structured event emitted; tool dispatcher returns the unsupported-tool / unauthorized failure shape (F08.5) |
| EC-6 | Agent credential is presented for a tool outside its scope | Verification succeeds; authorization fails closed; event emitted; F08.5 surfaces a `tool_unsupported` or equivalent failure |
| EC-7 | Service credential is leaked and used from outside the service's deployment | If credential carries deployment-binding metadata, mismatched usage is rejected and alerts; if not, the response is rotation per the documented procedure |
| EC-8 | Two operators try to issue the same agent credential simultaneously | Issuance is idempotent on `(run_id, side, contract_id, contract_version)`; the second request returns the existing credential or a deterministic conflict error |
| EC-9 | Clerk rate limits or rejects a login attempt | Caller receives a non-enumerating error; rate-limit telemetry feeds anomaly detection |
| EC-10 | A new role/scope is introduced by a downstream feature | Adding the role does not require changes to F02 source (FR-31); decision logic resolves the new scope automatically |
| EC-11 | Signing key rotation while in-flight credentials are still active | Old key is retained for verification only until the last issued credential under it expires (NFR-5); issuance switches to the new key immediately |
| EC-12 | A "revoke all sessions" administrative action is invoked accidentally | The action is reversible only via reauthentication, not undo; an audit event marks it; downstream surfaces fail gracefully (NFR-8 posture) |

---

## 7. Success Metrics

Spyglass-internal targets (not user-facing):

- **M-1.** 100% of mutating routes produce a typed `Principal`
  before any business logic runs (NFR-11).
- **M-2.** 0 ambient long-lived secrets in source for production
  surfaces (Constitution §I.6; FR-26).
- **M-3.** 100% of operator and employer-admin sessions on a
  privileged surface satisfy AAL2 (FR-11/FR-12/FR-13).
- **M-4.** 0 agent credentials issued outside the audited
  issuance path (FR-17).
- **M-5.** Median revocation propagation ≤ 60s for human
  sessions and agent credentials (FR-21, FR-34).
- **M-6.** 100% of authentication failures emit structured
  events consumable by F05 (NFR-7, NFR-10).

---

## 8. Resolved Clarifications

All initial clarifications have been resolved via `/speckit-clarify`
on 2026-05-07. The decisions and their rationale:

### CL-1 — Hosted IdP topology (resolved)

**Decision:** **Clerk-only for v0.** All four human audiences
(seeker, employer-admin, employer-member, operator) authenticate
through Clerk. Operators sit in a **restricted Clerk Organization
inside the same Clerk instance** with a hidden sign-in surface and
mandatory AAL2 MFA.

**Rationale.** A split between Clerk (employer+operator) and Neon
Auth (seeker) was considered for per-MAU economics on the
high-volume seeker side. Rejected for v0 because:

- Phase 0 alpha is 3–5 US states with counsel-gated launch; seeker
  volume will not approach Clerk's 10k MAU free tier in v0. The
  cost saving is theoretical.
- Two IdPs roughly 1.5–2× F02's implementation surface, integration
  tests, webhook handlers, reconciliation paths, MFA-coverage gaps,
  and lifecycle runbooks. Real complexity cost today.
- Constitution §I.6 (defense-in-depth) is a layering principle, not
  a "more vendors" principle. A second IdP is a parallel
  single-point-of-failure for a different audience, not an
  additional defense layer.
- Neon Auth (formerly Stack Auth, acquired 2024) is younger than
  Clerk; mandatory `/security-review` per Constitution §V.3 would
  spend cycles on vendor risk that Clerk has already cleared.
- Operator-isolation argument is *weakened* by the split, not
  strengthened: operators end up sharing the employer trust
  boundary, which is the highest-volume privileged surface.

**Migration option preserved.** FR-2 mandates an IdP-agnostic
`Principal` model so a future split or full migration to Neon
Auth (e.g., at v1 if Clerk per-MAU becomes painful at seeker
scale) is tractable without reshaping consumers.

**Future trigger.** Reopen this clarification at the v1 cost
review (post-Phase 0) if seeker MAU > 5,000 and Clerk monthly cost
> a defined threshold.

**PRD impact:** None. PRD §3.4, §6.1, and §7 are unchanged.

**Spec impact:** §1.1, §1.2, FR-6, FR-7, FR-8, FR-9 reflect
Clerk-only with operator-as-restricted-Org. FR-2 strengthens the
IdP-agnostic mandate to keep the migration door open.

---

### CL-2 — Hosted agent credential format (resolved)

**Decision:** Signed JWT, EdDSA (Ed25519) by default.

**Rationale:** Offline verification at the tool dispatcher (F08.5)
trivially satisfies NFR-2 (≤2 ms p95). Revocation handled by
short TTL (≤30 minutes default; ≤2 hours hard ceiling) plus a
small revocation list checked at credential mint time and at
cross-process refresh boundaries. Algorithm choice remains
configurable per Constitution §I.C.1 (crypto-agility); EdDSA is
the v0 default.

**Spec impact:** FR-18 names the format; FR-21 documents the
revocation posture.

---

### CL-3 — Service identity issuance (resolved)

**Decision:** Hybrid. F02 is the trust anchor for in-app service
identity; Vercel OIDC is accepted only at the deploy boundary.

**Rationale:** F02 owns the `Principal` model and the inter-service
trust relationship. Platform OIDC tokens are recognized where they
natively occur (CI/CD → Vercel) but are not promoted to the in-app
`Principal.kind === "service"` type. Keeps a single trust anchor
in-app while still letting GitHub Actions deploy through Vercel's
native mechanism.

**Spec impact:** FR-26a, FR-26b, FR-26c added to §4.5.

---

## 9. Constitutional Compliance

| Article | How F02 satisfies it |
|---------|----------------------|
| §I.5.1 Authentication | Every principal authenticated (FR-1, FR-6, FR-17, FR-23); cryptographically verifiable agents (FR-18); BYO federation interface ready (FR-42); MFA AAL2 (FR-11) |
| §I.5.2 Authorization | Least privilege (FR-19, FR-24, FR-32); zero-trust (FR-29); scoped, short-lived agent credentials (FR-19, FR-20) |
| §I.5.3 Accountability | Stable opaque `principal_id` (FR-2); structured events on every privileged action (NFR-10); credential lifecycle procedures (FR-39) |
| §I.6 Defense-in-Depth & Secure-by-Default | Fail-safe default deny (FR-28); no ambient long-lived secrets (FR-26, NFR-4); secrets in F01's env manifest only (NFR-4) |
| §II Agent-Native Architecture | Agent identity is explicit, verifiable, and a first-class principal kind (FR-1, FR-4, FR-17–FR-22) |
| §III.3 Contract evolution | `@spyglass/auth` public API is versioned via the package's semver discipline established in F01; FR-31 keeps the API additive for new scopes |

`/security-review` is mandatory before merge per Constitution §V.3
and the roadmap's compliance-gate matrix; threat modeling is
mandatory before plan acceptance per the same source.

---

## 10. Out-of-Band Dependencies

- **Clerk account / billing tier** sufficient for: Organizations,
  MFA factors (TOTP, passkey, SMS), webhooks, and a restricted
  operator Org with a hidden sign-in surface.
- **Signing-key storage**: production keys in Vercel-environment-
  variable scope or HSM per F01's FR-17. F02 consumes; F01 owns
  the substrate.
- **Federation-ready interface design** (FR-42) does not require
  any v0 BYO partner; it requires only that the interface exists.

---

## 11. Open Questions Tracked Elsewhere

- BYO seeker agent A2A flow (PRD §3.3, roadmap risk row F02) —
  deferred to v1; tracked in roadmap.
- Per-jurisdiction policy gates' interaction with operator scopes
  (F06).
- Operator-console UI beyond Clerk-hosted + CLI — deferred to a
  future feature; not blocking F02.

---

## 12. Document Provenance

- **Constitution v2.0.0** — `.specify/memory/constitution.md`
- **Roadmap v1.1.0** — `.specify/roadmap.md` (F02 row)
- **PRD Draft v0.1** — `PRD.md` (§3.1–§3.4, §5, §6.1, §7)
- **Parley spec** — `/mnt/f/parley/SPEC.md` (consumed indirectly
  via F08; F02 issues credentials Parley verifies)
