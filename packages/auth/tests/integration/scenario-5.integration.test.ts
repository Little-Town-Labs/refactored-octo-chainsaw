// F02 B5 gate — Quickstart Scenario 5 (Service-to-service auth, Story 5).
//
// Wires the real F02 modules end-to-end (no mocks of internal logic;
// only repo + bootstrap-secret-checker are in-memory doubles, since
// the Drizzle-backed `ServiceCredentialRepo` doesn't exist yet — when
// it lands, swap the in-memory repo for a Neon-branch-backed one
// using `@spyglass/test-harness`'s `NeonBranchManager`).
//
// Steps mirror `.specify/specs/02-identity-auth-aaa/quickstart.md`:
//   1. Deploy bootstrap → service receives initial F02-issued credential.
//   2. Service A calls Service B; B's surface verifies the credential
//      and resolves a `Principal.kind === 'service'`-equivalent claim
//      bundle (sub = service principal id, generation = 1, scopes).
//   3. Stale (post-expiry) credential → rejected by surface.
//   4. Vercel OIDC token → rejected (FR-26c) AND audit event fired.
//
// Pass criteria: all four steps succeed; no long-lived shared platform
// secret survives beyond the bootstrap exchange (FR-26).

import { SignJWT, generateKeyPair } from "jose";
import type { KeyObject } from "node:crypto";

import { generateEdDSAKeypair } from "../../src/issuer/keygen.js";
import {
  bootstrapServiceCredential,
  type BootstrapSecretChecker,
  type ServiceCredentialRepo,
  type ServiceCredentialRow,
} from "../../src/issuer/service-issuance.js";
import type { JwksProvider, SigningKeyMaterial } from "../../src/issuer/key-source.js";
import type { AuditEventSink } from "../../src/materialize/types.js";
import type { RevocationChecker } from "../../src/verifier/verify.js";
import { CredentialVerificationError } from "../../src/verifier/verify.js";
import { VercelOidcAtInAppSurfaceError } from "../../src/verifier/vercel-oidc-rejection.js";
import { verifyServiceCredentialAtSurface } from "../../src/verifier/verify-service-at-surface.js";

import { FakeClock, InMemoryAuditSink } from "@spyglass/test-harness";

const SERVICE_A_ID = "00000000-0000-0000-0000-0000000serv0a";
const BOOTSTRAP_SECRET = "scenario-5-bootstrap-secret";
const ISSUER = "https://spyglass.test";
const AUDIENCE = "spyglass.services";

function makeRepo(): ServiceCredentialRepo {
  const rows: ServiceCredentialRow[] = [];
  return {
    async findByPrincipalAndGeneration(input) {
      return (
        rows.find(
          (r) =>
            r.principal_id === input.principal_id &&
            r.rotation_generation === input.rotation_generation,
        ) ?? null
      );
    },
    async findLatestActiveByPrincipal(input) {
      const live = rows.filter(
        (r) =>
          r.principal_id === input.principal_id &&
          r.revoked_at === null &&
          r.expires_at.getTime() > input.now.getTime(),
      );
      if (live.length === 0) return null;
      return live.reduce((a, b) => (a.rotation_generation >= b.rotation_generation ? a : b));
    },
    async insert(row) {
      const stored: ServiceCredentialRow = { ...row, revoked_at: null };
      rows.push(stored);
      return stored;
    },
  };
}

const acceptingSecretChecker: BootstrapSecretChecker = {
  async check(input) {
    return (
      input.service_principal_id === SERVICE_A_ID && input.presented_secret === BOOTSTRAP_SECRET
    );
  },
};

interface Bundle {
  readonly signingKey: SigningKeyMaterial;
  readonly jwks: JwksProvider;
  readonly revocations: RevocationChecker;
}

async function makeCryptoBundle(): Promise<Bundle> {
  const kp = await generateEdDSAKeypair();
  return {
    signingKey: { kid: kp.kid, privateKey: kp.privateKey, algorithm: "EdDSA" },
    jwks: {
      async resolve(kid) {
        return kid === kp.kid ? (kp.publicKey as KeyObject) : null;
      },
    },
    revocations: {
      async isRevoked() {
        return false;
      },
    },
  };
}

describe("Scenario 5 — service-to-service authentication (B5 gate)", () => {
  it("runs all four steps end-to-end", async () => {
    const bundle = await makeCryptoBundle();
    const auditSink = new InMemoryAuditSink();
    const clock = new FakeClock(1_700_000_000);
    const repo = makeRepo();
    let credIdCounter = 0;

    const adapterSink: AuditEventSink = {
      async emit(e) {
        await auditSink.emit(e);
      },
    };

    const deps = {
      repo,
      sink: adapterSink,
      signingKey: bundle.signingKey,
      issuer: ISSUER,
      audience: AUDIENCE,
      bootstrapChecker: acceptingSecretChecker,
      newCredentialId: () =>
        `00000000-0000-0000-0000-00000000s${(credIdCounter++).toString(16).padStart(3, "0")}`,
      now: clock.now,
      correlationId: () => "scenario-5-cid",
    };

    // ── Step 1: deploy bootstrap → service A gets initial credential ──
    const bootstrapped = await bootstrapServiceCredential(
      {
        service_principal_id: SERVICE_A_ID,
        bootstrap_secret: BOOTSTRAP_SECRET,
        scope_set: ["service.dossier.sign", "service.audit.write"],
        ttl_seconds: 1800,
      },
      deps,
    );
    expect(bootstrapped.principal_id).toBe(SERVICE_A_ID);
    expect(bootstrapped.rotation_generation).toBe(1);
    expect(auditSink.byName("service_credential.bootstrapped")).toHaveLength(1);

    // ── Step 2: service A → service B; B's surface verifies and resolves principal ──
    const claims = await verifyServiceCredentialAtSurface({
      token: bootstrapped.jwt,
      expectedIssuer: ISSUER,
      expectedAudience: AUDIENCE,
      jwks: bundle.jwks,
      revocations: bundle.revocations,
      now: clock.now,
      auditSink: adapterSink,
      correlationId: "step-2-cid",
    });
    expect(claims.sub).toBe(SERVICE_A_ID); // Principal.kind='service' → principal_id
    expect(claims.generation).toBe(1);
    expect(claims.scopes).toContain("service.dossier.sign");
    expect(auditSink.byName("service_credential.rejected_vercel_oidc")).toHaveLength(0);

    // ── Step 3: stale credential past `expires_at` → rejected ──────────
    clock.advance(1801); // past 1800s TTL
    await expect(
      verifyServiceCredentialAtSurface({
        token: bootstrapped.jwt,
        expectedIssuer: ISSUER,
        expectedAudience: AUDIENCE,
        jwks: bundle.jwks,
        revocations: bundle.revocations,
        now: clock.now,
        clockSkewSeconds: 0,
        auditSink: adapterSink,
        correlationId: "step-3-cid",
      }),
    ).rejects.toBeInstanceOf(CredentialVerificationError);

    // ── Step 4: Vercel OIDC token at in-app surface → rejected + audit ─
    const { privateKey: vercelKey } = await generateKeyPair("EdDSA");
    const vercelOidcToken = await new SignJWT({
      iss: "https://oidc.vercel.com/team-x",
      aud: "https://vercel.com/team/some-project",
      sub: "owner:team:project:dev",
    })
      .setProtectedHeader({ alg: "EdDSA", kid: "vercel-fake" })
      .sign(vercelKey);

    await expect(
      verifyServiceCredentialAtSurface({
        token: vercelOidcToken,
        expectedIssuer: ISSUER,
        expectedAudience: AUDIENCE,
        jwks: bundle.jwks,
        revocations: bundle.revocations,
        now: clock.now,
        auditSink: adapterSink,
        correlationId: "step-4-cid",
      }),
    ).rejects.toBeInstanceOf(VercelOidcAtInAppSurfaceError);

    const rejections = auditSink.byName("service_credential.rejected_vercel_oidc");
    expect(rejections).toHaveLength(1);
    expect(rejections[0]).toMatchObject({
      correlation_id: "step-4-cid",
      payload: { token_kind: "vercel_oidc", issuer: "https://oidc.vercel.com/team-x" },
    });
  });
});
