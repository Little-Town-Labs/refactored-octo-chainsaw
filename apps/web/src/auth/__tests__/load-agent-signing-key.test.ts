// F02 T057 — Tests for `loadAgentSigningKey`.

import { generateKeyPairSync } from "node:crypto";

import { AgentSigningKeyMisconfiguredError, loadAgentSigningKey } from "../load-agent-signing-key";

const KID_ENV = "SPYGLASS_AGENT_SIGNING_KID";
const KEY_ENV = "SPYGLASS_AGENT_SIGNING_KEY_PKCS8_B64";

function withEnv<T>(vars: Record<string, string | undefined>, fn: () => T): T {
  const prior: Record<string, string | undefined> = {};
  for (const k of Object.keys(vars)) {
    prior[k] = process.env[k];
    if (vars[k] === undefined) delete process.env[k];
    else process.env[k] = vars[k];
  }
  try {
    return fn();
  } finally {
    for (const [k, v] of Object.entries(prior)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

function makeValidPkcs8B64(): string {
  const { privateKey } = generateKeyPairSync("ed25519");
  return privateKey.export({ type: "pkcs8", format: "der" }).toString("base64");
}

describe("loadAgentSigningKey", () => {
  it("loads a valid PKCS8 EdDSA key from env", () => {
    const b64 = makeValidPkcs8B64();
    const result = withEnv({ [KID_ENV]: "kid-1", [KEY_ENV]: b64 }, () => loadAgentSigningKey());
    expect(result.kid).toBe("kid-1");
    expect(result.algorithm).toBe("EdDSA");
    expect(result.privateKey.asymmetricKeyType).toBe("ed25519");
  });

  it("throws AgentSigningKeyMisconfiguredError when KID env var is missing", () => {
    withEnv({ [KID_ENV]: undefined, [KEY_ENV]: makeValidPkcs8B64() }, () => {
      expect(() => loadAgentSigningKey()).toThrow(AgentSigningKeyMisconfiguredError);
    });
  });

  it("throws when KID env var is whitespace-only", () => {
    withEnv({ [KID_ENV]: "   ", [KEY_ENV]: makeValidPkcs8B64() }, () => {
      expect(() => loadAgentSigningKey()).toThrow(AgentSigningKeyMisconfiguredError);
    });
  });

  it("throws when KEY env var is missing", () => {
    withEnv({ [KID_ENV]: "kid-1", [KEY_ENV]: undefined }, () => {
      expect(() => loadAgentSigningKey()).toThrow(AgentSigningKeyMisconfiguredError);
    });
  });

  it("throws when KEY env var contains invalid PKCS8 bytes", () => {
    withEnv(
      {
        [KID_ENV]: "kid-1",
        [KEY_ENV]: Buffer.from("definitely not a key").toString("base64"),
      },
      () => {
        expect(() => loadAgentSigningKey()).toThrow(AgentSigningKeyMisconfiguredError);
      },
    );
  });

  it("error messages reference the env var name but never the value", () => {
    const secret = makeValidPkcs8B64();
    withEnv({ [KID_ENV]: "kid-1", [KEY_ENV]: "AAAA" + secret.slice(4) }, () => {
      try {
        loadAgentSigningKey();
        throw new Error("expected throw");
      } catch (err) {
        const msg = (err as Error).message;
        expect(msg).toContain(KEY_ENV);
        expect(msg).not.toContain(secret.slice(4, 40));
      }
    });
  });
});
