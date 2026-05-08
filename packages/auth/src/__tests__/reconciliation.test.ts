// F02 T024 — Reconciliation diff tests (EC-2).

import { reconcilePrincipals } from "../reconciliation.js";

const orgIndex = new Map([
  ["org_acme_clerk", "org_acme_uuid"],
  ["org_op_clerk", "org_op_uuid"],
]);

describe("reconcilePrincipals", () => {
  it("reports zero drift when Clerk and DB are in sync", () => {
    const report = reconcilePrincipals({
      clerkRoster: [
        { userId: "user_a", orgIds: [] },
        { userId: "user_b", orgIds: ["org_acme_clerk"] },
      ],
      dbPrincipals: [
        { external_id: "user_a", org_id: null, disabled_at: null },
        { external_id: "user_b", org_id: "org_acme_uuid", disabled_at: null },
      ],
      clerkOrgIndex: orgIndex,
    });
    expect(report.drift).toBe(0);
    expect(report.missingInDb).toEqual([]);
    expect(report.missingInClerk).toEqual([]);
  });

  it("flags users present in Clerk but missing from DB (delayed webhook)", () => {
    const report = reconcilePrincipals({
      clerkRoster: [{ userId: "user_a", orgIds: [] }],
      dbPrincipals: [],
      clerkOrgIndex: orgIndex,
    });
    expect(report.drift).toBe(1);
    expect(report.missingInDb).toEqual([{ userId: "user_a", orgClerkId: null }]);
  });

  it("flags principals active in DB but absent from Clerk (deleted-user drift)", () => {
    const report = reconcilePrincipals({
      clerkRoster: [],
      dbPrincipals: [{ external_id: "user_z", org_id: null, disabled_at: null }],
      clerkOrgIndex: orgIndex,
    });
    expect(report.drift).toBe(1);
    expect(report.missingInClerk).toEqual([{ external_id: "user_z", org_id: null }]);
  });

  it("ignores disabled DB rows (they are not 'active')", () => {
    const report = reconcilePrincipals({
      clerkRoster: [],
      dbPrincipals: [{ external_id: "user_z", org_id: null, disabled_at: new Date() }],
      clerkOrgIndex: orgIndex,
    });
    expect(report.drift).toBe(0);
  });

  it("treats a Clerk org that has no matching organizations row as drift", () => {
    const report = reconcilePrincipals({
      clerkRoster: [{ userId: "user_b", orgIds: ["org_unknown"] }],
      dbPrincipals: [],
      clerkOrgIndex: orgIndex,
    });
    expect(report.drift).toBe(1);
    expect(report.missingInDb[0]?.orgClerkId).toBe("org_unknown");
  });
});
