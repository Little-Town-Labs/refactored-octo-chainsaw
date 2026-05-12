// F02 T041 — `verifyAgentCredential` (FR-18, FR-21, NFR-2).
//
// Verifies an agent JWT and returns the typed claims, or throws a
// `CredentialVerificationError` on any failure (signature, kid
// unknown, expiry, audience, issuer, revocation). Per Constitution
// §I.6 fail-safe deny — every failure mode throws; no silent allow.
//
// Revocation is consulted via an injected `RevocationChecker` so the
// hot path avoids a DB call per request (production wires a 5-min
// TTL cache that pulls the live revocation list).

import { jwtVerify, type JWTPayload } from "jose";

import type { JwksProvider } from "../issuer/key-source.js";
import type { AgentJwtClaims } from "../issuer/types.js";

export class CredentialVerificationError extends Error {
  constructor(
    public readonly reason: VerificationFailureReason,
    detail?: string,
  ) {
    super(
      detail
        ? `Credential verification failed: ${reason} (${detail})`
        : `Credential verification failed: ${reason}`,
    );
    this.name = "CredentialVerificationError";
  }
}

export type VerificationFailureReason =
  | "missing_kid"
  | "unknown_kid"
  | "bad_signature"
  | "bad_audience"
  | "bad_issuer"
  | "expired"
  | "not_yet_valid"
  | "malformed_payload"
  | "revoked";

/**
 * Returns true if the credential id is on the live revocation list
 * (FR-21). The verifier injects a real implementation that consults
 * the `revocations` table with a short cache; tests inject a fake.
 */
export interface RevocationChecker {
  isRevoked(credentialId: string): Promise<boolean>;
}

export interface VerifyOptions {
  readonly token: string;
  readonly expectedIssuer: string;
  readonly expectedAudience: string;
  readonly jwks: JwksProvider;
  readonly revocations: RevocationChecker;
  readonly now: () => number;
  /** Optional clock skew tolerance in seconds; defaults to 30s. */
  readonly clockSkewSeconds?: number;
}

export async function verifyAgentCredential(opts: VerifyOptions): Promise<AgentJwtClaims> {
  let payload: JWTPayload;
  try {
    const result = await jwtVerify(
      opts.token,
      async (header) => {
        if (typeof header.kid !== "string" || header.kid.length === 0) {
          throw new CredentialVerificationError("missing_kid");
        }
        const key = await opts.jwks.resolve(header.kid);
        if (key === null) {
          throw new CredentialVerificationError("unknown_kid", header.kid);
        }
        return key;
      },
      {
        algorithms: ["EdDSA"],
        issuer: opts.expectedIssuer,
        audience: opts.expectedAudience,
        clockTolerance: opts.clockSkewSeconds ?? 30,
        currentDate: new Date(opts.now() * 1000),
      },
    );
    payload = result.payload;
  } catch (cause) {
    if (cause instanceof CredentialVerificationError) throw cause;
    throw mapJoseError(cause);
  }

  const claims = assertClaimShape(payload);

  if (await opts.revocations.isRevoked(claims.jti)) {
    throw new CredentialVerificationError("revoked", claims.jti);
  }
  return claims;
}

function mapJoseError(cause: unknown): CredentialVerificationError {
  const code = (cause as { code?: string }).code;
  switch (code) {
    case "ERR_JWT_EXPIRED":
      return new CredentialVerificationError("expired");
    case "ERR_JWT_CLAIM_VALIDATION_FAILED": {
      const claim = (cause as { claim?: string }).claim;
      if (claim === "iss") return new CredentialVerificationError("bad_issuer");
      if (claim === "aud") return new CredentialVerificationError("bad_audience");
      if (claim === "nbf" || claim === "iat")
        return new CredentialVerificationError("not_yet_valid");
      return new CredentialVerificationError("malformed_payload", claim);
    }
    case "ERR_JWS_SIGNATURE_VERIFICATION_FAILED":
      return new CredentialVerificationError("bad_signature");
    default:
      return new CredentialVerificationError("malformed_payload", code ?? (cause as Error).message);
  }
}

const REQUIRED_CLAIMS = [
  "jti",
  "iss",
  "aud",
  "sub",
  "iat",
  "exp",
  "run_id",
  "side",
  "contract_id",
  "contract_version",
  "ticket_id",
  "scopes",
] as const;

function assertClaimShape(payload: JWTPayload): AgentJwtClaims {
  for (const k of REQUIRED_CLAIMS) {
    if (payload[k] === undefined) {
      throw new CredentialVerificationError("malformed_payload", `missing ${k}`);
    }
  }
  if (!Array.isArray(payload.scopes) || payload.scopes.some((s) => typeof s !== "string")) {
    throw new CredentialVerificationError("malformed_payload", "scopes");
  }
  if (payload.side !== "seeker" && payload.side !== "employer") {
    throw new CredentialVerificationError("malformed_payload", "side");
  }
  return payload as unknown as AgentJwtClaims;
}
