// F02 B5-gate — `verifyServiceCredentialAtSurface` wrapper tests.
//
// The wrapper exists so in-app service surfaces have a single seam
// that (a) rejects Vercel OIDC tokens with a structured deny + audit
// event (FR-26b, FR-26c) and (b) otherwise delegates to
// `verifyServiceCredential` (FR-23, FR-24, FR-26a). Without this
// seam, the audit-event side of the FR-26c gate has no caller and
// Quickstart Scenario 5 step 4 cannot pass.

import { SignJWT, generateKeyPair } from "jose";

import type { AuditEventSink } from "../materialize/types.js";
import { VercelOidcAtInAppSurfaceError } from "../verifier/vercel-oidc-rejection.js";
import { verifyServiceCredentialAtSurface } from "../verifier/verify-service-at-surface.js";
import { CredentialVerificationError } from "../verifier/verify.js";

interface RecordedEvent {
  name: string;
  correlation_id: string;
  payload: Readonly<Record<string, unknown>>;
}

function makeRecordingSink(): { sink: AuditEventSink; events: RecordedEvent[] } {
  const events: RecordedEvent[] = [];
  return {
    events,
    sink: {
      async emit(e) {
        events.push({ name: e.name, correlation_id: e.correlation_id, payload: e.payload });
      },
    },
  };
}

async function signJwt(claims: Record<string, unknown>): Promise<string> {
  const { privateKey } = await generateKeyPair("EdDSA");
  return await new SignJWT(claims)
    .setProtectedHeader({ alg: "EdDSA", kid: "test-kid" })
    .sign(privateKey);
}

const baseOpts = {
  expectedIssuer: "https://spyglass.example.com",
  expectedAudience: "spyglass-internal",
  jwks: { resolve: async () => null },
  revocations: { isRevoked: async () => false },
  now: () => Math.floor(Date.now() / 1000),
};

describe("verifyServiceCredentialAtSurface", () => {
  it("emits service_credential.rejected_vercel_oidc when token is Vercel OIDC, then re-throws", async () => {
    const token = await signJwt({
      iss: "https://oidc.vercel.com/team-x",
      aud: "https://vercel.com/team/some-project",
      sub: "owner:team:project:dev",
    });
    const { sink, events } = makeRecordingSink();

    await expect(
      verifyServiceCredentialAtSurface({
        ...baseOpts,
        token,
        auditSink: sink,
        correlationId: "cid-1",
      }),
    ).rejects.toBeInstanceOf(VercelOidcAtInAppSurfaceError);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      name: "service_credential.rejected_vercel_oidc",
      correlation_id: "cid-1",
      payload: { token_kind: "vercel_oidc", issuer: "https://oidc.vercel.com/team-x" },
    });
  });

  it("preserves VercelOidcAtInAppSurfaceError when audit sink throws (sink failures must not mask the deny class)", async () => {
    const token = await signJwt({ iss: "https://oidc.vercel.com/team-x" });
    const failingSink: AuditEventSink = {
      async emit() {
        throw new Error("audit pipeline outage");
      },
    };

    await expect(
      verifyServiceCredentialAtSurface({
        ...baseOpts,
        token,
        auditSink: failingSink,
        correlationId: "cid-fail",
      }),
    ).rejects.toBeInstanceOf(VercelOidcAtInAppSurfaceError);
  });

  it("does not emit a Vercel-OIDC audit event for an F02-shaped token (delegates to verifyServiceCredential)", async () => {
    // Token has the right shape to reach the verifier; verifier will
    // fail (unknown_kid) — that's fine. We only assert the wrapper
    // did NOT mistakenly fire the Vercel-OIDC audit event.
    const token = await signJwt({
      iss: "https://spyglass.example.com",
      aud: "spyglass-internal",
      sub: "service-principal-id",
      jti: "j1",
      iat: 1,
      exp: 2 ** 31 - 1,
      scopes: ["agents.run"],
      generation: 1,
    });
    const { sink, events } = makeRecordingSink();

    await expect(
      verifyServiceCredentialAtSurface({
        ...baseOpts,
        token,
        auditSink: sink,
        correlationId: "cid-2",
      }),
    ).rejects.toBeInstanceOf(CredentialVerificationError);

    expect(events.filter((e) => e.name === "service_credential.rejected_vercel_oidc")).toHaveLength(
      0,
    );
  });
});
