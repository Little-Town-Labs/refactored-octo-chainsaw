import { evaluateJurisdictionGate } from "../evaluator.js";
import type { JurisdictionPolicyRevision } from "../types.js";

const BASE_INPUT = {
  subject_kind: "match_ticket" as const,
  subject_id: "match-001",
  correlation_id: "corr-001",
  principal_id: "11111111-1111-4111-8111-111111111111",
};

describe("evaluateJurisdictionGate", () => {
  test("allows when every jurisdiction has active allowed posture", () => {
    const decision = evaluateJurisdictionGate(
      { ...BASE_INPUT, jurisdiction_codes: ["us-mo", "US-KS"] },
      [policy("US-MO", "allowed", "v1"), policy("US-KS", "allowed", "v2")],
    );

    expect(decision).toMatchObject({
      decision: "allow",
      reason_code: "all_allowed",
      jurisdiction_codes: ["US-MO", "US-KS"],
      policy_version: "v1+v2",
    });
  });

  test.each([
    { name: "missing", jurisdiction_codes: [], policies: [], reason_code: "missing_jurisdiction" },
    {
      name: "unknown",
      jurisdiction_codes: ["US-CA"],
      policies: [],
      reason_code: "unknown_jurisdiction",
    },
    {
      name: "unsupported",
      jurisdiction_codes: ["US-NY"],
      policies: [policy("US-NY", "unsupported")],
      reason_code: "unsupported_jurisdiction",
    },
    {
      name: "disabled",
      jurisdiction_codes: ["US-TX"],
      policies: [policy("US-TX", "disabled")],
      reason_code: "disabled_jurisdiction",
    },
    {
      name: "multi-jurisdiction deny",
      jurisdiction_codes: ["US-MO", "US-NY"],
      policies: [policy("US-MO", "allowed"), policy("US-NY", "unsupported")],
      reason_code: "unsupported_jurisdiction",
    },
  ] as const)("denies $name jurisdictions with a stable reason code", (scenario) => {
    const decision = evaluateJurisdictionGate(
      { ...BASE_INPUT, jurisdiction_codes: scenario.jurisdiction_codes },
      scenario.policies,
    );

    expect(decision.decision).toBe("deny");
    expect(decision.reason_code).toBe(scenario.reason_code);
  });
});

function policy(
  jurisdictionCode: string,
  status: JurisdictionPolicyRevision["status"],
  version = "launch-v1",
): JurisdictionPolicyRevision {
  return {
    jurisdiction_policy_id: `${jurisdictionCode.toLowerCase()}-policy-id`,
    jurisdiction_code: jurisdictionCode,
    status,
    policy_version: version,
    effective_from: new Date("2026-05-20T00:00:00.000Z"),
    effective_until: null,
    operational_reason: "launch_posture",
    reviewer_principal_id: null,
    created_by_principal_id: "22222222-2222-4222-8222-222222222222",
    created_at: new Date("2026-05-20T00:00:00.000Z"),
  };
}
