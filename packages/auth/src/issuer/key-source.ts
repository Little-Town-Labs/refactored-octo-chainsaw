// F02 T041 — Signing-key source abstraction.
//
// The issuer consumes a `SigningKeyMaterial` value rather than
// reading env vars directly so the same issuer code works in
// production (env-backed key) and tests (in-memory key generated
// per-test). Verifier-side keys are looked up by `kid` against a
// `JwksProvider` that reads `signing_keys` rows.

import type { KeyObject } from "node:crypto";

export interface SigningKeyMaterial {
  /** Stable key id — emitted as JWT header `kid`. */
  readonly kid: string;
  /** EdDSA private key (KeyObject, type='private'). */
  readonly privateKey: KeyObject;
  /** Algorithm pinned per Constitution §I.C.1. */
  readonly algorithm: "EdDSA";
}

/**
 * Verifier-side resolver: returns the public key for a given `kid`,
 * or `null` if the key is unknown / past its `verify_until`.
 */
export interface JwksProvider {
  resolve(kid: string): Promise<KeyObject | null>;
}
