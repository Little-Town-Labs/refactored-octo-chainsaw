# F02 Threat Model (STRIDE)

**Owner:** F02 (Identity & Auth), B8 (T067)
**Spec refs:** F02 spec.md §4 (functional requirements), §5 (NFRs), §6 (edge cases)
**Constitution:** v2.0.0 §V.3 (security review cadence), §I.5 (AAA), §I.6 (defense in depth)
**Last reviewed:** 2026-05-11
**Reviewer:** F02 implementation team
**Next review trigger:** any change to a trust boundary; any new credential kind; any new external IdP integration; before F02 merge to `main` (B9 gate).

---

## How to read this document

STRIDE per asset, not per code file. For each asset we list:

1. **Trust boundary** it sits on.
2. **STRIDE table** with applicable threat → mitigation → evidence
   (code refs, FR/NFR/EC, audit-event names).
3. **Residual risks** (open follow-ups).

Out-of-scope: downstream feature threat models (F04+ each own
their own). F02 owns *identity, authentication, and authorization
primitives* only.

Notation: ✅ mitigated and verified; 🟡 mitigated but residual risk
remains (cited); ⚠️ partial mitigation, follow-up tracked.

---

## 1. Trust boundaries

```
                            UNTRUSTED EDGE
   ┌────────────────────────────────────────────────────────┐
   │                                                        │
   │   browser (seeker/employer/operator)   external IdP    │
   │           │                ▲                ▲          │
   │           │                │                │          │
   └───────────┼────────────────┼────────────────┼──────────┘
               │ (1)            │ (2)            │ (3)
   ┌───────────┼────────────────┼────────────────┼──────────┐
   │           ▼                │                ▼          │
   │      proxy.ts         Clerk SDK        webhook handler │
   │      (audience       (server-side)     (signed Svix)   │
   │      + AAL gates)                                      │
   │           │                                            │
   │           ▼                                            │
   │      withPrincipal → getPrincipal → typed handler      │
   │                                  │                     │
   │                                  ▼                     │
   │   ┌──────────────────────────────────────────────────┐ │
   │   │            HANDLER TRUST BOUNDARY                │ │
   │   │                                                  │ │
   │   │   issueAgent / revokeAgent / signOutOperator /   │ │
   │   │   serviceBootstrap / serviceRotate / verifier    │ │
   │   │                                                  │ │
   │   └──────────────────────────────────────────────────┘ │
   │                                  │                     │
   │                                  ▼                     │
   │      Drizzle repos → Neon Postgres (encrypted at rest) │
   │                  + audit-events buffer (NFR-10)        │
   │                                                        │
   │           SPYGLASS TRUSTED ZONE                        │
   └────────────────────────────────────────────────────────┘
                                  │ (4)
                                  ▼
                          F05 audit pipeline
                          (downstream, separate trust zone)
```

Boundaries:

- **(1) Browser → proxy.ts.** First-line defense. Audience routing
  (`seeker` ↔ `employer` ↔ `operator`) prevents cross-audience
  reachability; AAL gate redirects step-up identically to
  first-factor sign-in.
- **(2) Server → Clerk.** Outbound trust to a third-party IdP.
  Spyglass treats Clerk-reported claims as untrusted until
  materialized into a `Principal` with org/tier verified.
- **(3) Clerk → webhook handler.** Inbound trust gated by Svix
  signature verification (`verifyClerkWebhook`).
- **(4) Spyglass → F05.** Audit emission boundary. F02 owns event
  shape; F05 owns durability + hash-chain integrity.

---

## 2. Asset: human Principal (Clerk-managed)

**Trust boundary:** (1), (2), (3).

| STRIDE | Threat | Mitigation | Evidence |
|---|---|---|---|
| **S** | Attacker forges a Clerk session cookie | Clerk owns session signing; we never trust an unsigned cookie. Cookie verification via `clerkClient().sessions.verifySession` happens before any `Principal` materialization. | ✅ `packages/auth/src/proxy/clerk-session.ts`; `apps/web/proxy.ts` |
| **S** | Attacker presents an agent or Vercel-OIDC token as a human session | Resolver path strict-discriminates; browser routes don't read `Authorization` headers. Vercel-OIDC rejected explicitly. | ✅ FR-26b/c; B5.3 guard |
| **T** | Attacker tampers with the Clerk webhook to flip a user's tier | Svix HMAC signature required (`verifyClerkWebhook`). Webhook secret in env per NFR-4. | ✅ `packages/auth/src/webhook/verify.ts` |
| **T** | Attacker mutates the `principals` row via direct SQL | DB access is through Drizzle repos only; no service uses raw connections at runtime. Operator must follow `credential-lifecycle.md` (no manual SQL sanctioned). | ✅ runbook §1; ⚠️ enforced by convention, not by DB role yet — see Residual #1 |
| **R** | Operator denies having performed a privileged action | Every state-changing action emits a structured audit event with `principal_id` of the responder (FR-40). Two-operator gate on EC-3 makes self-attributed forgery require collusion. | ✅ NFR-10; `revokeAllSessionsForPrincipal` orchestrator emits initiate + execute + denied events |
| **I** | Tier or org membership inferred from a stale session | Materializer re-resolves tier on every request; webhook + reconciliation job converge drift (EC-2). | ✅ `materializePrincipal`; reconciliation job (T024) |
| **D** | Brute-force sign-in DoS-es the audit pipeline | Audit volume bounded per NFR-7; Clerk owns rate limiting on its sign-in surface (EC-9). | ✅ NFR-7, EC-9; ⚠️ in-app rate limiting beyond Clerk's is a downstream concern |
| **E** | AAL1 session reaches an AAL2-required route | Proxy returns `redirect_step_up` before the handler runs. AAL is re-evaluated per request, not cached. | ✅ `decideRouteAccess`; FR-13 |
| **E** | Member retains access after org removal | `disablePrincipal` invoked on `organizationMembership.deleted` webhook; sessions revoked within ≤60s (M-6). | ✅ FR-34; EC-4; `processClerkDirective` |

**Residual risks:**

1. Direct-SQL access is *prohibited by runbook* but not yet
   enforced via least-privilege DB roles. Open until a separate
   slice introduces per-operator-role DB grants. Acceptable for
   v0 (operator pool is small + audited at the OS layer).

---

## 3. Asset: agent credential (per-run JWT)

**Trust boundary:** issuance crosses (1) (operator-initiated only
via console); verification crosses the handler boundary on every
agent tool call.

| STRIDE | Threat | Mitigation | Evidence |
|---|---|---|---|
| **S** | Attacker mints a forged agent JWT | EdDSA signature over JWKS-published key; no other code path produces agent JWTs (FR-17). Direct `mintAgentCredential` calls outside the two orchestrators are a review violation. | ✅ FR-17/18; `packages/auth/src/issuer/mint.ts`; runbook §2.1 |
| **S** | Attacker replays a stolen agent JWT in a different run | JWT carries `run_id` + `side`; F08.5 tool dispatcher binds the call context to the JWT's claims. Cross-run replay fails authorization. | ✅ FR-19; orchestrator binds `(run_id, side)` |
| **T** | Attacker tampers with a revoked credential to remove `revoked_at` | Revocations-list is append-only; verifier consults the list, not the credentials row. Tampering with credentials row alone does not un-revoke. | ✅ `RevocationListRepo`; `verifyAgentCredential` reads revocations |
| **T** | Operator tampers with a sibling credential during a revoke | The `revokeAgentCredential` orchestrator scopes mutation to credentials matching the requested `principal_id` and inserts revocations entries first; concurrent revokes are idempotent at the `revoked_at IS NULL` SQL guard. | ✅ adapter SQL guards; runbook §2.3 |
| **R** | Operator denies issuing a credential they did issue | `agent_credential.issued_by_operator` event includes the operator's `principal_id` + scope set + correlation. | ✅ NFR-10; `issueAgentCredentialByOperator` |
| **I** | JWT echoed into a log via a buggy tool exposes the bearer credential | NFR-6: no credential of any kind appears in logs; lint rule on F02 output paths. Tools are F08.5's responsibility; F02 surfaces a `compromise_suspected` revoke flow for when this happens (§2.4 of runbook). | ✅ NFR-6; ⚠️ enforcement at tool surface is F08.5-owned, not F02 |
| **I** | Verifier leaks scope set to an unauthorized caller | Verifier returns the typed `AgentJwtClaims` only to authenticated callers; failures emit a structured event without echoing the claims. | ✅ `verifyAgentCredential`; NFR-13 |
| **D** | Issuance rate-spike DoS-es the orchestrator | Issuance is idempotent on `(run_id, principal_id, side)` (EC-8) — duplicate requests collapse to the existing row. TTL ceiling caps the credential lifespan so a leaked one ages out within 2h (FR-20). | ✅ EC-8; FR-20; `IssuanceConflictError` |
| **E** | Agent credential used for a scope outside its set | Authorization fails closed; verifier returns claims, dispatcher (F08.5) gates the call. | ✅ EC-6; FR-19 |

**Residual risks:**

2. NFR-6 lint rule lives in F02; tools outside `packages/auth`
   are checked by their own CI gates. Coverage is bounded at the
   F02 boundary; downstream features inherit the obligation but
   F02 cannot enforce it for them.

---

## 4. Asset: service credential (long-lived JWT)

**Trust boundary:** bootstrap crosses (1) once at provisioning;
verification crosses the handler boundary on every service call.

| STRIDE | Threat | Mitigation | Evidence |
|---|---|---|---|
| **S** | Vercel OIDC token replayed as a service credential | `assertNotVercelOidc` rejects on the `iss` claim before any signature verification. Audit event fires on rejection. | ✅ FR-26b/c; `assertNotVercelOidc`; B5.3 |
| **S** | Attacker forges a service JWT | EdDSA signature over the service-purpose signing key. Same JWKS pattern as agent (purpose-scoped). | ✅ FR-18; `verifyServiceCredentialAtSurface` |
| **T** | Attacker tampers with bootstrap-secret store | NFR-4 (env-manifest secrets); bootstrap secret is rotated quarterly per runbook §3.2 cadence. A tampered secret invalidates legitimate bootstrap and is detected on first attempt. | ✅ NFR-4; runbook §3 |
| **T** | Attacker upgrades a stale generation to active | Generation is monotonic per `principal_id`; in-band rotation requires the current valid credential; out-of-band recovery re-bootstraps generation=1 and revokes orphans. | ✅ runbook §3.2; `ServiceIssuanceConflictError` |
| **R** | Service operator denies a rotation | `service_credential.rotated` audit; FR-40. | ✅ NFR-10 |
| **I** | Leaked service credential used cross-service | Verifier checks `principal_id` claim against the route's expected service identity. A credential for `svc_a` presented to a route expecting `svc_b` fails authorization. | ✅ `verifyServiceCredentialAtSurface` |
| **D** | Bootstrap-handler abuse | One-time bootstrap secret; subsequent uses fail. Brute-force attempts emit `service_credential.bootstrap_denied` per attempt (rate-limited at the NFR-7 boundary). | ✅ NFR-7; `InvalidBootstrapSecretError` |
| **E** | Vercel deployment process gains Spyglass service authority | Explicitly rejected (FR-26b); see (S). | ✅ B5.3 |

**Residual risks:**

3. Service-credential *revocation* has no operator UI yet (runbook
   §3.3 calls a backend script). Until a B6+ slice adds the
   surface, emergency revoke requires direct orchestrator
   invocation. Acceptable for v0; tracked in `compromise-tabletop.md`
   known-gaps.
4. Deployment-binding (EC-7) deferred to v1. v0 mitigates a
   stolen service credential via rotation (§3.2 path 2), not
   binding. Acceptable per the task ledger (T052 note).

---

## 5. Asset: signing keys (Ed25519, both purposes)

**Trust boundary:** private key lives in env / secret store
(NFR-4); public key flows through JWKS to verifiers.

| STRIDE | Threat | Mitigation | Evidence |
|---|---|---|---|
| **S** | Verifier accepts a JWT signed by a non-active key | JWKS partial index lists only `activated_at IS NOT NULL AND retired_at IS NULL` keys, plus retired keys still within `verify_until`. New issuance always uses the single active key per purpose. | ✅ `signing_keys_active_per_purpose_idx`; `signing_keys_jwks_idx` |
| **T** | Attacker activates a second key for the same purpose simultaneously | Partial unique index `signing_keys_active_per_purpose_idx` enforces at most one active per purpose at the SQL level. | ✅ DB constraint |
| **R** | Operator denies rotating a key | ⚠️ Signing-key rotation does not currently emit an audit event. **Open follow-up (#5 below).** | 🟡 known gap |
| **I** | Private key in env leaks via crash dump / log | NFR-4 (secrets in env, not in code); NFR-6 (no credential in logs); `loadAgentSigningKey` raises a typed error if env is unset rather than echoing a placeholder. | ✅ NFR-4, NFR-6 |
| **D** | JWKS endpoint scraped to DoS the verifier cache | Verifier caches JWKS in-process; JWKS is read-only and cacheable downstream. Rate limiting at the edge is platform-owned. | ✅ NFR-2 (offline verification); platform layer |
| **E** | Compromised key used to mint arbitrary credentials | Runbook §4.4 force-retire path: activate new, force-retire old with `verify_until = now()`, mass-revoke credentials under the compromised `kid` via revocations-list. | ✅ runbook §4.3-4.4 |

**Residual risks:**

5. Signing-key rotation emits no audit event. Add
   `signing_key.activated` / `signing_key.retired` to the registry
   in `materialize/types.ts` and emit from the rotation orchestrator
   (currently runbook-driven SQL). Tracked in
   `compromise-tabletop.md` known-gaps.

---

## 6. Asset: revoke-all-sessions approval (two-operator gate)

**Trust boundary:** orchestrator handler (boundary 1).

| STRIDE | Threat | Mitigation | Evidence |
|---|---|---|---|
| **S** | Operator A spoofs Operator B's approval | Approval row carries `initiated_by`; `markApproved` SQL UPDATE includes `WHERE initiated_by <> :approved_by` defense-in-depth alongside orchestrator's `SelfApprovalError` and the table's CHECK constraint. Three layers must all be subverted simultaneously. | ✅ T060 adapter; T059b orchestrator; T059b schema CHECK |
| **T** | Attacker tampers with the approval row to clear `executed_at` | UPDATE guarded by `executed_at IS NULL` and `approved_by IS NULL` — once approved, the row is immutable for the markApproved path. | ✅ T060 adapter |
| **R** | Approver denies approving (or vice versa) | `human_sessions.revoke_all_initiated` (by A) + `human_sessions.revoked_all` (by B) audit pair; failed approval attempts emit `revoke_all_denied` with `reason`. | ✅ NFR-10 |
| **I** | Approval URL link leaks to a non-operator | Non-operator at the proxy boundary is redirected to sign-in; orchestrator re-checks operator tier even if proxy is bypassed. Link alone is not sufficient without an operator session at AAL2. | ✅ `proxy.ts` + orchestrator authorize step |
| **I** | Operator notes leak to Clerk | Orchestrator forwards only `reason_code` (typed enum) to Clerk; notes stay in Spyglass audit + approvals table. | ✅ T059b orchestrator `idpReason = input.reason_code` |
| **D** | Pending approvals accumulate, exhausting storage | TTL 15 minutes; pruner (future) sweeps expired rows. Row volume is bounded by operator pool size × 15-minute window. | ✅ TTL; ⚠️ pruner not yet shipped, see Residual #6 |
| **E** | Non-operator initiates an approval | Caller-role check at the orchestrator's first step; non-operator failure emits `revoke_all_denied{reason: caller_not_operator}` (NFR-10 forensic trail for privilege-escalation probes). | ✅ T059b orchestrator |

**Residual risks:**

6. Expired pending-approval rows are not pruned. Volume is bounded
   so no immediate operational concern, but `compromise-tabletop.md`
   should add a "ensure approval-pruner runs in drill" item once
   the pruner ships.

---

## 7. Asset: audit-events buffer (NFR-10)

**Trust boundary:** write path inside the handler trust zone;
read path crosses (1) for the operator audit viewer; downstream
forwarding crosses (4) to F05.

| STRIDE | Threat | Mitigation | Evidence |
|---|---|---|---|
| **S** | Attacker writes audit events as another principal | Audit sink is a server-side dep injected into orchestrators; writes carry the orchestrator-determined `principal_id`, not a caller-supplied value. | ✅ `AuditEventSink`; orchestrators set `principal_id` from typed `Principal` |
| **T** | Attacker mutates a written audit row | Buffer is append-only by convention today; F05 will hash-chain on forward. Direct DB tampering same caveat as Residual #1. | 🟡 F05 owns durability; F02 owns shape |
| **R** | Audit event missing for a known action | Orchestrator emits BEFORE returning success; denied paths emit via `safeDenyAudit` which falls through to stderr if the sink itself fails (so a sink outage never silently masks a denial). | ✅ T059b `safeDenyAudit`; FR-40 |
| **I** | Audit viewer leaks events across operators (no row-level filter) | Read-only viewer with `principal_id` URL filter; non-operator at proxy is redirected. All operators see all events by design — operators are mutually trusted at the audit-read level. | ✅ FR-32 operator role; spec §4.6 |
| **D** | Audit volume DoS-es the buffer | NFR-7 bounds emission cadence; brute-force events are bounded by Clerk's rate limit at the sign-in surface. | ✅ NFR-7 |
| **E** | Non-operator reads the audit viewer | Proxy gates by audience + AAL2; page also re-checks operator tier. | ✅ B6 audit page |

---

## 8. Asset: operator console surfaces (B6)

**Trust boundary:** (1).

| STRIDE | Threat | Mitigation | Evidence |
|---|---|---|---|
| **S** | CSRF on a revoke / sign-out / issue form | Server actions over POST with Next's built-in same-origin enforcement; the `confirm=yes` hidden field gates the orchestrator call so a bare GET / referer-less request fails. | ✅ form views; ⚠️ explicit CSRF token not added (Next + same-site cookies cover the common case) |
| **T** | URL tampering routes a sign-out approval to the wrong target | Cross-target replay guard in the orchestrator returns `ApprovalNotFoundError{reason: approval_target_mismatch}` and emits a deny audit. | ✅ T059b orchestrator |
| **R** | Operator action without audit trail | Every server action invokes an orchestrator that emits an audit event; the form's `*FormInvalidError` deny is also audited at the orchestrator layer when it reaches one. | ✅ NFR-10 |
| **I** | Form error reveals enumeration data (NFR-13) | Error boundary maps typed errors to fixed-copy banners via `selectBannerKind`. Forbidden-vocabulary list in tests asserts no role/scope/factor leakage. | ✅ T061 `AuthBanner`; tests audit forbidden vocabulary |
| **I** | Flash banner URL forged to fake a pending approval | Forgeable today (`?flash=pending&approval_id=<uuid>`); operator AAL2 is a prerequisite, and the shared link still flows through the orchestrator's guards. Cross-cutting flash hardening tracked as a B6-close follow-up. | 🟡 ⚠️ Residual #7 |
| **D** | High-volume revoke spam | Orchestrator is idempotent on `revoked_at IS NULL`; concurrent revokes collapse cleanly. Operator pool size bounds the threat. | ✅ revocation orchestrator |
| **E** | Non-operator submits an operator-form action | Server action re-checks `principal.tier === "operator"` before calling the orchestrator. Proxy redirects non-operator browsers earlier. | ✅ each action; proxy.ts |

**Residual risks:**

7. Query-string flash pattern (`?flash=...&...`) used by revoke
   and sign-out is forgeable inside the operator audience. Real
   security boundaries hold (orchestrator guards); UI banner can
   be faked for social engineering. Cross-cutting hardening
   (signed cookie or HMAC) is a B6-close follow-up across all
   surfaces.

---

## 9. Cross-cutting concerns

### 9.1 Defense-in-depth posture (Constitution §I.6)

Every privileged action passes through:

1. **Proxy** — audience + AAL gates
2. **Server action** — re-checks operator tier
3. **Orchestrator** — authorizes principal + invariants
4. **Adapter SQL** — defense-in-depth predicates (e.g.
   `markApproved` triple-guard)
5. **Schema CHECK** — invariant at DB layer (e.g. revoke-all
   distinct-operators CHECK)
6. **Audit sink** — fail-closed forensic trail; stderr fallback

A single missed layer is recoverable; subverting two adjacent
layers requires distinct exploit primitives.

### 9.2 NFR-13 (enumeration resistance)

- Sign-in / step-up: proxy redirects to the same Clerk URL for
  both (visually + by-payload indistinguishable).
- Error boundaries: typed-error names → fixed banner copy; no
  scope / role / factor terms in the rendered DOM (T061 forbidden-
  vocabulary tests).
- Audit-viewer query params: malformed values fall back to empty
  filter, not error pages that distinguish "no such principal"
  from "no events".

### 9.3 NFR-10 (auditability)

Every named event in `materialize/types.ts` `AuditEventName` is
emitted by exactly one orchestrator and consumed by the buffer
sink. Adding a new event requires updating the discriminated
union — type system enforces consistency between emitter and
sink schema.

### 9.4 Failure modes (NFR-9)

| Failure | Detection | Recovery |
|---|---|---|
| Clerk outage | First sign-in attempt fails with non-enumerating error | Existing sessions continue until expiry (EC-9); no F02 hard dependency on Clerk for verification (FR-18 offline) |
| Signing-key env unset | `AgentSigningKeyMisconfiguredError` at issuance | Operator restarts service after fixing env; no silent fallback |
| Audit sink failure | `safeDenyAudit` falls through to stderr | F05 ingestion catches up from buffer table when sink recovers |
| Webhook signature invalid | `WebhookSignatureError`; 401 to Clerk | Clerk retries per its own policy; reconciliation job (T024) closes drift |
| DB unavailable | Materializer throws; route fails closed | Browser session continues (Clerk cookie still valid); writes fail visibly |

---

## 10. Open follow-ups (this document tracks)

| # | Item | Source | Owner |
|---|---|---|---|
| 1 | DB role-level least-privilege on `principals` mutation | §2 residual | Post-v0 hardening |
| 2 | NFR-6 cross-package enforcement at downstream tool surfaces | §3 residual | F08.5 |
| 3 | Service-credential revoke operator UI | §4 residual | B6 follow-up |
| 4 | Deployment-binding for service credentials (EC-7) | §4 residual | v1 |
| 5 | `signing_key.activated` / `signing_key.retired` audit events | §5 residual | F02 follow-up |
| 6 | Pending-approval pruner | §6 residual | F02 follow-up |
| 7 | Cross-cutting flash hardening (signed cookie / HMAC) | §8 residual | B6 close |

---

## Change log

| Date | Author | Change |
|---|---|---|
| 2026-05-11 | F02 implementation team | Initial STRIDE threat model for B8 (T067). Covers all F02 assets at HEAD `a9dbb9e`; cross-references runbooks at `docs/security/*` and audit-event registry in `packages/auth/src/materialize/types.ts`. |
