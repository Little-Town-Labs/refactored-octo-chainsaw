// F02 T017 — Audience gate tests (FR-9, FR-36).

import { audienceForPath, evaluateAudience, type RouteAudience } from "../proxy/audience.js";
import type { AgentPrincipal, HumanPrincipal, HumanTier, ServicePrincipal } from "../principal.js";

function human(tier: HumanTier): HumanPrincipal {
  return {
    principal_id: "p_human",
    issued_at: 0,
    correlation_id: "c1",
    kind: "human",
    tier,
    external_idp: "clerk",
    external_id: "user_x",
    ...(tier !== "seeker" ? { org_id: "org_x" } : {}),
  };
}

const agent: AgentPrincipal = {
  principal_id: "p_agent",
  issued_at: 0,
  correlation_id: "c1",
  kind: "agent",
  run_id: "run_1",
  side: "seeker",
  contract_id: "k_1",
  contract_version: "v1",
  ticket_id: "tk_1",
  scopes: [],
};

const service: ServicePrincipal = {
  principal_id: "p_svc",
  issued_at: 0,
  correlation_id: "c1",
  kind: "service",
  service_name: "core",
  service_version: "1.0.0",
  scopes: [],
};

describe("evaluateAudience — operator (FR-9 hidden surface)", () => {
  it("allows operator principals", () => {
    expect(evaluateAudience("operator", human("operator")).kind).toBe("allow");
  });

  it("returns 404 (not 401) for unauthenticated requests", () => {
    expect(evaluateAudience("operator", null).kind).toBe("not_found");
  });

  it.each<HumanTier>(["seeker", "employer_admin", "employer_member"])(
    "returns 404 for human tier '%s'",
    (tier) => {
      expect(evaluateAudience("operator", human(tier)).kind).toBe("not_found");
    },
  );

  it("returns 404 for agent and service principals", () => {
    expect(evaluateAudience("operator", agent).kind).toBe("not_found");
    expect(evaluateAudience("operator", service).kind).toBe("not_found");
  });
});

describe("evaluateAudience — employer", () => {
  it.each<HumanTier>(["employer_admin", "employer_member"])("allows tier '%s'", (tier) => {
    expect(evaluateAudience("employer", human(tier)).kind).toBe("allow");
  });

  it("returns 401 for unauthenticated requests (sign-in redirect)", () => {
    expect(evaluateAudience("employer", null).kind).toBe("unauthorized");
  });

  it("returns 404 for seekers (don't leak which tiers exist)", () => {
    expect(evaluateAudience("employer", human("seeker")).kind).toBe("not_found");
  });

  it("returns 404 for operators on the employer surface", () => {
    expect(evaluateAudience("employer", human("operator")).kind).toBe("not_found");
  });

  it("returns 404 for non-human principals", () => {
    expect(evaluateAudience("employer", agent).kind).toBe("not_found");
    expect(evaluateAudience("employer", service).kind).toBe("not_found");
  });
});

describe("evaluateAudience — seeker", () => {
  it("allows seeker tier", () => {
    expect(evaluateAudience("seeker", human("seeker")).kind).toBe("allow");
  });

  it("returns 401 for unauthenticated", () => {
    expect(evaluateAudience("seeker", null).kind).toBe("unauthorized");
  });

  it.each<HumanTier>(["employer_admin", "employer_member", "operator"])(
    "returns 404 for tier '%s'",
    (tier) => {
      expect(evaluateAudience("seeker", human(tier)).kind).toBe("not_found");
    },
  );
});

describe("audienceForPath", () => {
  it.each<[string, RouteAudience | null]>([
    ["/seeker", "seeker"],
    ["/seeker/dashboard", "seeker"],
    ["/employer", "employer"],
    ["/employer/jobs/123", "employer"],
    ["/operator", "operator"],
    ["/operator/users", "operator"],
    ["/", null],
    ["/api/webhooks/clerk", null],
    ["/sign-in", null],
  ])("maps %s -> %s", (path, expected) => {
    expect(audienceForPath(path)).toBe(expected);
  });
});
