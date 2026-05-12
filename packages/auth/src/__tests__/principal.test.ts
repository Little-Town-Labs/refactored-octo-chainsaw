// F02 T002 — Principal discriminated union (test-first).
//
// Tests assert the type-level shape of the Principal model and the
// runtime helpers that consumers will use. Per Constitution v2.0.0
// §I.5.3, the Principal carries an opaque `principal_id` distinct
// from any external IdP identifier (FR-2).

import {
  isAgentPrincipal,
  isHumanPrincipal,
  isServicePrincipal,
  type AgentPrincipal,
  type HumanPrincipal,
  type Principal,
  type ServicePrincipal,
} from "../principal.js";

const baseFields = {
  principal_id: "00000000-0000-0000-0000-000000000001",
  issued_at: 1_700_000_000,
  correlation_id: "corr-1",
} as const;

const human: HumanPrincipal = {
  ...baseFields,
  kind: "human",
  tier: "seeker",
  external_idp: "clerk",
  external_id: "user_clerk_abc",
};

const employerMember: HumanPrincipal = {
  ...baseFields,
  kind: "human",
  tier: "employer_member",
  external_idp: "clerk",
  external_id: "user_clerk_xyz",
  org_id: "00000000-0000-0000-0000-000000000010",
};

const agent: AgentPrincipal = {
  ...baseFields,
  kind: "agent",
  run_id: "00000000-0000-0000-0000-000000000020",
  side: "seeker",
  contract_id: "test-contract-v1",
  contract_version: "1.0.0",
  ticket_id: "00000000-0000-0000-0000-000000000030",
  scopes: ["tools.lookup_resume", "tools.read_rubric"],
};

const service: ServicePrincipal = {
  ...baseFields,
  kind: "service",
  service_name: "dossier-signer",
  service_version: "1.2.3",
  scopes: ["dossier.sign"],
};

describe("Principal discriminated union (FR-1, FR-2)", () => {
  describe("type guards", () => {
    it("isHumanPrincipal matches only human", () => {
      expect(isHumanPrincipal(human)).toBe(true);
      expect(isHumanPrincipal(agent)).toBe(false);
      expect(isHumanPrincipal(service)).toBe(false);
    });

    it("isAgentPrincipal matches only agent", () => {
      expect(isAgentPrincipal(agent)).toBe(true);
      expect(isAgentPrincipal(human)).toBe(false);
      expect(isAgentPrincipal(service)).toBe(false);
    });

    it("isServicePrincipal matches only service", () => {
      expect(isServicePrincipal(service)).toBe(true);
      expect(isServicePrincipal(human)).toBe(false);
      expect(isServicePrincipal(agent)).toBe(false);
    });
  });

  describe("opaque principal_id (FR-2)", () => {
    it("the human principal exposes a principal_id distinct from external_id", () => {
      expect(human.principal_id).not.toBe(human.external_id);
    });

    it("agents have no external_idp / external_id (kind invariant)", () => {
      // @ts-expect-error — AgentPrincipal must not carry external_idp.
      const _bad: AgentPrincipal = { ...agent, external_idp: "clerk" };
      void _bad;
    });
  });

  describe("type-level discriminator (Story 7)", () => {
    it("exhaustive switch compiles — consumers cannot conflate kinds", () => {
      function describe_(p: Principal): string {
        switch (p.kind) {
          case "human":
            return `human:${p.tier}`;
          case "agent":
            return `agent:${p.run_id}:${p.side}`;
          case "service":
            return `service:${p.service_name}@${p.service_version}`;
        }
      }
      expect(describe_(human)).toBe("human:seeker");
      expect(describe_(agent)).toContain("agent:");
      expect(describe_(service)).toBe("service:dossier-signer@1.2.3");
    });

    it("employer-member carries org_id (FR-3 invariant)", () => {
      expect(employerMember.org_id).toBeDefined();
    });
  });
});
