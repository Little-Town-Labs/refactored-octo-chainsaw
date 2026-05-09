// F02 T057 — Load the active agent signing key from environment
// scope. Private keys are NEVER persisted in `signing_keys`
// (data-model §signing_keys); the row holds only the public JWK and
// activation lifecycle. The matching private key lives in
// `SPYGLASS_AGENT_SIGNING_KEY_PKCS8_B64` (PEM/PKCS8 → DER → base64)
// keyed by `SPYGLASS_AGENT_SIGNING_KID`.
//
// Misconfiguration is a fail-safe deny: if either env var is missing
// or the key won't import, this throws. The operator console issue
// page renders the resulting Error via Next's `error.tsx` boundary
// rather than booting the issuance surface in a half-configured
// state.

import { createPrivateKey } from "node:crypto";

import type { SigningKeyMaterial } from "@spyglass/auth";

const KID_ENV = "SPYGLASS_AGENT_SIGNING_KID";
const KEY_ENV = "SPYGLASS_AGENT_SIGNING_KEY_PKCS8_B64";

export class AgentSigningKeyMisconfiguredError extends Error {
  constructor(reason: string) {
    super(`Agent signing key misconfigured: ${reason}.`);
    this.name = "AgentSigningKeyMisconfiguredError";
  }
}

export function loadAgentSigningKey(): SigningKeyMaterial {
  const kid = process.env[KID_ENV];
  if (!kid || kid.trim().length === 0) {
    throw new AgentSigningKeyMisconfiguredError(`${KID_ENV} not set`);
  }
  const b64 = process.env[KEY_ENV];
  if (!b64 || b64.trim().length === 0) {
    throw new AgentSigningKeyMisconfiguredError(`${KEY_ENV} not set`);
  }
  let der: Buffer;
  try {
    der = Buffer.from(b64, "base64");
  } catch {
    throw new AgentSigningKeyMisconfiguredError(`${KEY_ENV} not base64`);
  }
  let privateKey;
  try {
    privateKey = createPrivateKey({ key: der, format: "der", type: "pkcs8" });
  } catch (cause) {
    throw new AgentSigningKeyMisconfiguredError(
      `${KEY_ENV} not a PKCS8 EdDSA key: ${(cause as Error).message}`,
    );
  }
  return { kid, privateKey, algorithm: "EdDSA" };
}
