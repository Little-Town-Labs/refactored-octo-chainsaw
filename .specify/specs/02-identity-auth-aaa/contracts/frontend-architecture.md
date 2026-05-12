# F02 — Frontend (React / Next.js) Component Architecture

**Status:** Draft v0.1 (planning artifact, not implementation)
**Companion to:** `spec.md` v1.2
**Stack:** Next.js 16 App Router, React 19 (RSC by default), TypeScript strict, Clerk, Tailwind, shadcn/ui, Radix
**Constitution refs:** §I.5 (AAA), §I.6 (defense-in-depth), §III.1 (WCAG 2.2 AA)

---

## 0. Guiding posture

PRD §3.4 commits Spyglass to "deliberately not SaaS." Clerk hosts every
account-management view (signup, login, MFA enrollment, password reset,
email verification, profile). The Spyglass-side React surface for F02
is therefore intentionally narrow:

1. A `middleware.ts` (Next.js 16; in v16 the file is renamed `proxy.ts`
   but the contract is identical — see "File conventions" note in the
   nextjs skill) that gates every route and produces a typed `Principal`.
2. A `<PrincipalProvider>` boundary mounted once per route group's root
   layout that hands the per-request `Principal` to client components.
3. A small library of declarative guards (`requireScope`, `requireRole`,
   `requireKind`) consumed by feature packages — never re-implemented at
   the call site (FR-27, FR-30, FR-31).
4. Three UX components Spyglass actually renders: the role-elevation
   prompt, the sign-out confirmation, and the MFA-step banner.
5. The operator console (v0): list / issue / revoke agent credentials
   plus an audit-event viewer. This is the only F02 audience that gets
   a meaningful first-party UI in v0.

Everything else (seeker dashboard, employer dashboard, signup forms,
profile editor, MFA setup wizard) does not exist as Spyglass code in v0
and must not be added without an explicit constitutional amendment.

---

## 1. Folder structure (`apps/web/`)

ASCII tree. Route groups separate audiences without leaking into the
URL. Each group owns its own root layout, which is where the
`<PrincipalProvider>` mounts and where audience-specific MFA / scope
gates apply. Clerk's hosted catch-alls live inside each group so the
sign-in URL is audience-aware (`/employer/sign-in/...`,
`/operator/sign-in/...`).

```
apps/web/
├── proxy.ts                           # Next.js 16 routing middleware (was middleware.ts)
│                                      # → calls Clerk + @spyglass/auth, materializes Principal,
│                                      #   denies unauthenticated requests per route group,
│                                      #   never runs business logic
│
├── app/
│   ├── layout.tsx                     # root HTML shell, font/theme, no auth state
│   ├── page.tsx                       # marketing landing (anonymous-allowed, explicitly marked)
│   ├── error.tsx                      # generic error boundary (no PII)
│   ├── not-found.tsx
│   │
│   ├── (seeker)/                      # single-user Clerk accounts; MFA optional
│   │   ├── layout.tsx                 # mounts <PrincipalProvider kind="human:seeker">
│   │   ├── sign-in/[[...rest]]/page.tsx     # Clerk <SignIn />, no custom UI
│   │   ├── sign-up/[[...rest]]/page.tsx     # Clerk <SignUp />
│   │   └── account/                   # Clerk-hosted profile mount; no Spyglass profile views
│   │       └── [[...rest]]/page.tsx
│   │
│   ├── (employer)/                    # Clerk Orgs; mandatory AAL2
│   │   ├── layout.tsx                 # <PrincipalProvider kind="human:employer_*">,
│   │   │                              # <RequireAAL2 />, <MfaStepBanner />
│   │   ├── sign-in/[[...rest]]/page.tsx
│   │   ├── sign-up/[[...rest]]/page.tsx
│   │   ├── select-org/page.tsx        # Clerk <OrganizationSwitcher /> wrapper only
│   │   └── (placeholder for F22 employer console — not F02 territory)
│   │
│   └── (operator)/                    # restricted Clerk Org; hidden surface; mandatory AAL2
│       ├── layout.tsx                 # <PrincipalProvider kind="human:operator">,
│       │                              # <RequireAAL2 />, <RequireRole oneOf=[...]>
│       ├── sign-in/[[...rest]]/page.tsx     # hidden URL — not linked from marketing
│       ├── console/
│       │   ├── layout.tsx             # operator console chrome (nav + skip-link + landmarks)
│       │   ├── page.tsx               # default landing → credentials list
│       │   ├── credentials/
│       │   │   ├── page.tsx           # RSC: list issued agent credentials
│       │   │   ├── issue/page.tsx     # form (server action)
│       │   │   └── [id]/revoke/page.tsx  # confirm + server action
│       │   └── audit/page.tsx         # audit event viewer (read-only, paginated)
│       └── default.tsx
│
├── components/
│   ├── auth/
│   │   ├── principal-provider.tsx     # 'use client' — hydrates Principal into RSC tree
│   │   ├── require-scope.tsx          # 'use client' guard wrapper
│   │   ├── require-role.tsx           # 'use client' guard wrapper
│   │   ├── mfa-step-banner.tsx        # WCAG-AA, non-enumerating copy
│   │   ├── role-elevation-prompt.tsx  # Radix dialog
│   │   └── sign-out-confirmation.tsx  # Radix alert-dialog
│   └── ui/                            # shadcn primitives
│
├── lib/
│   └── auth/
│       ├── get-principal.ts           # server-only: cache()ed per-request principal lookup
│       ├── require.ts                 # server-only: requireScope/requireRole/requireKind
│       └── server-actions.ts          # `withPrincipal(action)` higher-order wrapper
│
└── ...
```

Notes:

- Route groups (`(seeker)`, `(employer)`, `(operator)`) do not appear
  in URLs. Audiences are separated by group, not by subdomain — keeps
  Clerk session cookies single-domain in v0.
- The operator sign-in URL is intentionally not linked from any
  marketing or employer landing surface (FR-9). Discoverability is via
  a published runbook entry, not the public site.
- `packages/auth` (a separate workspace package, not under `apps/web/`)
  owns the `Principal` type, the JWT verification primitives, and the
  scope/role registries. `apps/web/lib/auth/` only re-exports
  Next.js-flavored helpers — it does not re-implement the model.

---

## 2. Authentication middleware (`proxy.ts`)

### What it does

1. Runs on every request, including RSC navigations and route handlers.
2. Resolves the Clerk session (via `clerkMiddleware` from
   `@clerk/nextjs/server`).
3. Calls `@spyglass/auth.materializePrincipal({ clerkAuth, request })`,
   which:
   - Looks up the internal `principal_id` keyed by Clerk user ID.
   - Lazily creates the internal principal row on first sight (EC-1).
   - Discriminates `human:seeker | human:employer_admin |
     human:employer_member | human:operator`.
   - Loads role + scope set for human principals.
   - For agent / service requests on internal API paths, parses the
     bearer JWT and verifies it offline (FR-18).
4. Stamps the typed `Principal` onto the request via `headers()`-level
   mutation through Next.js `NextResponse.next({ request: { headers }})`
   so downstream RSCs and route handlers read it via `getPrincipal()`
   without re-validating.
5. Enforces audience gates per route group:
   - `(seeker)` — requires `kind === "human"` and tier `seeker`.
   - `(employer)` — requires tier `employer_*` AND `aal >= 2`. Below
     AAL2 redirects to Clerk's MFA enrollment URL.
   - `(operator)` — requires tier `operator` AND `aal >= 2` AND a role
     belonging to the operator role set; otherwise 404 (not 403 — do
     not advertise the surface exists; consistent with FR-9 and NFR-13).
6. Routes flagged `export const dynamic = "force-static"` or marked
   anonymous-allowed in a registry are allowed through without a
   principal. Anonymous-allowed paths are an explicit list, not a
   default (FR-36).
7. Emits a structured event on every authentication failure (NFR-7,
   NFR-10) — never a free-text log line, never a credential value
   (NFR-6).

### What it does NOT do

- No business logic. No ticket lookups, no employer-org membership
  derivation beyond what Clerk already returns, no policy decisions.
- No DB writes other than the lazy principal materialization in EC-1
  (and even that calls into `@spyglass/auth`, not raw SQL here).
- No per-feature scope checks. Scope checks are the responsibility of
  the route handler / RSC itself via the declarative guards in §4.
- No raw credentials surfaced to handlers — the Principal type
  carries `principal_id` and metadata only; the underlying JWT /
  Clerk session token never leaves the middleware boundary (FR-37).

### Unauthenticated-request handling

| Route group | Unauth response |
|-------------|-----------------|
| Public marketing (`/`, `/about`) | Pass through. |
| `(seeker)/sign-in`, `(seeker)/sign-up` | Pass through (Clerk owns). |
| `(seeker)/account/*` | Redirect to `(seeker)/sign-in`. |
| `(employer)/sign-in`, `(employer)/sign-up` | Pass through. |
| `(employer)/*` (other) | Redirect to `(employer)/sign-in`; if authed but AAL1, redirect to Clerk MFA enrollment. |
| `(operator)/*` | **404, not 403.** Hidden surface (FR-9). Sign-in URL only reachable if you already know it. |
| `/api/*` | `401` with structured JSON failure shape; never an HTML redirect. |

---

## 3. `Principal` context — RSC vs client component

The `Principal` is per-request state. Two access modes coexist:

### 3.1 Server-side (RSC, server actions, route handlers)

Use `getPrincipal()` from `apps/web/lib/auth/get-principal.ts`. It
reads the principal stamped by the middleware (via `headers()`) and is
wrapped in `React.cache()` so multiple RSC calls in the same render
pass de-duplicate.

```ts
// apps/web/lib/auth/get-principal.ts (signature only)
import 'server-only';
export const getPrincipal: () => Promise<Principal>;
export const getPrincipalOrNull: () => Promise<Principal | null>;

// Usage in an RSC:
//   const principal = await getPrincipal();   // throws if unauthenticated
//   <h1>Welcome, {principal.kind === 'human' ? principal.displayName : '...'}</h1>

// Usage in a server action:
//   'use server';
//   export const issueAgentCred = withPrincipal(
//     requireScope('credential:issue'),
//     async (principal, input: IssueInput) => { /* ... */ }
//   );
```

`withPrincipal` is the only sanctioned way to declare a server action
that touches authenticated state. It wires the principal in, runs the
declared scope guard, and emits the audit event on success or failure.
A server action defined without `withPrincipal` fails review
(`/code-review` rule, see §7).

### 3.2 Client-side

`<PrincipalProvider>` mounts once per route-group root layout. It
receives the principal from the RSC parent (serializable subset only —
no JWT, no Clerk session, no internal-only fields) and exposes a
`usePrincipal()` hook plus typed guard components.

```ts
// components/auth/principal-provider.tsx (signatures only)
'use client';
export function PrincipalProvider(props: {
  principal: ClientPrincipal;            // serializable projection
  children: React.ReactNode;
}): JSX.Element;

export function usePrincipal(): ClientPrincipal;
export function usePrincipalOrNull(): ClientPrincipal | null;

// ClientPrincipal is structurally a subset of Principal:
//   { principal_id; kind; tier?; roles; scopes; aal; displayName? }
// It deliberately omits any field that could leak credentials or
// internal-only metadata (FR-37).
```

The discriminated union (`kind: 'human' | 'agent' | 'service'`) is
preserved on the client so guard components remain type-safe.

### 3.3 FR-37 boundary

Every handler — RSC, server action, route handler, Inngest function —
sees a `Principal` typed object. None of them ever sees a raw Clerk
session token, a raw bearer JWT, or any other credential. The only
code paths permitted to handle raw credentials are:

- `proxy.ts` (resolves Clerk + verifies agent/service JWTs).
- `packages/auth` internals (issuance, verification primitives).

A grep-able lint rule rejects imports of `@clerk/nextjs/server`'s
`auth()` outside `proxy.ts` and `packages/auth/` — feature code must
go through `getPrincipal()`.

---

## 4. Role / scope guards (declarative)

Feature packages declare the scope they require; they do not write
ad-hoc `if (principal.role === ...)` checks. (FR-27, FR-30, FR-31.)

### 4.1 Server-side guards

```ts
// apps/web/lib/auth/require.ts (signatures only)
import 'server-only';

export function requireKind<K extends Principal['kind']>(
  kind: K
): (p: Principal) => asserts p is Extract<Principal, { kind: K }>;

export function requireRole(
  role: KnownRole | KnownRole[]
): (p: Principal) => void;

export function requireScope(
  scope: KnownScope | KnownScope[]
): (p: Principal) => void;

// Composable:
export function withPrincipal<TArgs extends unknown[], TResult>(
  ...checks: Array<(p: Principal) => void>
): (
  fn: (p: Principal, ...args: TArgs) => Promise<TResult>
) => (...args: TArgs) => Promise<TResult>;
```

Failure of any guard throws a typed `AuthorizationError` carrying
`{ principal_id, attemptedScope, role }`. The error boundary at the
route-group layout converts it to a structured failure (HTML 403 or
JSON `{ error: 'forbidden', code: 'scope_missing' }`) and emits the
audit event. The error message shown to the user is non-enumerating
(NFR-13).

### 4.2 Client-side guards (UI affordance only — never the trust boundary)

```tsx
// components/auth/require-scope.tsx (signature only)
export function RequireScope(props: {
  scope: KnownScope | KnownScope[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}): JSX.Element;
```

Used to hide menu items or buttons the current principal cannot use.
The underlying server action **must** still call `requireScope()` —
the client guard is cosmetic, not authoritative. This is documented
where the component lives so future contributors do not mistake it
for a security boundary (zero-trust per FR-29).

### 4.3 Scope registry

Scopes are declared in `packages/auth/src/scopes.ts` as a typed
constant union. Feature packages import the names they require; they
do not invent strings at the call site. Adding a scope is an additive
change to the union, not a change to `@spyglass/auth`'s decision
engine (FR-31).

---

## 5. Operator console layout (v0)

Minimal first-party UI. Renders inside `(operator)/console/`. WCAG 2.2
AA (Constitution §III.1; NFR-14). Read-mostly, with two write actions
(issue, revoke).

### 5.1 Information architecture

```
/console
├── /credentials                    (default landing)
│   ├── list (table, paginated, filterable by status / contract)
│   ├── /issue                      (form → server action)
│   └── /[id]/revoke                (confirmation → server action)
└── /audit                          (event log viewer, read-only)
```

### 5.2 Component contracts (signatures only)

```tsx
// app/(operator)/console/credentials/page.tsx — RSC
export default async function CredentialsListPage(): Promise<JSX.Element>;
// Internally: requireRole(['credential-issuer','dossier-viewer'])

// IssueAgentCredentialForm — server-action-backed form
type IssueInput = {
  contractId: string; contractVersion: string;
  side: 'seeker' | 'employer'; ticketId: string;
  ttlMinutes: number; // ≤ 120 (FR-20)
};
export function IssueAgentCredentialForm(props: {
  action: (formData: FormData) => Promise<IssueResult>;
}): JSX.Element;

// RevokeCredentialButton — confirms via Radix AlertDialog
export function RevokeCredentialButton(props: {
  credentialId: string;
  onConfirm: () => Promise<void>;
}): JSX.Element;

// AuditEventTable — RSC, paginated
export default async function AuditPage(props: {
  searchParams: Promise<{ cursor?: string; principalId?: string }>;
}): Promise<JSX.Element>;
```

### 5.3 Accessibility specifics

- Skip-link to main, landmark roles (`<nav>`, `<main>`, `<aside>`).
- Tables use `<caption>` + `scope="col"` headers; sortable columns
  expose `aria-sort`.
- Forms: visible labels, `aria-describedby` for inline help, error
  summaries linked from the submit button via `aria-errormessage`,
  focus-visible styling honored, no color-only state.
- Confirmation dialogs use Radix `AlertDialog` (focus trap, ESC,
  labelled by title, described by body).
- Live regions (`aria-live="polite"`) announce server-action results.
- Color contrast meets WCAG 2.2 AA (4.5:1 text, 3:1 large/UI).
- All interactive controls are reachable and operable via keyboard
  alone; tab order matches visual order.
- The credential value itself is shown **once** at issuance time in a
  copy-to-clipboard control with an explicit "this will not be shown
  again" notice; it is never persisted in client state, never sent to
  analytics, and never logged (NFR-6).

### 5.4 Error & empty states

Empty states are explicit ("No credentials issued yet"). Error states
do not surface credential values, internal IDs other than the
`principal_id` (which is opaque by design — FR-2), or stack traces.
Error copy follows NFR-13: actionable but non-enumerating.

---

## 6. MFA-step banner & sign-out confirmation

The two seeker/employer-facing components F02 actually ships.

### 6.1 `<MfaStepBanner />`

Surfaces between AAL1 sign-in and the AAL2 enrollment flow on
employer/operator surfaces. Mounted by the route-group layout when
the middleware indicates `requiresMfaEnrollment === true`.

```tsx
export function MfaStepBanner(props: {
  audience: 'employer' | 'operator';
  enrollmentUrl: string;            // Clerk-hosted enrollment URL
  preferredFactor?: 'passkey' | 'totp';
}): JSX.Element;
```

Behavior:

- Renders as a `role="status"` region above main content with
  `aria-live="polite"`.
- Copy recommends passkey first, TOTP second, SMS only on request
  (NFR-12).
- The CTA link points at the Clerk enrollment URL — Spyglass renders
  no enrollment form itself.
- Non-enumerating copy: never indicates whether the user has any
  factors enrolled to anyone but the user themselves; never lists
  factor types in error states (NFR-13).
- Dismissal is **not** offered on operator surfaces (mandatory). On
  employer-admin surfaces, "remind me later" is offered only if the
  middleware has not yet hard-gated the action.

### 6.2 `<SignOutConfirmation />`

Radix `AlertDialog`. Confirms before terminating the Clerk session.

```tsx
export function SignOutConfirmation(props: {
  trigger: React.ReactNode;
  onConfirm: () => Promise<void>;   // calls server action that ends Clerk session
  scope?: 'this-device' | 'all-devices';
}): JSX.Element;
```

Behavior:

- Default scope is `this-device`; `all-devices` is offered as an
  explicit second option (maps to Clerk's revoke-all-sessions) for
  operator and employer-admin tiers (FR-35 surfaces).
- Focus trap, ESC to cancel, labelled / described per Radix defaults.
- On confirm, redirects to the audience-appropriate sign-in page (not
  to a generic landing — keeps the operator surface hidden).
- Emits an audit event tied to the principal (NFR-10).

---

## 7. Anti-patterns to avoid (name them so `/code-review` flags them)

These are the predictable mistakes. Enumerated so the code reviewer
agent can scan for them mechanically.

| # | Anti-pattern | Why it's wrong | Detection hint |
|---|--------------|----------------|----------------|
| AP-1 | Importing `auth()` from `@clerk/nextjs/server` outside `proxy.ts` or `packages/auth` | Bypasses the typed `Principal`; couples feature code to Clerk; breaks FR-2 IdP-agnostic mandate. | grep `@clerk/nextjs/server` outside allowlisted files. |
| AP-2 | Using a Clerk user ID as a foreign key in a Spyglass table | Violates FR-2 (opaque internal `principal_id` is the system key). Makes a future IdP migration require schema changes in every consumer. | grep `clerkUserId`/`clerk_user_id` in non-`packages/auth` migrations. |
| AP-3 | Server action without `withPrincipal()` | Allows business logic to run without a typed principal; violates FR-37. | AST rule: any `'use server'` function exported from feature code must be wrapped. |
| AP-4 | Inline `if (principal.role === 'admin')` in feature code | Re-derives authorization at the call site; violates FR-27, FR-30. | grep `principal.role ===` / `principal.scopes.includes(` outside `packages/auth`. |
| AP-5 | Trusting `<RequireScope>` (client) as a security boundary | Client guards are cosmetic; bypassable. The server action must re-check. | Comment on every `RequireScope` use that lacks a server-side counterpart. |
| AP-6 | Returning a raw Clerk session token, agent JWT, or signing key in any RSC, server action, or route handler payload | Violates FR-37 / NFR-6. Any credential leaking past the middleware boundary is sev-1. | grep for token-shaped fields (`token`, `jwt`, `bearer`) in serialized RSC responses; CI lint enforces. |
| AP-7 | Logging `principal` objects with `console.log` (or equivalent) | Risks leaking metadata; violates NFR-6 spirit. | Existing `console.log` guard in repo hooks. |
| AP-8 | Building a Spyglass-side signup, profile-edit, or password-reset view | Violates PRD §3.4 and FR-6. Clerk owns those flows entirely. | Reviewer flags any new file under `(seeker)|(employer)|(operator)` whose name matches `signup|profile|password|reset|verify`. |
| AP-9 | Adding a redirect from the operator sign-in page to a public surface (or vice versa) | Erodes the hidden-surface requirement (FR-9). | Reviewer flags route changes touching `(operator)/sign-in` or any link target pointing into `(operator)`. |
| AP-10 | Returning `403` (vs `404`) from `(operator)/*` for unauthenticated or unauthorized requests | Confirms the surface exists; violates FR-9 + NFR-13. | Middleware test: unauth request to `(operator)/console` returns 404. |
| AP-11 | Promoting a Vercel OIDC token to `Principal.kind === 'service'` | Violates FR-26b/FR-26c. Vercel OIDC is for the deploy boundary only. | Reviewer flags any reference to `vercel-oidc` outside CI workflow files. |
| AP-12 | Surfacing whether an account exists / what MFA factors are enrolled in error UI | Violates NFR-13. | Reviewer flags any error-copy string that branches on "user not found" / "invalid factor". |

---

## 8. Open architectural questions

Tracked here so they don't get lost; not blocking the planning phase.

- **Q-1.** Should the `<PrincipalProvider>` accept a `Suspense`
  fallback to support partial-pre-rendering (PPR) of the operator
  console? Likely yes once Cache Components are wired in F02 follow-on
  work, but PPR is not a v0 requirement.
- **Q-2.** Where should the operator audit-event viewer's pagination
  cursor live — URL searchParams (shareable) or signed cookie
  (operator-private)? Default: searchParams; cursors are opaque, not
  PII. Confirm with security review.
- **Q-3.** Does Clerk's `<SignIn />` component pass automated WCAG 2.2
  AA scans in its current published version? NFR-14 inherits Clerk's
  posture but we should pin a specific Clerk version + accessibility
  attestation in the rationale doc.
- **Q-4.** For EC-1 (lazy materialization), where does the "no
  privileged action before materialization completes" check live —
  inside `getPrincipal()` (returns a discriminated `'pending'` state)
  or as a separate guard? Recommendation: discriminated state, so
  feature code's exhaustiveness check forces a decision.

---

*End of contract.*
