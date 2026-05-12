// F02 T031 — requireRole / requireScope tests (FR-27, FR-28, FR-30).

import { requireRole, requireScope, RoleRequiredError, ScopeRequiredError } from "../authorize.js";
import type { AgentPrincipal, HumanPrincipal, HumanTier, ServicePrincipal } from "../principal.js";

function human(tier: HumanTier): HumanPrincipal {
  return {
    principal_id: "p_h",
    issued_at: 0,
    correlation_id: "c1",
    kind: "human",
    tier,
    external_idp: "clerk",
    external_id: "user_x",
    ...(tier !== "seeker" ? { org_id: "org_x" } : {}),
  };
}

function agent(scopes: ReadonlyArray<string>): AgentPrincipal {
  return {
    principal_id: "p_a",
    issued_at: 0,
    correlation_id: "c1",
    kind: "agent",
    run_id: "run_1",
    side: "seeker",
    contract_id: "k_1",
    contract_version: "v1",
    ticket_id: "tk_1",
    scopes,
  };
}

function service(scopes: ReadonlyArray<string>): ServicePrincipal {
  return {
    principal_id: "p_s",
    issued_at: 0,
    correlation_id: "c1",
    kind: "service",
    service_name: "core",
    service_version: "1.0.0",
    scopes,
  };
}

describe("requireRole", () => {
  it("returns the narrowed HumanPrincipal when the tier matches", () => {
    const op = requireRole(human("operator"), "operator");
    // Type narrowing — `tier` is reachable without a kind check.
    expect(op.tier).toBe("operator");
  });

  it("accepts any of multiple allowed tiers", () => {
    expect(requireRole(human("employer_admin"), "operator", "employer_admin").tier).toBe(
      "employer_admin",
    );
  });

  it("throws RoleRequiredError when the tier is wrong", () => {
    expect(() => requireRole(human("seeker"), "operator")).toThrow(RoleRequiredError);
  });

  it("throws RoleRequiredError when the principal is not human", () => {
    expect(() => requireRole(agent([]), "operator")).toThrow(RoleRequiredError);
    expect(() => requireRole(service([]), "operator")).toThrow(RoleRequiredError);
  });
});

describe("requireScope", () => {
  it("returns the agent principal when the scope is granted", () => {
    const a = agent(["dossier.view"]);
    expect(requireScope(a, "dossier.view")).toBe(a);
  });

  it("throws ScopeRequiredError when the scope is missing", () => {
    expect(() => requireScope(agent(["other.scope"]), "dossier.view")).toThrow(ScopeRequiredError);
  });

  it("works for service principals", () => {
    const s = service(["queue.publish"]);
    expect(requireScope(s, "queue.publish")).toBe(s);
  });

  it("HumanPrincipals never satisfy a scope check (use requireRole instead)", () => {
    expect(() => requireScope(human("operator"), "any.scope")).toThrow(ScopeRequiredError);
  });
});
