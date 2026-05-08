// F02 T038 — JWKS endpoint tests (EC-11, plan §7).

import { buildJwks } from "../jwks/build.js";
import { isJwksVisible, type JwksKeyRow, type JwksRepo } from "../jwks/types.js";

function row(overrides: Partial<JwksKeyRow>): JwksKeyRow {
  return {
    kid: "k1",
    algorithm: "EdDSA",
    public_key_jwk: { kty: "OKP", crv: "Ed25519", x: "A".repeat(43) },
    purpose: "agent",
    activated_at: new Date("2026-01-01T00:00:00Z"),
    retired_at: null,
    verify_until: null,
    ...overrides,
  };
}

describe("isJwksVisible", () => {
  const now = new Date("2026-05-08T00:00:00Z");

  it("hides pre-activation keys", () => {
    expect(isJwksVisible(row({ activated_at: null }), now)).toBe(false);
  });

  it("shows currently-active keys", () => {
    expect(isJwksVisible(row({ retired_at: null }), now)).toBe(true);
  });

  it("shows retired keys still within their verify window (verify-only)", () => {
    expect(
      isJwksVisible(
        row({
          retired_at: new Date("2026-04-01T00:00:00Z"),
          verify_until: new Date("2026-06-01T00:00:00Z"),
        }),
        now,
      ),
    ).toBe(true);
  });

  it("hides retired keys past their verify window", () => {
    expect(
      isJwksVisible(
        row({
          retired_at: new Date("2026-01-01T00:00:00Z"),
          verify_until: new Date("2026-04-01T00:00:00Z"),
        }),
        now,
      ),
    ).toBe(false);
  });

  it("shows retired keys with null verify_until (no expiration set)", () => {
    expect(isJwksVisible(row({ retired_at: new Date("2026-04-01T00:00:00Z") }), now)).toBe(true);
  });
});

describe("buildJwks", () => {
  it("renders the public JWK with kid/alg/use overlaid", () => {
    const result = buildJwks([
      row({ kid: "k_active" }),
      row({
        kid: "k_retiring",
        retired_at: new Date("2026-04-01T00:00:00Z"),
        verify_until: new Date("2026-06-01T00:00:00Z"),
      }),
    ]);
    expect(result.keys).toHaveLength(2);
    expect(result.keys[0]).toMatchObject({
      kid: "k_active",
      alg: "EdDSA",
      use: "sig",
      kty: "OKP",
      crv: "Ed25519",
    });
    expect(result.keys[1]?.kid).toBe("k_retiring");
  });

  it("emits an empty key list when nothing is visible", () => {
    expect(buildJwks([])).toEqual({ keys: [] });
  });
});

describe("JwksRepo contract via in-memory fake", () => {
  function fakeRepo(rows: JwksKeyRow[]): JwksRepo {
    return {
      async listVisibleKeys(purpose, now) {
        return rows.filter((r) => r.purpose === purpose && isJwksVisible(r, now));
      },
    };
  }

  const now = new Date("2026-05-08T00:00:00Z");
  const seedRows = [
    row({ kid: "agent_active", purpose: "agent" }),
    row({
      kid: "agent_retiring",
      purpose: "agent",
      retired_at: new Date("2026-04-01T00:00:00Z"),
      verify_until: new Date("2026-06-01T00:00:00Z"),
    }),
    row({ kid: "agent_pre", purpose: "agent", activated_at: null }),
    row({ kid: "service_active", purpose: "service" }),
  ];

  it("returns active + verify-only keys for purpose='agent'", async () => {
    const visible = await fakeRepo(seedRows).listVisibleKeys("agent", now);
    expect(visible.map((r) => r.kid).sort()).toEqual(["agent_active", "agent_retiring"]);
  });

  it("returns service keys only for purpose='service' (no cross-purpose leak)", async () => {
    const visible = await fakeRepo(seedRows).listVisibleKeys("service", now);
    expect(visible.map((r) => r.kid)).toEqual(["service_active"]);
  });
});
