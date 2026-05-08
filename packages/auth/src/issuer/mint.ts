// F02 T041 — `mintAgentCredential` (FR-18, FR-19, FR-20).
//
// Pure mint function: given the request, the active signing key, and
// a clock, produces a signed EdDSA JWT plus the canonical claims
// shape. Side effects (DB write of `agent_credentials`, audit event)
// belong to the tRPC procedure (T043) — keeping this function pure
// keeps the p95 ≤2ms benchmark (T040) honest.

import { SignJWT } from "jose";

import type { AgentJwtClaims, MintRequest, MintResult } from "./types.js";
import { MAX_TTL_SECONDS } from "./types.js";
import type { SigningKeyMaterial } from "./key-source.js";

export class TtlExceededError extends Error {
  constructor(public readonly requested: number) {
    super(`Requested TTL ${requested}s exceeds FR-20 ceiling of ${MAX_TTL_SECONDS}s.`);
    this.name = "TtlExceededError";
  }
}

export class InvalidTtlError extends Error {
  constructor(public readonly requested: number) {
    super(`TTL ${requested} is not a positive integer second value.`);
    this.name = "InvalidTtlError";
  }
}

export class EmptyScopeSetError extends Error {
  constructor() {
    super("Agent credentials require at least one scope (FR-19); empty scope set rejected.");
    this.name = "EmptyScopeSetError";
  }
}

interface MintArgs {
  readonly request: MintRequest;
  readonly credential_id: string;
  readonly signingKey: SigningKeyMaterial;
  readonly now: () => number;
}

export async function mintAgentCredential(args: MintArgs): Promise<MintResult> {
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
    run_id: request.run_id,
    side: request.side,
    contract_id: request.contract_id,
    contract_version: request.contract_version,
    ticket_id: request.ticket_id,
    scopes: [...request.scopes],
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

  const claims: AgentJwtClaims = {
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
