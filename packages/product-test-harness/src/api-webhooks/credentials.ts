import type {
  EmployerApiCredential,
  EmployerApiDenialReason,
  EmployerApiRequest,
  EmployerApiScope,
} from "../contracts.js";

export const PTH07_BASE_TIME = "2026-05-27T13:00:00.000Z";

export function createEmployerApiCredential(
  overrides: Partial<EmployerApiCredential> = {},
): EmployerApiCredential {
  return {
    credential_id: "credential://employer/pth07/service",
    employer_ref: "employer://alpha/acme-health",
    scopes: ["req:write", "req:read", "webhook:manage"],
    issued_at: PTH07_BASE_TIME,
    expires_at: "2026-05-28T13:00:00.000Z",
    redacted_secret_ref: "secret://redacted/employer/pth07/service",
    ...overrides,
  };
}

export function missingScopeCredential(): EmployerApiCredential {
  return createEmployerApiCredential({
    credential_id: "credential://employer/pth07/read-only",
    scopes: ["req:read"],
    redacted_secret_ref: "secret://redacted/employer/pth07/read-only",
  });
}

export function authorizeEmployerApiRequest(
  request: EmployerApiRequest,
  now = PTH07_BASE_TIME,
):
  | { readonly authorized: true }
  | { readonly authorized: false; readonly reason: EmployerApiDenialReason } {
  if (!request.credential) return { authorized: false, reason: "missing_authorization" };
  if (Date.parse(request.credential.expires_at) <= Date.parse(now)) {
    return { authorized: false, reason: "credential_expired" };
  }
  const grantedScopes = new Set<EmployerApiScope>(request.credential.scopes);
  const missingScope = request.required_scopes.some((scope) => !grantedScopes.has(scope));
  if (missingScope) return { authorized: false, reason: "missing_scope" };
  return { authorized: true };
}
