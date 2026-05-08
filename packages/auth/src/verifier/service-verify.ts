// F02 T052 — `verifyServiceCredential` (FR-23, FR-24, FR-26a).
//
// Verifies a service JWT and returns typed claims, or throws a
// `CredentialVerificationError`. Mirrors `verifyAgentCredential`
// (verify.ts) — the only differences are the required-claim shape
// (no run/contract binding; carries `generation`) and that the
// caller-side scope check is the consumer's responsibility, not
// the verifier's.

import { jwtVerify, type JWTPayload } from "jose";

import type { JwksProvider } from "../issuer/key-source.js";
import type { ServiceJwtClaims } from "../issuer/types.js";
import { CredentialVerificationError, type RevocationChecker } from "./verify.js";

export interface VerifyServiceOptions {
  readonly token: string;
  readonly expectedIssuer: string;
  readonly expectedAudience: string;
  readonly jwks: JwksProvider;
  readonly revocations: RevocationChecker;
  readonly now: () => number;
  readonly clockSkewSeconds?: number;
}

export async function verifyServiceCredential(
  opts: VerifyServiceOptions,
): Promise<ServiceJwtClaims> {
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

const REQUIRED_CLAIMS = ["jti", "iss", "aud", "sub", "iat", "exp", "scopes", "generation"] as const;

const NON_EMPTY_STRING_CLAIMS = ["jti", "iss", "aud", "sub"] as const;

function assertClaimShape(payload: JWTPayload): ServiceJwtClaims {
  for (const k of REQUIRED_CLAIMS) {
    if (payload[k] === undefined) {
      throw new CredentialVerificationError("malformed_payload", `missing ${k}`);
    }
  }
  for (const k of NON_EMPTY_STRING_CLAIMS) {
    const v = payload[k];
    if (typeof v !== "string" || v.length === 0) {
      throw new CredentialVerificationError("malformed_payload", k);
    }
  }
  if (!Array.isArray(payload.scopes) || payload.scopes.some((s) => typeof s !== "string")) {
    throw new CredentialVerificationError("malformed_payload", "scopes");
  }
  if (typeof payload.generation !== "number" || !Number.isInteger(payload.generation)) {
    throw new CredentialVerificationError("malformed_payload", "generation");
  }
  return payload as unknown as ServiceJwtClaims;
}
