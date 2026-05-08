// F02 T038/T039 — JWKS query types.
//
// The JWKS endpoint reads from `signing_keys` and renders the
// matching public JWKs at `/.well-known/jwks.json`. A key appears
// in the JWKS if it is currently signing (active) OR still within
// its `verify_until` window — i.e., a verifier rotating across the
// graceful-shutoff window can still validate older tokens.

export interface JwksKeyRow {
  readonly kid: string;
  readonly algorithm: string;
  readonly public_key_jwk: Record<string, unknown>;
  readonly purpose: "agent" | "service";
  readonly activated_at: Date | null;
  readonly retired_at: Date | null;
  readonly verify_until: Date | null;
}

export interface JwksRepo {
  /**
   * Return rows that satisfy the JWKS visibility predicate for
   * `purpose`. Production wiring uses Drizzle; tests use an in-memory
   * fake.
   */
  listVisibleKeys(purpose: "agent" | "service", now: Date): Promise<ReadonlyArray<JwksKeyRow>>;
}

export interface Jwks {
  readonly keys: ReadonlyArray<Record<string, unknown>>;
}

/**
 * Predicate used by both the in-memory fake and the production
 * Drizzle query: a key is in the JWKS iff it is currently signing
 * OR still within its verify_until window. Pre-activation rows are
 * never published.
 */
export function isJwksVisible(row: JwksKeyRow, now: Date): boolean {
  if (row.activated_at === null) return false;
  if (row.retired_at === null) return true;
  return row.verify_until === null || row.verify_until > now;
}
