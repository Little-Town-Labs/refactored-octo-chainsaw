import {
  FailureArtifactRequiresDenyError,
  projectFailureArtifact,
  serializeFailureArtifact,
} from "../failure-artifact.js";
import type { GateDecisionRecord, JurisdictionGateReasonCode } from "../types.js";

const DENIAL_REASONS = [
  "missing_jurisdiction",
  "unknown_jurisdiction",
  "unsupported_jurisdiction",
  "disabled_jurisdiction",
  "review_required",
  "expired_policy",
  "conflicting_jurisdictions",
  "unauthorized",
] as const;

describe("projectFailureArtifact", () => {
  test.each(DENIAL_REASONS)("projects %s denials into stable failure artifacts", (reasonCode) => {
    const decision = gateDecision(reasonCode);

    expect(projectFailureArtifact(decision)).toEqual({
      failure_artifact_id: `jurisdiction-failure:${decision.gate_decision_id}`,
      gate_decision_id: decision.gate_decision_id,
      subject_kind: "match_ticket",
      subject_id: "match-001",
      decision: "deny",
      reason_code: reasonCode,
      jurisdiction_codes: ["US-MO"],
      policy_version: "launch-v1",
      correlation_id: "corr-001",
      audit_event_id: "22222222-2222-4222-8222-222222222222",
      created_at: new Date("2026-05-20T12:00:00.000Z"),
    });
  });

  test("serializes date fields for schema validation", () => {
    expect(
      serializeFailureArtifact(projectFailureArtifact(gateDecision("disabled_jurisdiction"))),
    ).toMatchObject({
      created_at: "2026-05-20T12:00:00.000Z",
    });
  });

  test("does not expose principal ids, policy revision ids, or raw personal data", () => {
    const serialized = serializeFailureArtifact(
      projectFailureArtifact({
        ...gateDecision("unsupported_jurisdiction"),
        principal_id: "33333333-3333-4333-8333-333333333333",
        policy_revision_ids: ["44444444-4444-4444-8444-444444444444"],
      }),
    );

    expect(serialized).not.toHaveProperty("principal_id");
    expect(serialized).not.toHaveProperty("policy_revision_ids");
    expect(serialized).not.toHaveProperty("payload");
    expect(JSON.stringify(serialized)).not.toContain("33333333-3333-4333-8333-333333333333");
  });

  test("rejects allow decisions", () => {
    expect(() =>
      projectFailureArtifact({
        ...gateDecision("all_allowed"),
        decision: "allow",
      }),
    ).toThrow(FailureArtifactRequiresDenyError);
  });
});

function gateDecision(reasonCode: JurisdictionGateReasonCode): GateDecisionRecord {
  return {
    gate_decision_id: "11111111-1111-4111-8111-111111111111",
    subject_kind: "match_ticket",
    subject_id: "match-001",
    decision: reasonCode === "all_allowed" ? "allow" : "deny",
    reason_code: reasonCode,
    jurisdiction_codes: ["US-MO"],
    policy_version: "launch-v1",
    policy_revision_ids: ["44444444-4444-4444-8444-444444444444"],
    correlation_id: "corr-001",
    principal_id: "33333333-3333-4333-8333-333333333333",
    audit_event_id: "22222222-2222-4222-8222-222222222222",
    created_at: new Date("2026-05-20T12:00:00.000Z"),
  };
}
