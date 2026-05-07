# F02 Identity & Auth — tRPC Router Contract

**Status:** Planning artifact for `/speckit-plan`. Not implementation.
**Companion:** `auth-api.yaml` (external REST surfaces only).
**Owner package:** `packages/auth` (`@spyglass/auth`).

---

## 0. Design rules

These apply to every procedure below; they are not repeated per-entry.

1. **Zero-trust (FR-29).** Every procedure resolves the calling
   `Principal` from the inbound credential on its own. No ambient
   trust from network position, prior request, or referer.
2. **Fail-closed (FR-28).** Unknown principal kind, missing scope, or
   any internal validation failure → `TRPCError` with a generic code.
   No privileged side-effects on the failure path.
3. **No enumeration leaks (NFR-13).** Error messages are stable and
   deliberately uninformative about *why* a request was denied beyond
   the coarse code. Specific reasons go to the audit event, not the
   client.
4. **Audit emission (NFR-10).** Every privileged action emits a
   structured event to the F05 audit pipeline with at minimum:
   `principal_id`, `principal_kind`, `role_or_scope`, `action`,
   `timestamp`, `correlation_id`. Listed per procedure as
   `Audit: <event_name>`.
5. **Idempotency.** Mint paths de-dupe on a domain key (specified
   per procedure, never on a client-supplied UUID alone).
6. **Performance.** Auth-guard overhead target: p50 ≤ 10 ms,
   p95 ≤ 30 ms (NFR-1). Issuance p95 ≤ 50 ms warm. Verification
   p95 ≤ 2 ms (NFR-2).
7. **Crypto.** EdDSA (Ed25519) signing, JWT format (FR-18).
   Algorithm is configurable per Constitution §I.C.1 but the v0
   default is fixed.
8. **Trust boundary on internal procedures.** "Service-to-service"
   procedures require a `Principal.kind === "service"` issued by
   F02 (FR-26a). Vercel OIDC is **not** accepted on these surfaces
   (FR-26b/c) — it is recognized only at the deploy boundary.

---

## 1. Type primitives (sketch)

```ts
// Discriminated union; consumers cannot conflate kinds (FR-1, Story 7).
type Principal =
  | HumanPrincipal
  | AgentPrincipal
  | ServicePrincipal;

interface PrincipalBase {
  principal_id: string;            // opaque, stable, NOT the IdP id (FR-2)
  issued_at: number;               // unix seconds
  correlation_id: string;
}

interface HumanPrincipal extends PrincipalBase {
  kind: "human";
  tier: "seeker" | "employer_admin" | "employer_member" | "operator"; // FR-3
  clerk_user_id: string;           // traceability only
  clerk_org_id: string | null;     // employer / operator org
  aal: "AAL1" | "AAL2" | "AAL3";   // NIST 800-63B
  roles: ReadonlyArray<string>;    // declarative; FR-30/31
}

interface AgentPrincipal extends PrincipalBase {
  kind: "agent";
  run_id: string;                  // FR-4
  side: "seeker" | "employer";
  contract_id: string;
  contract_version: string;        // semver
  ticket_id: string;
  scopes: ReadonlyArray<string>;   // immutable post-mint (FR-19)
  expires_at: number;              // ≤30m default, ≤2h ceiling (FR-20)
}

interface ServicePrincipal extends PrincipalBase {
  kind: "service";
  service_name: string;            // FR-5
  service_version: string;         // deployed version
  scopes: ReadonlyArray<string>;
  expires_at: number;
}

// Generic envelope used by all auth-related errors. Maps onto
// TRPCError code + a generic message. No PII, no enumeration.
interface AuthErrorShape {
  code:
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "NOT_FOUND"          // also returned for "denied to look up"
    | "CONFLICT"            // idempotency conflict
    | "PRECONDITION_FAILED" // e.g., MFA not satisfied
    | "INTERNAL_SERVER_ERROR";
  message: string;          // stable, generic
  correlation_id: string;
}
```

The `getPrincipal()` guard surface (consumed by every Next.js route,
Inngest function, and tRPC procedure) is described in §6 below.

---

## 2. Router shape

Top-level router: `authRouter`. Sub-routers:

```
authRouter
├── credentials       // agent + service credential lifecycle
│   ├── issueAgent
│   ├── revokeAgent
│   ├── issueService
│   ├── revokeService
│   └── listRevoked
├── operator          // operator-only emergency surfaces (FR-41)
│   ├── emergencyIssueAgent
│   ├── emergencyRevokeAgent
│   └── revokeAllSessionsForPrincipal
├── principal         // lookup / introspection (in-app callers only)
│   ├── whoami
│   ├── getById
│   └── reconcile     // operator-triggered Clerk reconciliation
└── meta
    └── jwksFingerprint
```

External REST equivalents are limited to webhook ingress and the
public JWKS — see `auth-api.yaml`.

---

## 3. `authRouter.credentials`

### 3.1 `issueAgent`

**Purpose.** Mint a scoped, short-lived agent credential at run
dispatch (Story 4, FR-17, FR-18, FR-19, FR-20).

**Caller.** F08 Parley runner only. Authenticated as a *service*
principal whose scopes include `auth:agent_credential:issue`.

**Auth requirement.** `Principal.kind === "service"` and scope
`auth:agent_credential:issue`. **Vercel OIDC tokens are rejected
here** (FR-26c).

**Input.**
```ts
{
  run_id: string;
  side: "seeker" | "employer";
  contract_id: string;
  contract_version: string;        // semver
  ticket_id: string;
  scope_set: ReadonlyArray<string>; // derived from contract tool surface
  ttl_seconds?: number;             // default 1800; ceiling 7200 (FR-20)
}
```

**Output.**
```ts
{
  jwt: string;                      // EdDSA-signed compact JWT
  kid: string;                      // for verifier key selection
  principal_id: string;
  expires_at: number;               // unix seconds
  scopes: ReadonlyArray<string>;
}
```

**Idempotency.** De-duped on
`(run_id, side, contract_id, contract_version)` (EC-8). A second
call with an identical key returns the existing credential record's
identifier set; if the original credential is still within TTL, the
JWT is *not* re-emitted — instead `CONFLICT` with the existing
`principal_id` is returned, forcing the caller to use the original.
If TTL has elapsed, a new credential is minted under a new key.

**Errors.** `UNAUTHORIZED`, `FORBIDDEN` (scope insufficient or
service kind mismatch), `PRECONDITION_FAILED` (scope_set exceeds
contract's declared tool surface), `CONFLICT` (idempotency hit),
`INTERNAL_SERVER_ERROR`.

**Audit.** `agent_credential.issued` (success) or
`agent_credential.issue_denied` (failure). Includes `run_id`,
`side`, `contract_id`, `contract_version`, requested `scope_set`,
issuing service principal id.

**Performance.** p95 ≤ 50 ms warm (single signature, single
Drizzle insert).

---

### 3.2 `revokeAgent`

**Purpose.** Revoke an in-flight agent credential (FR-21, Story 6).

**Caller.** Service principal with scope
`auth:agent_credential:revoke` (e.g., F08 runner cancelling a run),
*or* operator with role `credential-issuer` (via §4.2).

**Auth requirement.** Service or human principal carrying the
revoke scope. Operators must satisfy AAL2 (FR-12) — enforced by
the guard, not this procedure.

**Input.**
```ts
{
  principal_id: string;             // the agent principal to revoke
  reason_code:                      // bounded enum; free text discouraged
    | "run_cancelled"
    | "compromise_suspected"
    | "operator_emergency"
    | "scope_violation_detected";
  notes?: string;                   // operator notes; never PII
}
```

**Output.**
```ts
{
  principal_id: string;
  revoked_at: number;
  effective_within_seconds: number; // target ≤ 60 (FR-21, M-5)
}
```

**Idempotency.** Revoking an already-revoked principal is a no-op
returning the original `revoked_at`.

**Errors.** `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND` (returned even
when the principal exists but caller is not allowed to know — no
enumeration leak).

**Audit.** `agent_credential.revoked` with revoking principal,
reason_code, target principal_id.

**Performance.** p95 ≤ 30 ms (single revocation-list write +
broadcast).

---

### 3.3 `issueService`

**Purpose.** Mint a platform-internal service credential at deploy
bootstrap (FR-26a, Story 5).

**Caller.** Bootstrap path only — an Inngest function triggered
by the F01 deploy lifecycle. Authenticated by a one-shot bootstrap
secret loaded from the F01 environment manifest, which is itself
verified once and immediately exchanged for a service principal.

**Auth requirement.** Bootstrap-only: caller must present the
deploy-time bootstrap material (`X-Bootstrap-Token` equivalent in
tRPC headers), validated against the rotated secret in F01's env
manifest. After bootstrap succeeds, this procedure refuses
non-bootstrap callers.

**Input.**
```ts
{
  service_name: string;             // e.g., "dossier-signer"
  service_version: string;          // deployed git sha or semver
  scopes: ReadonlyArray<string>;    // declared by the service manifest
  ttl_seconds: number;              // bounded; rotation cadence in FR-25
}
```

**Output.** Same shape as `issueAgent.output` with `kind` implied as
`service`.

**Idempotency.** De-duped on
`(service_name, service_version, deploy_id)`.

**Errors.** `UNAUTHORIZED`, `FORBIDDEN`, `PRECONDITION_FAILED`
(scope not declared in service manifest), `CONFLICT`,
`INTERNAL_SERVER_ERROR`.

**Audit.** `service_credential.issued` (NFR-10).

**Performance.** p95 ≤ 50 ms; called rarely (bootstrap).

---

### 3.4 `revokeService`

**Purpose.** Revoke a service credential (FR-26, Story 5/6).

**Caller.** Operator with role `credential-issuer`.

**Auth requirement.** Human operator, AAL2.

**Input.**
```ts
{
  principal_id: string;
  reason_code:
    | "rotation"
    | "compromise_suspected"
    | "decommissioned";
}
```

**Output.** Same shape as `revokeAgent.output`.

**Idempotency.** Same posture as `revokeAgent`.

**Errors.** Same as `revokeAgent`.

**Audit.** `service_credential.revoked`.

**Performance.** p95 ≤ 30 ms.

---

### 3.5 `listRevoked`

**Purpose.** Return the active revocation list for cross-process
verifier refresh (FR-21).

**Caller.** Service principals with scope
`auth:revocation_list:read` — e.g., F08.5 tool dispatcher refresh
hook.

**Auth requirement.** Service principal.

**Input.**
```ts
{
  since?: number;                   // unix seconds; deltas only
  kinds?: ReadonlyArray<"agent" | "service">;
}
```

**Output.**
```ts
{
  as_of: number;
  entries: ReadonlyArray<{
    principal_id: string;
    kind: "agent" | "service";
    revoked_at: number;
    expires_at: number;             // pruning hint
  }>;
}
```

**Idempotency.** Read-only.

**Errors.** `UNAUTHORIZED`, `FORBIDDEN`.

**Audit.** Sampled (`revocation_list.read`) — full per-call audit
would generate noise; we audit *changes*, not reads, here.

**Performance.** p95 ≤ 20 ms; expected list size small (FR-21).

---

## 4. `authRouter.operator`

Operator emergency surfaces, separate from the dispatch-driven
`credentials.*` procedures so they can be routed through stricter
guards and emit distinct audit events (FR-41).

### 4.1 `emergencyIssueAgent`

**Purpose.** Issue an agent credential outside of run dispatch — for
incident response, repro of a stuck run, or controlled testing
(FR-41).

**Caller.** Human operator, role `credential-issuer`.

**Auth requirement.** AAL2; role assertion; reason required.

**Input.** Same as `credentials.issueAgent.input` plus:
```ts
{
  justification: string;            // free text; surfaced in audit
  ticket_id_override?: string;      // for synthetic test runs
  expires_in_seconds: number;       // ceiling ≤ 7200 (FR-20)
}
```

**Output.** Same as `credentials.issueAgent.output`.

**Idempotency.** Not idempotent — emergency issuance is intentionally
a fresh credential each call. The audit event is the de-dup record.

**Errors.** `UNAUTHORIZED`, `FORBIDDEN`, `PRECONDITION_FAILED`.

**Audit.** `agent_credential.emergency_issued` (distinct event so
F05 dashboards can surface frequency; M-4).

**Performance.** Same as `issueAgent`.

### 4.2 `emergencyRevokeAgent`

Mirror of `credentials.revokeAgent` but always emits
`agent_credential.emergency_revoked`. Operator AAL2 required.

### 4.3 `revokeAllSessionsForPrincipal`

**Purpose.** Force-revoke every active session for a human principal
(FR-35). EC-12 notes the action is reversible only via
reauthentication.

**Caller.** Operator role `credential-issuer`, AAL2, plus a
documented two-operator step for `tier === "operator"` targets.

**Input.** `{ principal_id: string; reason_code: ... }`
**Output.** `{ revoked_at: number; effective_within_seconds: number }`
**Audit.** `human_sessions.revoked_all`.
**Errors.** As above.

---

## 5. `authRouter.principal`

### 5.1 `whoami`

**Purpose.** Return the calling principal in typed form. Used by
the `apps/web` shell, debug surfaces, and self-introspection by
agents and services.

**Auth requirement.** Any authenticated principal.

**Input.** none.

**Output.** `Principal` (discriminated union, §1).

**Errors.** `UNAUTHORIZED`.

**Audit.** None per call (high cardinality). Cache the result for
the duration of the request via the guard (§6).

**Performance.** p95 ≤ 5 ms; resolved from already-validated
guard state.

### 5.2 `getById`

**Purpose.** Resolve a `principal_id` to a redacted projection for
operator tooling and audit-log rendering.

**Caller.** Operators with role `dossier-viewer` or higher; service
principals with scope `auth:principal:read` (e.g., F05 audit
renderer).

**Input.** `{ principal_id: string }`

**Output.** A redacted projection (`kind`, `tier`/`service_name`,
`created_at`, current revocation state). **Never** the IdP id, never
PII, never role assignments unless caller has explicit
`auth:principal:read_full` scope.

**Errors.** `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND` (returned
even on permission failure to prevent enumeration; NFR-13).

**Audit.** `principal.read` (sampled).

**Performance.** p95 ≤ 15 ms.

### 5.3 `reconcile`

**Purpose.** Operator-triggered Clerk reconciliation pass (EC-2
fallback when webhook drift exceeds threshold).

**Caller.** Operator, role `credential-issuer`.

**Input.** `{ scope: "all" | { principal_ids: string[] } }`

**Output.** `{ examined: number; updated: number; created: number; failed: number; correlation_id: string }`

**Idempotency.** Safe to re-run; updates only on true drift.

**Audit.** `principal.reconciled`.

**Performance.** Async: returns `correlation_id` immediately and
emits a completion event.

---

## 6. The `getPrincipal()` guard surface

Exported from `@spyglass/auth`. Not a tRPC procedure — it is the
in-process function every Next.js route, Inngest function, and tRPC
middleware calls. Sketched here so consumers can plan against it.

```ts
// Type-level: callers cannot reach business logic without resolving.
declare function getPrincipal(
  ctx: RequestContext,
  opts?: {
    require?: PrincipalKind | ReadonlyArray<PrincipalKind>;
    requireScopes?: ReadonlyArray<string>;
    requireRoles?: ReadonlyArray<string>;
    requireAAL?: "AAL2" | "AAL3";
    allowAnonymous?: false;          // explicit anonymous opt-in only
  }
): Promise<Principal>;               // throws AuthError otherwise

// Explicit anonymous variant: callers must name it (FR-36).
declare function getPrincipalAllowingAnonymous(
  ctx: RequestContext
): Promise<Principal | null>;
```

**Behavior.**
- Resolves the inbound credential (Clerk session cookie, agent JWT,
  service JWT) into a `Principal`.
- Performs lazy materialization on cache miss for human principals
  (EC-1).
- Verifies signatures offline against the JWKS (FR-18).
- Checks the revocation list (FR-21) at credential mint and at any
  cross-process refresh boundary; in-process verification is JWT-only
  except when the credential has crossed a process boundary, in which
  case the revocation list is consulted.
- Emits structured audit events on rejection (NFR-7).
- Result is memoized per request via AsyncLocalStorage so repeated
  calls in the same request are free.

**CI assertion (NFR-11).** A typecheck-time + runtime test fails the
build if any guarded handler can be reached without producing a
typed `Principal`. Mechanism is plan-time but the contract is:
**zero anonymous mutating paths**.

---

## 7. `authRouter.meta`

### 7.1 `jwksFingerprint`

**Purpose.** Cheap consistency check for in-app verifiers: returns
the SHA-256 of the published JWKS so consumers can detect rotation
without parsing the full set.

**Caller.** Any authenticated principal.

**Input.** none.

**Output.** `{ sha256: string; kids: ReadonlyArray<string>; rotated_at: number }`

**Audit.** None.

**Performance.** p95 ≤ 5 ms (cached).

---

## 8. Mapping to spec requirements

| Procedure / surface         | FR / Story                              |
|-----------------------------|------------------------------------------|
| `credentials.issueAgent`    | FR-17, FR-18, FR-19, FR-20, EC-8, Story 4 |
| `credentials.revokeAgent`   | FR-21, EC-5, EC-6                        |
| `credentials.issueService`  | FR-26a, FR-25, Story 5                   |
| `credentials.revokeService` | FR-26, Story 5/6                         |
| `credentials.listRevoked`   | FR-21                                    |
| `operator.emergency*`       | FR-41, Story 6                           |
| `operator.revokeAllSessions`| FR-35, EC-12                             |
| `principal.whoami`          | FR-37, Story 7                           |
| `principal.getById`         | NFR-10, NFR-13                           |
| `principal.reconcile`       | EC-2                                     |
| `meta.jwksFingerprint`      | NFR-5, EC-11                             |
| `getPrincipal()` guard      | FR-1, FR-2, FR-36, FR-37, NFR-1, NFR-11  |
| `/webhooks/clerk` (REST)    | FR-6, EC-1, EC-2                         |
| `/.well-known/jwks.json`    | FR-18, FR-26a                            |

---

## 9. Why these live on tRPC vs. REST

- **In-app, in-process, typed.** Issuance, revocation, lookup, and
  reconciliation are consumed only by code we own (F08 runner, F05
  audit, operator CLI built into `apps/web`). tRPC gives end-to-end
  types and zero translation overhead — exactly the case PRD §7
  reserves for tRPC.
- **REST is reserved for external/webhook surfaces.** Clerk speaks
  REST + Svix-signed JSON; F08.5 verifiers fetch JWKS via plain
  HTTPS. Those — and only those — live in `auth-api.yaml`.
- **Service-to-service still uses tRPC** because all our services
  are Spyglass-owned in v0. If we ever need to expose issuance to a
  non-Spyglass service, we will publish a thin REST adapter; we do
  not pre-build that adapter here (YAGNI; FR-42 keeps the option
  open).

---

## 10. Federation-readiness shape (FR-42)

The agent-credential issuance interface is structured so a future
external issuer (OIDC, OAuth2/DPoP, W3C VC) can be plugged in without
reshaping `credentials.issueAgent`'s callers. The pluggable seam is
internal to `@spyglass/auth` (an `AgentIssuer` interface with
`mint(input) → JWT` plus `revoke(principal_id)`). v0 ships the
hosted-agent issuer only; the interface exists.
