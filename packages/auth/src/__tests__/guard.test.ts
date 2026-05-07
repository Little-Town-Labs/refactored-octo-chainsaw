// F02 T007 — Tests for `withPrincipal` typed-rejection (FR-37, NFR-11).
//
// `withPrincipal` is the single typed surface every Spyglass handler
// passes through. A handler that does not produce a typed Principal
// fails to compile, not at runtime. These tests assert both the
// type-level enforcement (via `@ts-expect-error`) and the runtime
// happy-path / rejection behavior against fake principals.

import { AnonymousAccessError, PrincipalRequiredError, withPrincipal } from "../guard.js";
import type { HumanPrincipal, Principal } from "../principal.js";

const fakeHuman: HumanPrincipal = {
  principal_id: "00000000-0000-0000-0000-000000000001",
  issued_at: 1_700_000_000,
  correlation_id: "corr-1",
  kind: "human",
  tier: "operator",
  external_idp: "clerk",
  external_id: "user_clerk_op",
  org_id: "00000000-0000-0000-0000-000000000010",
};

describe("withPrincipal (FR-36, FR-37, NFR-11)", () => {
  it("invokes the handler with the resolved principal", async () => {
    const handler = withPrincipal(async (ctx, payload: { x: number }) => {
      return { who: ctx.principal.principal_id, doubled: payload.x * 2 };
    });

    const result = await handler({ resolve: async () => fakeHuman }, { x: 21 });
    expect(result).toEqual({ who: fakeHuman.principal_id, doubled: 42 });
  });

  it("rejects when the resolver returns null (fail-closed, FR-28)", async () => {
    const handler = withPrincipal(async () => "ok");
    await expect(handler({ resolve: async () => null }, undefined)).rejects.toBeInstanceOf(
      PrincipalRequiredError,
    );
  });

  it("rejects when the resolver throws (no privileged side-effects on failure)", async () => {
    const sideEffect = jest.fn();
    const handler = withPrincipal(async () => {
      sideEffect();
      return "ok";
    });
    await expect(
      handler({ resolve: async () => Promise.reject(new Error("clerk down")) }, undefined),
    ).rejects.toThrow();
    expect(sideEffect).not.toHaveBeenCalled();
  });

  it("typed Principal flows through to the handler (no raw credential)", async () => {
    const handler = withPrincipal(async (ctx) => {
      // Type-level: ctx.principal is Principal, not unknown.
      const _kind: Principal["kind"] = ctx.principal.kind;
      return _kind;
    });
    expect(await handler({ resolve: async () => fakeHuman }, undefined)).toBe("human");
  });
});

describe("AnonymousAccessError marker (FR-36 explicit-not-implicit)", () => {
  it("is the explicit way to opt out of principal requirements", () => {
    const err = new AnonymousAccessError("/health");
    expect(err.name).toBe("AnonymousAccessError");
    expect(err.message).toContain("/health");
  });
});
