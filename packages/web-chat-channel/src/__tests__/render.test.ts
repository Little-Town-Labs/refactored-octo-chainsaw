import { createChannelMessage } from "@spyglass/channels-core";

import { renderWebChatOutbound } from "../render.js";
import { approvedOutboundMessage, richOutboundMessage, systemOutboundMessage } from "./fixtures.js";

describe("web-chat render", () => {
  it("renders approved outbound text and system notices", () => {
    const text = renderWebChatOutbound(approvedOutboundMessage());
    const system = renderWebChatOutbound(systemOutboundMessage());

    expect(text.ok).toBe(true);
    if (!text.ok) throw new Error(text.refusal.message);
    expect(text.native_payload.message_parts[0]?.text).toContain("match");
    expect(text.native_payload.accessibility.status_announcement).toBe("polite");
    expect(system.ok).toBe(true);
  });

  it("refuses missing/unapproved projection, invalid targets, closed threads, and unsafe metadata", () => {
    const missingProjection = createChannelMessage({
      ...approvedOutboundMessage(),
      idempotency_key: "outbound:web:missing-projection",
      disclosure: { posture: "refused" },
    });
    expect(renderWebChatOutbound(missingProjection).ok).toBe(false);

    const closedThread = createChannelMessage({
      ...approvedOutboundMessage(),
      idempotency_key: "outbound:web:closed",
      thread: { ...approvedOutboundMessage().thread, state: "closed" },
    });
    expect(renderWebChatOutbound(closedThread).ok).toBe(false);
  });

  it("renders rich-card fallback and disabled actions", () => {
    const result = renderWebChatOutbound(richOutboundMessage());
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.refusal.message);
    expect(result.native_payload.fallback_used).toBe(true);
    expect(result.native_payload.actions).toHaveLength(2);
    expect(
      result.native_payload.accessibility.accessible_names[
        result.native_payload.actions[0]!.action_id
      ],
    ).toBe("Review");
  });
});
