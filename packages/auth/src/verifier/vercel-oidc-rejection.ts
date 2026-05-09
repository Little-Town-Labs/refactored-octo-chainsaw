// F02 T054 — Vercel-OIDC rejection guard (FR-26b, FR-26c).
//
// In-app service surfaces accept ONLY F02-issued service credentials.
// Vercel OIDC tokens are platform-scoped — issued by Vercel for the
// deploy boundary (e.g. GitHub-Actions → Vercel deploy auth) and
// never promoted to the in-app `Principal.kind === "service"` model
// (FR-26a, FR-26b).
//
// Without this guard, a Vercel OIDC token presented to an in-app
// surface would collapse into a generic `bad_issuer` /
// `bad_signature` failure inside `verifyServiceCredential`, which
// would mask the security-relevant fact that a deploy-boundary token
// is being misused. Per FR-26c, the failure must be *structured* so
// it can be audited as a distinct event class.
//
// Pure decode (no signature check) is intentional. The guard only ever
// produces a *deny* — an attacker forging an unsigned token with
// `iss === oidc.vercel.com` only achieves their own rejection, so
// signature verification here would add no security and would defeat
// the structured-deny purpose. Do not "harden" by verifying the
// signature. Callers MUST invoke this guard BEFORE
// `verifyServiceCredential` at every in-app service boundary;
// `verifyServiceCredential` continues to enforce signature, expiry,
// audience, and revocation on the F02-issued token that survives.

import { decodeJwt } from "jose";

/** Canonical Vercel OIDC issuer host (case-insensitive match). */
const VERCEL_OIDC_HOST = "oidc.vercel.com";

export class VercelOidcAtInAppSurfaceError extends Error {
  readonly token_kind = "vercel_oidc" as const;
  readonly issuer: string;

  constructor(issuer: string) {
    super(
      "Vercel OIDC token presented to an in-app service surface. " +
        "Vercel OIDC is accepted only at the deploy boundary; " +
        "in-app service identity uses F02-issued credentials.",
    );
    this.name = "VercelOidcAtInAppSurfaceError";
    this.issuer = issuer;
  }
}

/**
 * Reject Vercel OIDC tokens at in-app service surfaces (FR-26c).
 *
 * Behavior:
 *  - Decodes the JWT *without* signature verification — this is a
 *    cheap pre-check; the downstream verifier still does the real
 *    cryptographic work on whatever survives.
 *  - If the `iss` claim resolves to the Vercel OIDC host (matched on
 *    URL host, case-insensitive — never substring), throws
 *    `VercelOidcAtInAppSurfaceError`.
 *  - If decoding fails, `iss` is missing, `iss` is non-string, or
 *    `iss` is not a parseable URL: returns silently. The downstream
 *    verifier then produces its own `malformed_payload` /
 *    `bad_issuer` error. This guard exists to add a *distinct*
 *    rejection reason, not to replace generic verifier errors.
 */
export function assertNotVercelOidc(token: string): void {
  let iss: unknown;
  try {
    iss = decodeJwt(token).iss;
  } catch {
    return;
  }

  if (typeof iss !== "string" || iss.length === 0) return;

  let host: string;
  try {
    // Use `hostname` (not `host`) to drop any port; strip a single
    // trailing dot (a valid DNS form) so `oidc.vercel.com.` matches.
    host = new URL(iss).hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return;
  }

  if (host === VERCEL_OIDC_HOST) {
    throw new VercelOidcAtInAppSurfaceError(iss);
  }
}
