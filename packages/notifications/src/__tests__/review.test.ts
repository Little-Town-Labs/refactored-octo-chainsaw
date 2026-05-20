import { readNotificationReviewBundle } from "../review.js";
import { createDeliveryCommand } from "../delivery.js";
import { evaluateNotificationGate } from "../gate.js";
import { operator, policyRef, seededArtifact, unscoped } from "./fixtures.js";

describe("notification review reads", () => {
  it("returns scoped evidence and denies unscoped reads", async () => {
    const { repository, artifact, template } = await seededArtifact();
    const gate = await evaluateNotificationGate({
      repository,
      match_id: artifact.match_id,
      artifact,
      template,
      policy_ref: policyRef(),
      evaluated_at: new Date("2026-06-03T00:00:00Z"),
    });
    await createDeliveryCommand({
      repository,
      artifact,
      gate,
      channel_intent: "email",
    });
    const bundle = await readNotificationReviewBundle({
      repository,
      principal: operator(),
      match_id: artifact.match_id,
    });
    expect(bundle.templates).toHaveLength(1);
    expect(bundle.artifacts).toHaveLength(1);
    expect(bundle.gate_events).toHaveLength(1);
    expect(bundle.delivery_commands).toHaveLength(1);
    await expect(
      readNotificationReviewBundle({ repository, principal: unscoped() }),
    ).rejects.toThrow(/missing_scope/);
  });
});
