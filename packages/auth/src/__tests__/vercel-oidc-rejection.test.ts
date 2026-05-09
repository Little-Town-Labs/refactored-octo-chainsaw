// F02 T053 — Vercel-OIDC rejection guard tests (FR-26b, FR-26c).
//
// In-app service surfaces (the boundary where `Principal.kind === "service"`
// is established) MUST reject Vercel OIDC tokens with a *structured* failure.
// Vercel OIDC tokens are accepted only at the deploy boundary (e.g.
// GitHub-Actions → Vercel deploy auth) and never promoted to in-app
// service principals. Without this guard, a Vercel OIDC token presented
// to an in-app surface would collapse into a generic `bad_issuer` /
// `bad_signature` failure, which would mask the security-relevant fact
// that a deploy-boundary token is being misused.

import { SignJWT, generateKeyPair } from "jose";

import {
  assertNotVercelOidc,
  VercelOidcAtInAppSurfaceError,
} from "../verifier/vercel-oidc-rejection.js";

async function signJwt(claims: Record<string, unknown>): Promise<string> {
  const { privateKey } = await generateKeyPair("EdDSA");
  return await new SignJWT(claims)
    .setProtectedHeader({ alg: "EdDSA", kid: "test-kid" })
    .sign(privateKey);
}

describe("assertNotVercelOidc", () => {
  it("throws VercelOidcAtInAppSurfaceError for canonical Vercel OIDC issuer", async () => {
    const token = await signJwt({
      iss: "https://oidc.vercel.com",
      aud: "https://vercel.com/team/some-project",
      sub: "owner:team:project:dev",
    });

    expect(() => assertNotVercelOidc(token)).toThrow(VercelOidcAtInAppSurfaceError);
  });

  it("throws for Vercel OIDC issuer with team-slug path", async () => {
    const token = await signJwt({
      iss: "https://oidc.vercel.com/example-team",
      sub: "owner:team:project:production",
    });

    expect(() => assertNotVercelOidc(token)).toThrow(VercelOidcAtInAppSurfaceError);
  });

  it("attaches token_kind and issuer to the structured error", async () => {
    const issuer = "https://oidc.vercel.com/team-x";
    const token = await signJwt({ iss: issuer });

    try {
      assertNotVercelOidc(token);
      fail("expected VercelOidcAtInAppSurfaceError");
    } catch (err) {
      expect(err).toBeInstanceOf(VercelOidcAtInAppSurfaceError);
      const e = err as VercelOidcAtInAppSurfaceError;
      expect(e.token_kind).toBe("vercel_oidc");
      expect(e.issuer).toBe(issuer);
    }
  });

  it("does not throw for an F02-issued service credential", async () => {
    const token = await signJwt({
      iss: "https://spyglass.example.com",
      aud: "spyglass-internal",
      sub: "service-principal-id",
      scopes: ["agents.run"],
      generation: 1,
    });

    expect(() => assertNotVercelOidc(token)).not.toThrow();
  });

  it("does not throw for a homograph-style attacker issuer", async () => {
    // `oidc.vercel.com.attacker.example` — confusingly similar but a
    // distinct host. Must NOT trip the guard (otherwise the guard
    // becomes a denial vector against legitimate F02 tokens).
    const token = await signJwt({
      iss: "https://oidc.vercel.com.attacker.example/path",
    });

    expect(() => assertNotVercelOidc(token)).not.toThrow();
  });

  it("does not throw when iss is a string that merely contains the substring", async () => {
    const token = await signJwt({
      iss: "https://example.com/?ref=oidc.vercel.com",
    });

    expect(() => assertNotVercelOidc(token)).not.toThrow();
  });

  it("matches the Vercel OIDC host case-insensitively", async () => {
    const token = await signJwt({ iss: "https://OIDC.Vercel.Com/team" });
    expect(() => assertNotVercelOidc(token)).toThrow(VercelOidcAtInAppSurfaceError);
  });

  it("rejects when iss carries an explicit port (closes port-in-host bypass)", async () => {
    const token = await signJwt({ iss: "https://oidc.vercel.com:8443/team" });
    expect(() => assertNotVercelOidc(token)).toThrow(VercelOidcAtInAppSurfaceError);
  });

  it("rejects when iss host carries a trailing dot (closes FQDN bypass)", async () => {
    const token = await signJwt({ iss: "https://oidc.vercel.com./team" });
    expect(() => assertNotVercelOidc(token)).toThrow(VercelOidcAtInAppSurfaceError);
  });

  it("does not throw for a JWE-shaped (5-segment) token — downstream verifier handles it", () => {
    // jose's decodeJwt rejects 5-segment compact JWE; guard must
    // fall through silently so the downstream verifier produces
    // its own malformed_payload / decryption error.
    const fakeJwe = "aaaa.bbbb.cccc.dddd.eeee";
    expect(() => assertNotVercelOidc(fakeJwe)).not.toThrow();
  });

  it("does not throw for a malformed (undecodable) token — downstream verifier maps it", () => {
    expect(() => assertNotVercelOidc("not-a-jwt")).not.toThrow();
  });

  it("does not throw for an empty token — downstream verifier handles it", () => {
    expect(() => assertNotVercelOidc("")).not.toThrow();
  });

  it("does not throw when iss claim is absent", async () => {
    const token = await signJwt({ sub: "x" });
    expect(() => assertNotVercelOidc(token)).not.toThrow();
  });

  it("does not throw when iss is non-string (malformed)", async () => {
    const token = await signJwt({ iss: 12345 as unknown as string });
    expect(() => assertNotVercelOidc(token)).not.toThrow();
  });
});
