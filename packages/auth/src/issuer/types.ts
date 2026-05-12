// F02 T041 — Issuer/verifier shared types (FR-18, FR-19, FR-20).
//
// The agent JWT shape is the runtime view of an `agent_credentials`
// row. Scopes are bound at issuance and immutable; TTL is capped at
// 2h (FR-20). Verifier consumes the same shape after signature
// + claim validation.

export type AgentCredentialPurpose = "agent" | "service";

/** Custom claims payload for agent JWTs (FR-19, FR-20). */
export interface AgentJwtClaims {
  /** JWT id — equals `agent_credentials.credential_id`. */
  readonly jti: string;
  /** Issuer URL — Spyglass host that issued the token. */
  readonly iss: string;
  /** Audience — typically the runtime that consumes the token. */
  readonly aud: string;
  /** Subject — agent principal ID (FR-2). */
  readonly sub: string;
  /** Issued-at (unix seconds). */
  readonly iat: number;
  /** Expiration (unix seconds). Capped at iat + 7200 (FR-20). */
  readonly exp: number;
  /** Spyglass-specific run binding (FR-4). */
  readonly run_id: string;
  /** Negotiation side. */
  readonly side: "seeker" | "employer";
  /** Agent contract identifier and pinned version. */
  readonly contract_id: string;
  readonly contract_version: string;
  /** Match ticket binding (FR-4). */
  readonly ticket_id: string;
  /** Scope set bound at issuance (FR-19). */
  readonly scopes: ReadonlyArray<string>;
}

/** Material needed to mint a credential. */
export interface MintRequest {
  readonly principal_id: string;
  readonly run_id: string;
  readonly side: "seeker" | "employer";
  readonly contract_id: string;
  readonly contract_version: string;
  readonly ticket_id: string;
  readonly scopes: ReadonlyArray<string>;
  /** Issuer URL claim. */
  readonly issuer: string;
  /** Audience claim. */
  readonly audience: string;
  /** TTL in seconds; clamped to ≤7200 per FR-20. */
  readonly ttlSeconds: number;
}

export interface MintResult {
  readonly token: string;
  readonly claims: AgentJwtClaims;
  readonly kid: string;
}

/** TTL ceiling enforced at the JWT layer (FR-20). */
export const MAX_TTL_SECONDS = 7200;

// --- Service credentials (FR-23..FR-26a) ----------------------------

/**
 * Custom claims for service-to-service JWTs (FR-23, FR-24, FR-26a).
 * Distinct from `AgentJwtClaims` — service credentials carry no
 * run/contract binding.
 */
export interface ServiceJwtClaims {
  readonly jti: string;
  readonly iss: string;
  readonly aud: string;
  /** Subject — service principal id (FR-2). */
  readonly sub: string;
  readonly iat: number;
  readonly exp: number;
  /** Scope set bound at issuance (FR-24). */
  readonly scopes: ReadonlyArray<string>;
  /** Rotation generation; old generations remain verifiable until exp (FR-25, NFR-5). */
  readonly generation: number;
}

export interface ServiceMintRequest {
  readonly principal_id: string;
  readonly scopes: ReadonlyArray<string>;
  readonly issuer: string;
  readonly audience: string;
  readonly ttlSeconds: number;
  readonly generation: number;
}

export interface ServiceMintResult {
  readonly token: string;
  readonly claims: ServiceJwtClaims;
  readonly kid: string;
}
