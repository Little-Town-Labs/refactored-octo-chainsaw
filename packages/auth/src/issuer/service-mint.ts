// F02 T052 — `mintServiceCredential` (FR-23, FR-24, FR-26a).
//
// Pure mint of a service-to-service JWT. Same shape as the agent
// mint but without run/contract binding; carries `generation` so a
// verifier can correlate with `service_credentials.rotation_generation`
// (FR-25 / NFR-5). Side effects (DB write, audit) belong to the
// orchestrator.

import { SignJWT } from "jose";

import type { ServiceJwtClaims, ServiceMintRequest, ServiceMintResult } from "./types.js";
import { MAX_TTL_SECONDS } from "./types.js";
import type { SigningKeyMaterial } from "./key-source.js";
import { EmptyScopeSetError, InvalidTtlError, TtlExceededError } from "./mint.js";

interface MintArgs {
  readonly request: ServiceMintRequest;
  readonly credential_id: string;
  readonly signingKey: SigningKeyMaterial;
  readonly now: () => number;
}

export async function mintServiceCredential(args: MintArgs): Promise<ServiceMintResult> {
  const { request, credential_id, signingKey, now } = args;

  if (!Number.isInteger(request.ttlSeconds) || request.ttlSeconds < 1) {
    throw new InvalidTtlError(request.ttlSeconds);
  }
  if (request.ttlSeconds > MAX_TTL_SECONDS) {
    throw new TtlExceededError(request.ttlSeconds);
  }
  if (request.scopes.length === 0) {
    throw new EmptyScopeSetError();
  }

  const iat = now();
  const exp = iat + request.ttlSeconds;
  const customClaims = {
    scopes: [...request.scopes],
    generation: request.generation,
  };

  const token = await new SignJWT(customClaims)
    .setProtectedHeader({ alg: signingKey.algorithm, kid: signingKey.kid })
    .setJti(credential_id)
    .setIssuer(request.issuer)
    .setAudience(request.audience)
    .setSubject(request.principal_id)
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(signingKey.privateKey);

  const claims: ServiceJwtClaims = {
    jti: credential_id,
    iss: request.issuer,
    aud: request.audience,
    sub: request.principal_id,
    iat,
    exp,
    ...customClaims,
  };
  return { token, claims, kid: signingKey.kid };
}
