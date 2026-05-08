// F02 T020 — `resolvePrincipalFromSession` unit tests.
//
// Verifies the lazy materialization path against a Clerk session:
//   - returns null when there is no userId.
//   - builds a seeker snapshot when orgId is null.
//   - builds an employer/operator snapshot with org context.
//   - returns the materialized HumanPrincipal with the right tier.

// next/jest sets jsdom; the resolver only touches pure JS so it
// works there without polyfills. We provide a fake repo + sink so
// no DB connection is needed.

import type {
  AuditEventSink,
  OrganizationLookup,
  PrincipalLookup,
  PrincipalRepo,
} from "@spyglass/auth";

import { resolvePrincipalFromSession } from "../session-resolver.js";

function makeRepo(): { repo: PrincipalRepo; principals: PrincipalLookup[] } {
  const orgs: OrganizationLookup[] = [];
  const ps: PrincipalLookup[] = [];
  const repo: PrincipalRepo = {
    async findOrganizationByClerkId(clerkOrgId) {
      return orgs.find((o) => o.clerk_org_id === clerkOrgId) ?? null;
    },
    async upsertOrganization(input) {
      const lookup: OrganizationLookup = {
        org_id: `org_${orgs.length + 1}`,
        clerk_org_id: input.clerk_org_id,
        kind: input.kind,
      };
      orgs.push(lookup);
      return lookup;
    },
    async findHumanPrincipal(input) {
      return (
        ps.find((p) => p.external_id === input.external_id && p.org_id === input.org_id) ?? null
      );
    },
    async upsertHumanPrincipal(input) {
      const lookup: PrincipalLookup = {
        principal_id: `p_${ps.length + 1}`,
        external_id: input.external_id,
        tier: input.tier,
        org_id: input.org_id,
        disabled_at: null,
      };
      ps.push(lookup);
      return lookup;
    },
    async disablePrincipal() {},
  };
  return { repo, principals: ps };
}

const sink: AuditEventSink = { async emit() {} };

const baseDeps = {
  sink,
  operatorClerkOrgIds: new Set(["org_op_clerk"]),
  now: () => 1_000_000,
  correlationId: () => "c-test",
};

describe("resolvePrincipalFromSession", () => {
  it("returns null when there is no userId", async () => {
    const { repo } = makeRepo();
    const result = await resolvePrincipalFromSession(
      { userId: null, orgId: null, orgRole: null },
      { repo, ...baseDeps },
    );
    expect(result).toBeNull();
  });

  it("materializes a seeker when orgId is null", async () => {
    const { repo, principals: ps } = makeRepo();
    const result = await resolvePrincipalFromSession(
      { userId: "user_a", orgId: null, orgRole: null },
      { repo, ...baseDeps },
    );
    expect(result?.kind).toBe("human");
    expect(result?.tier).toBe("seeker");
    expect(result?.external_id).toBe("user_a");
    expect(ps).toHaveLength(1);
    expect(ps[0]?.org_id).toBeNull();
  });

  it("materializes an employer_admin in a non-operator org", async () => {
    const { repo } = makeRepo();
    const result = await resolvePrincipalFromSession(
      { userId: "user_b", orgId: "org_acme", orgRole: "org:admin" },
      { repo, ...baseDeps },
    );
    expect(result?.tier).toBe("employer_admin");
    expect(result?.org_id).toBe("org_1");
  });

  it("materializes an operator when orgId is in the operator allowlist", async () => {
    const { repo } = makeRepo();
    const result = await resolvePrincipalFromSession(
      { userId: "user_c", orgId: "org_op_clerk", orgRole: "org:admin" },
      { repo, ...baseDeps },
    );
    expect(result?.tier).toBe("operator");
  });

  it("is idempotent across repeated calls (no duplicate principals)", async () => {
    const { repo, principals: ps } = makeRepo();
    await resolvePrincipalFromSession(
      { userId: "user_a", orgId: null, orgRole: null },
      { repo, ...baseDeps },
    );
    await resolvePrincipalFromSession(
      { userId: "user_a", orgId: null, orgRole: null },
      { repo, ...baseDeps },
    );
    expect(ps).toHaveLength(1);
  });
});
