import { createChannelMessage } from "@spyglass/channels-core";

import { renderEmailOutbound } from "../render.js";
import { approvedOutboundMessage, richOutboundMessage, systemOutboundMessage } from "./fixtures.js";

describe("email outbound rendering", () => {
  it("renders approved outbound messages as text-first email payloads", () => {
    const result = renderEmailOutbound(approvedOutboundMessage());

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.refusal.message);
    expect(result.native_payload.to).toBe("seeker@example.com");
    expect(result.native_payload.subject).toBe("Spyglass match update");
    expect(result.native_payload.headers?.in_reply_to).toBe("<m-root@example.com>");
  });

  it("renders system notices", () => {
    const result = renderEmailOutbound(systemOutboundMessage());
    expect(result.ok).toBe(true);
  });

  it("refuses missing approved projection posture", () => {
    const message = createChannelMessage({
      ...approvedOutboundMessage(),
      idempotency_key: "outbound:email:missing-projection",
      disclosure: { posture: "refused" },
    });
    const result = renderEmailOutbound(message);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected refusal");
    expect(result.refusal.reason_code).toBe("privacy_projection_unavailable");
  });

  it("refuses unsendable participants and closed threads", () => {
    const participant = renderEmailOutbound(
      createChannelMessage({
        ...approvedOutboundMessage(),
        idempotency_key: "outbound:email:pending",
        participant: { ...approvedOutboundMessage().participant, link_status: "disabled" },
      }),
    );
    const thread = renderEmailOutbound(
      createChannelMessage({
        ...approvedOutboundMessage(),
        idempotency_key: "outbound:email:closed",
        thread: { ...approvedOutboundMessage().thread, state: "closed" },
      }),
    );

    expect(participant.ok).toBe(false);
    expect(thread.ok).toBe(false);
  });

  it("degrades approved rich content to fallback text", () => {
    const result = renderEmailOutbound(richOutboundMessage());

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.refusal.message);
    expect(result.native_payload.fallback_used).toBe(true);
    expect(result.native_payload.text).toContain("Match cleared");
  });
});
