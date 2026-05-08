// F02 T041 — EdDSA key generation + JWK rendering.
//
// Used by the bootstrap script (T037) and by tests. Production
// signing keys live in environment scope; the helpers here generate
// the keypair, derive a stable `kid` (sha256 of the JWK thumbprint),
// and render the public JWK that lives in the DB / JWKS endpoint.

import { generateKeyPair, type KeyObject } from "node:crypto";
import { exportJWK, exportPKCS8, calculateJwkThumbprint } from "jose";
import { promisify } from "node:util";

const generateKeyPairAsync = promisify(generateKeyPair);

export interface EdDSAKeypair {
  readonly kid: string;
  readonly privateKey: KeyObject;
  readonly publicKey: KeyObject;
  readonly publicJwk: Record<string, unknown>;
}

export async function generateEdDSAKeypair(): Promise<EdDSAKeypair> {
  const { privateKey, publicKey } = await generateKeyPairAsync("ed25519");
  const publicJwk = await exportJWK(publicKey);
  const kid = await calculateJwkThumbprint({ ...publicJwk, kty: publicJwk.kty ?? "OKP" });
  return {
    kid,
    privateKey,
    publicKey,
    publicJwk: { ...publicJwk, kid, alg: "EdDSA", use: "sig" },
  };
}

/** Export a private KeyObject as a PKCS8 PEM string. Re-exported so
 *  the bootstrap script can serialize keys without depending on jose
 *  through a brittle deep-import path. */
export async function exportPrivateKeyPkcs8(key: KeyObject): Promise<string> {
  return exportPKCS8(key);
}
