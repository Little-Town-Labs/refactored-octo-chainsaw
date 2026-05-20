import { evaluateNotificationGate } from "../gate.js";
import { policyRef, seededArtifact, template } from "./fixtures.js";

describe("notification delivery gate", () => {
  it("refuses before eligible delivery and allows after eligibility", async () => {
    const { repository, artifact, template: baseTemplate } = await seededArtifact();
    const early = await evaluateNotificationGate({
      repository,
      match_id: artifact.match_id,
      artifact,
      template: baseTemplate,
      policy_ref: policyRef(),
      evaluated_at: new Date("2026-06-02T00:00:00Z"),
    });
    expect(early.decision).toBe("refused");
    expect(early.reason_code).toBe("not_yet_eligible");
    const allowed = await evaluateNotificationGate({
      repository,
      match_id: artifact.match_id,
      artifact,
      template: baseTemplate,
      policy_ref: policyRef(),
      evaluated_at: new Date("2026-06-03T00:00:00Z"),
    });
    expect(allowed.decision).toBe("allowed");
    expect(allowed.reason_code).toBe("notice_ready");
  });

  it("refuses missing artifacts and superseded templates", async () => {
    const { repository, artifact } = await seededArtifact();
    const missing = await evaluateNotificationGate({
      repository,
      match_id: artifact.match_id,
      artifact: null,
      policy_ref: policyRef(),
    });
    expect(missing.reason_code).toBe("missing_artifact");
    const superseded = await evaluateNotificationGate({
      repository,
      match_id: artifact.match_id,
      artifact,
      template: template({ status: "superseded" }),
      policy_ref: policyRef(),
      evaluated_at: new Date("2026-06-03T00:00:00Z"),
    });
    expect(superseded.reason_code).toBe("template_superseded");
  });
});
