// F02 B5-gate — `verifyServiceCredentialAtSurface` (FR-26b, FR-26c).
//
// Single seam used by every in-app service surface that needs to
// resolve `Principal.kind === "service"` from an inbound credential.
// Composes the Vercel-OIDC rejection guard with the standard service
// JWT verifier so that:
//
//  1. Vercel OIDC tokens are rejected as a *distinct* event class
//     (`service_credential.rejected_vercel_oidc`) before the generic
//     verifier ever sees them — without this, a misused deploy-
//     boundary token collapses into a generic `bad_issuer` /
//     `bad_signature` failure and the security-relevant fact is lost.
//
//  2. Everything else flows into `verifyServiceCredential`, which
//     enforces signature, expiry, audience, and revocation on the
//     F02-issued credential that survives.
//
// The wrapper exists specifically so the audit-event side of FR-26c
// has a caller. The pure guard (`assertNotVercelOidc`) intentionally
// has no audit dependency — composing them here keeps the guard
// reusable and the audit emission centralized.

import type { ServiceJwtClaims } from "../issuer/types.js";
import type { AuditEventSink } from "../materialize/types.js";
import { assertNotVercelOidc, VercelOidcAtInAppSurfaceError } from "./vercel-oidc-rejection.js";
import { verifyServiceCredential, type VerifyServiceOptions } from "./service-verify.js";

export interface VerifyAtSurfaceOptions extends VerifyServiceOptions {
  readonly auditSink: AuditEventSink;
  readonly correlationId: string;
}

export async function verifyServiceCredentialAtSurface(
  opts: VerifyAtSurfaceOptions,
): Promise<ServiceJwtClaims> {
  try {
    assertNotVercelOidc(opts.token);
  } catch (err) {
    if (err instanceof VercelOidcAtInAppSurfaceError) {
      // Sink failures must NOT mask the deny: an outage in the audit
      // pipeline cannot be allowed to re-classify a Vercel-OIDC
      // rejection into a generic sink error at the caller. Swallow
      // sink errors here; the original structured deny is what
      // surfaces propagate.
      try {
        await opts.auditSink.emit({
          name: "service_credential.rejected_vercel_oidc",
          correlation_id: opts.correlationId,
          payload: { token_kind: err.token_kind, issuer: err.issuer },
        });
      } catch {
        // intentionally swallowed — see comment above
      }
    }
    throw err;
  }
  return verifyServiceCredential(opts);
}
