import { createHash, randomBytes } from "node:crypto";

import { hasScope } from "@spyglass/auth";

import { forbidden, unauthorized } from "./errors";
import type { EmployerApiScope } from "./schemas";

export interface EmployerApiCredentialRecord {
  readonly credential_id: string;
  readonly org_id: string;
  readonly principal_id: string;
  readonly display_name: string;
  readonly secret_hash: string;
  readonly scopes: readonly string[];
  readonly status: "active" | "rotating" | "revoked" | "expired";
  readonly expires_at: Date | null;
}

export interface EmployerApiCredentialRepo {
  findActiveBySecretHash(
    secretHash: string,
    now: Date,
  ): Promise<EmployerApiCredentialRecord | null>;
  recordUse(credentialId: string, usedAt: Date): Promise<void>;
  insertCredential(record: NewEmployerApiCredential): Promise<EmployerApiCredentialRecord>;
  listCredentials(orgId: string): Promise<readonly EmployerApiCredentialRecord[]>;
  updateCredentialStatus(
    credentialId: string,
    status: EmployerApiCredentialRecord["status"],
    now: Date,
  ): Promise<void>;
}

export interface NewEmployerApiCredential {
  readonly org_id: string;
  readonly principal_id: string;
  readonly display_name: string;
  readonly secret_hash: string;
  readonly scopes: readonly EmployerApiScope[];
  readonly expires_at: Date | null;
}

export interface IssuedEmployerApiCredential {
  readonly credential: EmployerApiCredentialRecord;
  readonly secret: string;
}

export interface EmployerApiPrincipal {
  readonly kind: "service";
  readonly principal_id: string;
  readonly credential_id: string;
  readonly org_id: string;
  readonly display_name: string;
  readonly scopes: readonly string[];
}

export const EMPLOYER_API_SCOPES = {
  reqRead: "employer.req.read",
  reqWrite: "employer.req.write",
  webhookRead: "employer.webhook.read",
  webhookWrite: "employer.webhook.write",
  credentialWrite: "employer.credential.write",
} as const satisfies Record<string, EmployerApiScope>;

export function hashEmployerApiSecret(secret: string): string {
  return `sha256:${createHash("sha256").update(secret, "utf8").digest("hex")}`;
}

export function generateEmployerApiSecret(): string {
  return `sk_emp_${randomBytes(32).toString("base64url")}`;
}

export function extractBearerToken(headers: Headers): string {
  const authorization = headers.get("authorization");
  if (!authorization) {
    throw unauthorized();
  }

  const [scheme, token, extra] = authorization.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer" || !token || extra) {
    throw unauthorized();
  }

  return token;
}

export async function authenticateEmployerApiRequest(
  headers: Headers,
  repo: EmployerApiCredentialRepo,
  requiredScope: EmployerApiScope,
  now = new Date(),
): Promise<EmployerApiPrincipal> {
  const secret = extractBearerToken(headers);
  const credential = await repo.findActiveBySecretHash(hashEmployerApiSecret(secret), now);
  if (!credential) {
    throw unauthorized();
  }

  if (credential.status !== "active" && credential.status !== "rotating") {
    throw unauthorized("Employer API credential is not active.");
  }

  if (credential.expires_at && credential.expires_at.getTime() <= now.getTime()) {
    throw unauthorized("Employer API credential is expired.");
  }

  if (!hasScope(credential.scopes, requiredScope)) {
    throw forbidden();
  }

  await repo.recordUse(credential.credential_id, now);

  return {
    kind: "service",
    principal_id: credential.principal_id,
    credential_id: credential.credential_id,
    org_id: credential.org_id,
    display_name: credential.display_name,
    scopes: credential.scopes,
  };
}

export async function issueEmployerApiCredential(
  repo: EmployerApiCredentialRepo,
  input: Omit<NewEmployerApiCredential, "secret_hash">,
): Promise<IssuedEmployerApiCredential> {
  const secret = generateEmployerApiSecret();
  const credential = await repo.insertCredential({
    ...input,
    secret_hash: hashEmployerApiSecret(secret),
  });
  return { credential, secret };
}

export async function rotateEmployerApiCredential(
  repo: EmployerApiCredentialRepo,
  currentCredentialId: string,
  input: Omit<NewEmployerApiCredential, "secret_hash">,
): Promise<IssuedEmployerApiCredential> {
  await repo.updateCredentialStatus(currentCredentialId, "rotating", new Date());
  return issueEmployerApiCredential(repo, input);
}

export async function revokeEmployerApiCredential(
  repo: EmployerApiCredentialRepo,
  credentialId: string,
  now = new Date(),
): Promise<void> {
  await repo.updateCredentialStatus(credentialId, "revoked", now);
}
