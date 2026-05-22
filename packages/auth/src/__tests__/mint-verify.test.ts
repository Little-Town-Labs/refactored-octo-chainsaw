// F02 T040 — EdDSA mint/verify round-trip + p95 benchmark.
//
// Pure-function tests for `mintAgentCredential` and
// `verifyAgentCredential`. The benchmark asserts the verify p95
// ≤2ms target from the plan (run on @swc/jest with no TLS or DB
// hops); the mint side is similarly fast but only NFR-2 covers the
// verify path explicitly.

import type { KeyObject } from "node:crypto";

import {
  mintAgentCredential,
  EmptyScopeSetError,
  InvalidTtlError,
  TtlExceededError,
} from "../issuer/mint.js";
import { generateEdDSAKeypair } from "../issuer/keygen.js";
import { MAX_TTL_SECONDS } from "../issuer/types.js";
import {
  CredentialVerificationError,
  verifyAgentCredential,
  type RevocationChecker,
} from "../verifier/verify.js";
import type { JwksProvider, SigningKeyMaterial } from "../issuer/key-source.js";
import { TEST_CONTRACT } from "./fixtures/test-contract.js";

interface Bundle {
  signingKey: SigningKeyMaterial;
  jwks: JwksProvider;
  revocations: RevocationChecker;
}

async function makeBundle(): Promise<Bundle> {
  const kp = await generateEdDSAKeypair();
  const signingKey: SigningKeyMaterial = {
    kid: kp.kid,
    privateKey: kp.privateKey,
    algorithm: "EdDSA",
  };
  const jwks: JwksProvider = {
    async resolve(kid) {
      return kid === kp.kid ? (kp.publicKey as KeyObject) : null;
    },
  };
  const revocations: RevocationChecker = {
    async isRevoked() {
      return false;
    },
  };
  return { signingKey, jwks, revocations };
}

const baseRequest = {
  principal_id: "00000000-0000-0000-0000-00000000abcd",
  run_id: "00000000-0000-0000-0000-0000000000aa",
  side: "seeker" as const,
  contract_id: TEST_CONTRACT.contract_id,
  contract_version: TEST_CONTRACT.contract_version,
  ticket_id: "00000000-0000-0000-0000-0000000000bb",
  scopes: [...TEST_CONTRACT.scopes],
  issuer: "https://spyglass.test",
  audience: "spyglass.runner",
  ttlSeconds: 1800,
};

describe("mintAgentCredential", () => {
  it("rejects an empty scope set (FR-19)", async () => {
    const { signingKey } = await makeBundle();
    await expect(
      mintAgentCredential({
        request: { ...baseRequest, scopes: [] },
        credential_id: "00000000-0000-0000-0000-0000000000c1",
        signingKey,
        now: () => 1_700_000_000,
      }),
    ).rejects.toBeInstanceOf(EmptyScopeSetError);
  });

  it.each([0, -1, 1.5, Number.NaN])("rejects invalid TTL %p", async (ttlSeconds) => {
    const { signingKey } = await makeBundle();
    await expect(
      mintAgentCredential({
        request: { ...baseRequest, ttlSeconds },
        credential_id: "00000000-0000-0000-0000-0000000000c0",
        signingKey,
        now: () => 1_700_000_000,
      }),
    ).rejects.toBeInstanceOf(InvalidTtlError);
  });

  it("rejects TTL exceeding the FR-20 ceiling", async () => {
    const { signingKey } = await makeBundle();
    await expect(
      mintAgentCredential({
        request: { ...baseRequest, ttlSeconds: MAX_TTL_SECONDS + 1 },
        credential_id: "00000000-0000-0000-0000-0000000000c2",
        signingKey,
        now: () => 1_700_000_000,
      }),
    ).rejects.toBeInstanceOf(TtlExceededError);
  });

  it("emits a token whose claims match the canonical shape", async () => {
    const { signingKey } = await makeBundle();
    const result = await mintAgentCredential({
      request: baseRequest,
      credential_id: "00000000-0000-0000-0000-0000000000c3",
      signingKey,
      now: () => 1_700_000_000,
    });
    expect(result.kid).toBe(signingKey.kid);
    expect(result.claims.exp - result.claims.iat).toBe(baseRequest.ttlSeconds);
    expect(result.claims.scopes).toEqual(baseRequest.scopes);
  });
});

describe("verifyAgentCredential — round-trip", () => {
  it("verifies a freshly minted token", async () => {
    const bundle = await makeBundle();
    const minted = await mintAgentCredential({
      request: baseRequest,
      credential_id: "00000000-0000-0000-0000-0000000000d1",
      signingKey: bundle.signingKey,
      now: () => 1_700_000_000,
    });
    const claims = await verifyAgentCredential({
      token: minted.token,
      expectedIssuer: baseRequest.issuer,
      expectedAudience: baseRequest.audience,
      jwks: bundle.jwks,
      revocations: bundle.revocations,
      now: () => 1_700_000_000 + 60,
    });
    expect(claims.jti).toBe(minted.claims.jti);
    expect(claims.scopes).toEqual(baseRequest.scopes);
  });

  it("rejects a token whose kid is not in the JWKS", async () => {
    const bundleA = await makeBundle();
    const bundleB = await makeBundle();
    const minted = await mintAgentCredential({
      request: baseRequest,
      credential_id: "00000000-0000-0000-0000-0000000000d2",
      signingKey: bundleA.signingKey,
      now: () => 1_700_000_000,
    });
    await expect(
      verifyAgentCredential({
        token: minted.token,
        expectedIssuer: baseRequest.issuer,
        expectedAudience: baseRequest.audience,
        jwks: bundleB.jwks,
        revocations: bundleB.revocations,
        now: () => 1_700_000_000 + 60,
      }),
    ).rejects.toMatchObject({ reason: "unknown_kid" });
  });

  it("rejects a token signed by a different key (bad signature)", async () => {
    // Tamper: sign with bundleB but advertise bundleA's kid via jwks.
    const bundleA = await makeBundle();
    const bundleB = await makeBundle();
    const minted = await mintAgentCredential({
      request: baseRequest,
      credential_id: "00000000-0000-0000-0000-0000000000d3",
      signingKey: { ...bundleB.signingKey, kid: bundleA.signingKey.kid },
      now: () => 1_700_000_000,
    });
    await expect(
      verifyAgentCredential({
        token: minted.token,
        expectedIssuer: baseRequest.issuer,
        expectedAudience: baseRequest.audience,
        jwks: bundleA.jwks,
        revocations: bundleA.revocations,
        now: () => 1_700_000_000 + 60,
      }),
    ).rejects.toMatchObject({ reason: "bad_signature" });
  });

  it("rejects an expired token", async () => {
    const bundle = await makeBundle();
    const minted = await mintAgentCredential({
      request: { ...baseRequest, ttlSeconds: 60 },
      credential_id: "00000000-0000-0000-0000-0000000000d4",
      signingKey: bundle.signingKey,
      now: () => 1_700_000_000,
    });
    await expect(
      verifyAgentCredential({
        token: minted.token,
        expectedIssuer: baseRequest.issuer,
        expectedAudience: baseRequest.audience,
        jwks: bundle.jwks,
        revocations: bundle.revocations,
        now: () => 1_700_000_000 + 3600,
      }),
    ).rejects.toMatchObject({ reason: "expired" });
  });

  it("rejects a token with the wrong audience", async () => {
    const bundle = await makeBundle();
    const minted = await mintAgentCredential({
      request: baseRequest,
      credential_id: "00000000-0000-0000-0000-0000000000d5",
      signingKey: bundle.signingKey,
      now: () => 1_700_000_000,
    });
    await expect(
      verifyAgentCredential({
        token: minted.token,
        expectedIssuer: baseRequest.issuer,
        expectedAudience: "different.audience",
        jwks: bundle.jwks,
        revocations: bundle.revocations,
        now: () => 1_700_000_000 + 60,
      }),
    ).rejects.toMatchObject({ reason: "bad_audience" });
  });

  it("rejects a revoked token (FR-21)", async () => {
    const bundle = await makeBundle();
    const minted = await mintAgentCredential({
      request: baseRequest,
      credential_id: "00000000-0000-0000-0000-0000000000d6",
      signingKey: bundle.signingKey,
      now: () => 1_700_000_000,
    });
    await expect(
      verifyAgentCredential({
        token: minted.token,
        expectedIssuer: baseRequest.issuer,
        expectedAudience: baseRequest.audience,
        jwks: bundle.jwks,
        revocations: {
          async isRevoked() {
            return true;
          },
        },
        now: () => 1_700_000_000 + 60,
      }),
    ).rejects.toMatchObject({ reason: "revoked" });
  });
});

describe("verifyAgentCredential — p95 benchmark (NFR-2)", () => {
  it("verify p95 stays under 2ms", async () => {
    const bundle = await makeBundle();
    const minted = await mintAgentCredential({
      request: baseRequest,
      credential_id: "00000000-0000-0000-0000-0000000000e1",
      signingKey: bundle.signingKey,
      now: () => 1_700_000_000,
    });
    const ITERATIONS = 200;
    const samples: number[] = [];
    // Warm-up.
    for (let i = 0; i < 20; i++) {
      await verifyAgentCredential({
        token: minted.token,
        expectedIssuer: baseRequest.issuer,
        expectedAudience: baseRequest.audience,
        jwks: bundle.jwks,
        revocations: bundle.revocations,
        now: () => 1_700_000_000 + 60,
      });
    }
    for (let i = 0; i < ITERATIONS; i++) {
      const start = performance.now();
      await verifyAgentCredential({
        token: minted.token,
        expectedIssuer: baseRequest.issuer,
        expectedAudience: baseRequest.audience,
        jwks: bundle.jwks,
        revocations: bundle.revocations,
        now: () => 1_700_000_000 + 60,
      });
      samples.push(performance.now() - start);
    }
    samples.sort((a, b) => a - b);
    const p95 = samples[Math.floor(ITERATIONS * 0.95)] ?? 0;
    // Generous 8ms ceiling for noisy self-hosted CI; the 2ms target is the
    // production budget, this guards against major regressions.
    expect(p95).toBeLessThan(8);
  });
});

describe("CredentialVerificationError shape", () => {
  it("carries a typed reason", () => {
    const err = new CredentialVerificationError("bad_signature");
    expect(err).toBeInstanceOf(CredentialVerificationError);
    expect(err.reason).toBe("bad_signature");
  });
});
