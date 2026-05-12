// F02 T018 — Clerk session → tier inference tests.

import {
  InvalidOperatorClerkOrgIdError,
  clerkSessionToTier,
  parseOperatorClerkOrgIds,
} from "../proxy/clerk-session.js";
import { evaluateAudienceByTier } from "../proxy/audience.js";

const operatorIds = new Set(["org_op"]);

describe("clerkSessionToTier", () => {
  it("returns null when there is no session", () => {
    expect(
      clerkSessionToTier({
        userId: null,
        orgId: null,
        orgRole: null,
        operatorClerkOrgIds: operatorIds,
      }),
    ).toBeNull();
  });

  it("returns 'seeker' for a session with no orgId", () => {
    expect(
      clerkSessionToTier({
        userId: "user_1",
        orgId: null,
        orgRole: null,
        operatorClerkOrgIds: operatorIds,
      }),
    ).toBe("seeker");
  });

  it("returns 'operator' when orgId is in the operator allowlist", () => {
    expect(
      clerkSessionToTier({
        userId: "user_1",
        orgId: "org_op",
        orgRole: "org:admin",
        operatorClerkOrgIds: operatorIds,
      }),
    ).toBe("operator");
  });

  it("returns 'employer_admin' for org:admin in a non-operator org", () => {
    expect(
      clerkSessionToTier({
        userId: "user_1",
        orgId: "org_acme",
        orgRole: "org:admin",
        operatorClerkOrgIds: operatorIds,
      }),
    ).toBe("employer_admin");
  });

  it("returns 'employer_member' for the 'org:member' role", () => {
    expect(
      clerkSessionToTier({
        userId: "user_1",
        orgId: "org_acme",
        orgRole: "org:member",
        operatorClerkOrgIds: operatorIds,
      }),
    ).toBe("employer_member");
  });

  it("returns null for an unknown org role (fail-safe deny)", () => {
    expect(
      clerkSessionToTier({
        userId: "user_1",
        orgId: "org_acme",
        orgRole: "org:billing_admin",
        operatorClerkOrgIds: operatorIds,
      }),
    ).toBeNull();
  });

  it("returns null when orgRole is null on a non-operator org", () => {
    expect(
      clerkSessionToTier({
        userId: "user_1",
        orgId: "org_acme",
        orgRole: null,
        operatorClerkOrgIds: operatorIds,
      }),
    ).toBeNull();
  });
});

describe("parseOperatorClerkOrgIds (T068/LOW-4 shape validation)", () => {
  it("returns an empty set for undefined / empty input", () => {
    expect(parseOperatorClerkOrgIds(undefined).size).toBe(0);
    expect(parseOperatorClerkOrgIds("").size).toBe(0);
  });

  it("accepts a single well-formed org id", () => {
    const out = parseOperatorClerkOrgIds("org_abc123");
    expect(out.has("org_abc123")).toBe(true);
    expect(out.size).toBe(1);
  });

  it("accepts comma-separated well-formed ids with whitespace", () => {
    const out = parseOperatorClerkOrgIds(" org_a , org_b ,org_c123");
    expect(out.has("org_a")).toBe(true);
    expect(out.has("org_b")).toBe(true);
    expect(out.has("org_c123")).toBe(true);
    expect(out.size).toBe(3);
  });

  it("drops whitespace-only entries between commas", () => {
    expect(parseOperatorClerkOrgIds("org_a, ,org_b").size).toBe(2);
  });

  it("throws InvalidOperatorClerkOrgIdError on a malformed entry", () => {
    expect(() => parseOperatorClerkOrgIds("user_abc")).toThrow(InvalidOperatorClerkOrgIdError);
    expect(() => parseOperatorClerkOrgIds("org_abc,not-an-org")).toThrow(
      InvalidOperatorClerkOrgIdError,
    );
    expect(() => parseOperatorClerkOrgIds("org_abc!")).toThrow(InvalidOperatorClerkOrgIdError);
    expect(() => parseOperatorClerkOrgIds("orgs_abc")).toThrow(InvalidOperatorClerkOrgIdError);
  });
});

describe("evaluateAudienceByTier", () => {
  it("operator surface is hidden — null tier returns 404", () => {
    expect(evaluateAudienceByTier("operator", null).kind).toBe("not_found");
  });

  it("operator surface allows operators only", () => {
    expect(evaluateAudienceByTier("operator", "operator").kind).toBe("allow");
    expect(evaluateAudienceByTier("operator", "employer_admin").kind).toBe("not_found");
  });

  it("employer surface returns 401 unauthenticated, 404 wrong tier, allow for employer_*", () => {
    expect(evaluateAudienceByTier("employer", null).kind).toBe("unauthorized");
    expect(evaluateAudienceByTier("employer", "seeker").kind).toBe("not_found");
    expect(evaluateAudienceByTier("employer", "employer_admin").kind).toBe("allow");
    expect(evaluateAudienceByTier("employer", "employer_member").kind).toBe("allow");
    expect(evaluateAudienceByTier("employer", "operator").kind).toBe("not_found");
  });

  it("seeker surface returns 401 unauthenticated, 404 wrong tier, allow for seeker", () => {
    expect(evaluateAudienceByTier("seeker", null).kind).toBe("unauthorized");
    expect(evaluateAudienceByTier("seeker", "seeker").kind).toBe("allow");
    expect(evaluateAudienceByTier("seeker", "employer_admin").kind).toBe("not_found");
    expect(evaluateAudienceByTier("seeker", "operator").kind).toBe("not_found");
  });
});
