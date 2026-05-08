// F02 T030/T034 — Composite proxy decision tests.
//
// End-to-end coverage of the proxy.ts decision pipeline (without
// spinning up Next.js): audience gate + AAL2 gate together. Locks
// down FR-9 (operator URL returns 404 to non-operators) and the
// FR-11/12/13 step-up redirect.

import { decideRouteAccess } from "../proxy/decide-access.js";

const operatorOrgIds = new Set(["org_op"]);

const baseSession = {
  userId: null,
  orgId: null,
  orgRole: null,
  operatorClerkOrgIds: operatorOrgIds,
};

const aalNone = { secondFactorVerificationAge: -1 };
const aalGood = { secondFactorVerificationAge: 60 };

describe("decideRouteAccess — public paths", () => {
  it("treats /api/webhooks/clerk as public (no audience gate)", () => {
    const result = decideRouteAccess({
      pathname: "/api/webhooks/clerk",
      session: baseSession,
      aal: aalNone,
    });
    expect(result.kind).toBe("public");
  });

  it("treats / (marketing) as public", () => {
    const result = decideRouteAccess({
      pathname: "/",
      session: baseSession,
      aal: aalNone,
    });
    expect(result.kind).toBe("public");
  });
});

describe("decideRouteAccess — operator surface (FR-9 hidden)", () => {
  it("returns 404 for unauthenticated /operator request (T034)", () => {
    expect(
      decideRouteAccess({ pathname: "/operator", session: baseSession, aal: aalNone }).kind,
    ).toBe("not_found");
  });

  it("returns 404 for a seeker hitting /operator", () => {
    expect(
      decideRouteAccess({
        pathname: "/operator/users",
        session: { ...baseSession, userId: "user_a" },
        aal: aalGood,
      }).kind,
    ).toBe("not_found");
  });

  it("returns 404 for an employer admin hitting /operator", () => {
    expect(
      decideRouteAccess({
        pathname: "/operator",
        session: {
          ...baseSession,
          userId: "user_b",
          orgId: "org_acme",
          orgRole: "org:admin",
        },
        aal: aalGood,
      }).kind,
    ).toBe("not_found");
  });

  it("step-up required for an operator at AAL1", () => {
    const result = decideRouteAccess({
      pathname: "/operator",
      session: {
        ...baseSession,
        userId: "user_op",
        orgId: "org_op",
        orgRole: "org:admin",
      },
      aal: aalNone,
    });
    expect(result).toEqual({ kind: "redirect_step_up", audience: "operator" });
  });

  it("allows operator at AAL2", () => {
    const result = decideRouteAccess({
      pathname: "/operator",
      session: {
        ...baseSession,
        userId: "user_op",
        orgId: "org_op",
        orgRole: "org:admin",
      },
      aal: aalGood,
    });
    expect(result.kind).toBe("allow");
  });
});

describe("decideRouteAccess — employer surface (FR-11/12/13 AAL2)", () => {
  it("redirects unauthenticated to sign-in", () => {
    const result = decideRouteAccess({
      pathname: "/employer",
      session: baseSession,
      aal: aalNone,
    });
    expect(result).toEqual({ kind: "redirect_sign_in", audience: "employer" });
  });

  it("step-up required for employer_admin at AAL1", () => {
    const result = decideRouteAccess({
      pathname: "/employer",
      session: {
        ...baseSession,
        userId: "user_b",
        orgId: "org_acme",
        orgRole: "org:admin",
      },
      aal: aalNone,
    });
    expect(result.kind).toBe("redirect_step_up");
  });

  it("step-up required for employer_member at AAL1 (FR-13 inherited)", () => {
    const result = decideRouteAccess({
      pathname: "/employer/jobs",
      session: {
        ...baseSession,
        userId: "user_b",
        orgId: "org_acme",
        orgRole: "org:member",
      },
      aal: aalNone,
    });
    expect(result.kind).toBe("redirect_step_up");
  });

  it("allows employer_admin at AAL2", () => {
    const result = decideRouteAccess({
      pathname: "/employer",
      session: {
        ...baseSession,
        userId: "user_b",
        orgId: "org_acme",
        orgRole: "org:admin",
      },
      aal: aalGood,
    });
    expect(result.kind).toBe("allow");
  });

  it("404s a seeker hitting /employer", () => {
    expect(
      decideRouteAccess({
        pathname: "/employer",
        session: { ...baseSession, userId: "user_a" },
        aal: aalNone,
      }).kind,
    ).toBe("not_found");
  });
});

describe("decideRouteAccess — seeker surface (FR-14 AAL1 ok)", () => {
  it("allows seeker at AAL1 (no MFA mandate)", () => {
    const result = decideRouteAccess({
      pathname: "/seeker",
      session: { ...baseSession, userId: "user_a" },
      aal: aalNone,
    });
    expect(result.kind).toBe("allow");
  });

  it("redirects unauthenticated seeker to sign-in", () => {
    expect(
      decideRouteAccess({ pathname: "/seeker", session: baseSession, aal: aalNone }).kind,
    ).toBe("redirect_sign_in");
  });
});
