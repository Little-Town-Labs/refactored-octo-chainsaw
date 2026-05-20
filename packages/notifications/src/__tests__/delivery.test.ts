import { createDeliveryCommand } from "../delivery.js";
import { evaluateNotificationGate } from "../gate.js";
import { policyRef, seededArtifact } from "./fixtures.js";

describe("notification delivery commands", () => {
  it("creates deterministic idempotency keys only after an allowed gate", async () => {
    const { repository, artifact, template } = await seededArtifact();
    const refused = await evaluateNotificationGate({
      repository,
      match_id: artifact.match_id,
      artifact,
      template,
      policy_ref: policyRef(),
      evaluated_at: new Date("2026-06-02T00:00:00Z"),
    });
    await expect(
      createDeliveryCommand({ repository, artifact, gate: refused, channel_intent: "email" }),
    ).rejects.toThrow("not_yet_eligible");
    const allowed = await evaluateNotificationGate({
      repository,
      match_id: artifact.match_id,
      artifact,
      template,
      policy_ref: policyRef(),
      evaluated_at: new Date("2026-06-03T00:00:00Z"),
    });
    const first = await createDeliveryCommand({
      repository,
      artifact,
      gate: allowed,
      channel_intent: "email",
    });
    const second = await createDeliveryCommand({
      repository,
      artifact,
      gate: allowed,
      channel_intent: "email",
    });
    expect(first.idempotency_key).toBe(second.idempotency_key);
  });
});
