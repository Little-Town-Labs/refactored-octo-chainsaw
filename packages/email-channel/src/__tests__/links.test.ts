import { createEmailAdapter } from "../adapter.js";
import { optionsWithLinks, pendingEmailEvent, pendingLink } from "./fixtures.js";

describe("email channel links", () => {
  it("normalizes pending-link verification messages without verified principal posture", () => {
    const adapter = createEmailAdapter(optionsWithLinks([pendingLink]));

    const result = adapter.normalizeInbound(pendingEmailEvent());

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.refusal.message);
    expect(result.message.participant.link_status).toBe("pending_verification");
    expect(result.message.participant.principal_id).toBeUndefined();
    expect(result.message.thread.state).toBe("awaiting_verification");
  });
});
