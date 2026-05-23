import { createWebChatAdapter } from "../adapter.js";
import { pendingLink, pendingWebChatEvent, optionsWithLinks } from "./fixtures.js";

describe("web-chat pending links", () => {
  it("normalizes pending-link verification and resume responses", () => {
    const adapter = createWebChatAdapter(optionsWithLinks([pendingLink]));
    const result = adapter.normalizeInbound(pendingWebChatEvent());

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.refusal.message);
    expect(result.message.participant.link_status).toBe("pending_verification");
    expect(result.message.thread.state).toBe("awaiting_verification");
  });
});
