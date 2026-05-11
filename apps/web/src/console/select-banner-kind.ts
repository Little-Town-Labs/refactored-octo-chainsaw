// F02 T061 — Typed-error → AuthBannerKind mapping (NFR-13).
//
// Lives outside the route-group so tests don't depend on the
// `(operator)` path string and so server actions can call it
// directly if they ever need to pre-stage a banner state.
//
// Discrimination is by `error.name`, not `instanceof`. Next.js
// serializes thrown errors across the RSC/client boundary which
// preserves `name`/`message`/`digest` but drops the prototype
// chain, so `instanceof` fails inside `error.tsx`.
//
// Adding a typed error from `@spyglass/auth` here only changes
// which banner copy renders — the banner copy itself stays fixed
// (see auth-banner.tsx for the NFR-13 rationale).

import type { AuthBannerKind } from "./auth-banner.js";

const FORM_INVALID_NAMES: ReadonlySet<string> = new Set([
  "SignOutFormInvalidError",
  "RevokeFormInvalidError",
  "IssueFormInvalidError",
  // Issuance conflicts surface as a re-runnable user choice
  // (different principal, different scope subset, different
  // contract version) rather than an unrecoverable server fault.
  "IssuanceConflictError",
  "ServiceIssuanceConflictError",
  // Approval-flow errors from revoke-all-sessions are also
  // form_invalid — they ask the operator to re-initiate or seek
  // a fresh approval link.
  "ApprovalNotFoundError",
  "ApprovalAlreadyExecutedError",
  "SelfApprovalError",
  "TargetNotFoundError",
  "TargetNotHumanError",
  "InvalidCursorError",
]);

const FORBIDDEN_NAMES: ReadonlySet<string> = new Set([
  "RoleRequiredError",
  "ScopeRequiredError",
  "PrincipalDisabledError",
  // Defense-in-depth: a Vercel OIDC token at an in-app surface is
  // never something the operator can fix; surface as "denied"
  // rather than the verbose typed message.
  "VercelOidcAtInAppSurfaceError",
]);

const SESSION_EXPIRED_NAMES: ReadonlySet<string> = new Set([
  "AnonymousAccessError",
  "PrincipalRequiredError",
]);

// Placeholder for an in-app step-up signal. Today the proxy redirects
// step-up requests to Clerk's sign-in surface before any RSC page
// renders (see `decide-access.ts`), so the operator console rarely
// throws this. If a future surface throws an `MfaRequiredError`
// inside the boundary's segment, the mapping is in place.
const MFA_REQUIRED_NAMES: ReadonlySet<string> = new Set(["MfaRequiredError"]);

export function selectBannerKind(error: Error): AuthBannerKind {
  if (FORM_INVALID_NAMES.has(error.name)) return "form_invalid";
  if (FORBIDDEN_NAMES.has(error.name)) return "forbidden";
  if (SESSION_EXPIRED_NAMES.has(error.name)) return "session_expired";
  if (MFA_REQUIRED_NAMES.has(error.name)) return "mfa_required";
  return "generic_failure";
}
