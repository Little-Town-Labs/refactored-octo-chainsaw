import { createChannelMessage } from "@spyglass/channels-core";

import { renderTelegramOutbound } from "../index.js";
import { approvedOutboundMessage, richOutboundMessage, systemOutboundMessage } from "./fixtures.js";

describe("telegram outbound rendering", () => {
  it("renders approved projection messages", () => {
    const result = renderTelegramOutbound(approvedOutboundMessage());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.native_payload.chat_id).toBe("4242");
      expect(result.native_payload.text).toContain("match reached");
      expect(result.native_payload.source_message_id).toBe(result.message.message_id);
    }
  });

  it("renders system notices", () => {
    const result = renderTelegramOutbound(systemOutboundMessage());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.native_payload.text).toBe("Verification complete.");
    }
  });

  it("refuses missing or unapproved disclosure posture", () => {
    const unapproved = createChannelMessage({
      ...approvedOutboundMessage(),
      idempotency_key: "outbound:unapproved",
      disclosure: { posture: "refused" },
    });

    const result = renderTelegramOutbound(unapproved);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.refusal.reason_code).toBe("privacy_projection_unavailable");
    }
  });

  it("degrades rich cards to approved fallback text", () => {
    const result = renderTelegramOutbound(richOutboundMessage());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.native_payload.fallback_used).toBe(true);
      expect(result.native_payload.text).toContain("Match cleared");
    }
  });
});
