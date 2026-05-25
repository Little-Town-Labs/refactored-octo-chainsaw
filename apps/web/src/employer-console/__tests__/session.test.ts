import type { HumanPrincipal } from "@spyglass/auth";

import { EmployerOrganizationRequiredError, getEmployerConsoleSession } from "../session";

function principal(overrides: Partial<HumanPrincipal> = {}): HumanPrincipal {
  return {
    kind: "human",
    principal_id: "11111111-1111-4111-8111-000000000001",
    issued_at: 1,
    correlation_id: "corr",
    tier: "employer_admin",
    external_idp: "clerk",
    external_id: "user",
    org_id: "11111111-1111-4111-8111-000000000101",
    ...overrides,
  };
}

describe("getEmployerConsoleSession", () => {
  it("returns admin capabilities for employer admins", () => {
    expect(getEmployerConsoleSession(principal()).capabilities).toEqual([
      "profile:write",
      "req:write",
      "candidate:read",
    ]);
  });

  it("allows employer members for read mode only", () => {
    const member = principal({ tier: "employer_member" });
    expect(getEmployerConsoleSession(member, "read").capabilities).toEqual(["candidate:read"]);
    expect(() => getEmployerConsoleSession(member, "admin")).toThrow();
  });

  it("fails closed without an employer organization", () => {
    const { org_id: _drop, ...withoutOrg } = principal();
    void _drop;
    expect(() => getEmployerConsoleSession(withoutOrg)).toThrow(EmployerOrganizationRequiredError);
  });
});
