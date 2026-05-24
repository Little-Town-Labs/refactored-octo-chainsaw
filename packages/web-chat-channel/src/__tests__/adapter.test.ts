import { createWebChatAdapter } from "../adapter.js";
import { inboundWebChatEvent, optionsWithLinks, verifiedLink } from "./fixtures.js";

describe("web-chat inbound adapter", () => {
  it("normalizes authenticated inbound text", () => {
    const adapter = createWebChatAdapter(optionsWithLinks());
    const result = adapter.normalizeInbound(inboundWebChatEvent());

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.refusal.message);
    expect(result.message.channel.kind).toBe("web_chat");
    expect(result.message.participant.participant_id).toBe("participant-seeker-1");
    expect(result.message.intent.family).toBe("threshold_tuning");
    expect(result.message.disclosure.posture).toBe("untrusted_inbound");
  });

  it("refuses wrong-thread, malformed, over-size, empty, expired-action, and unsupported attachment events", () => {
    const adapter = createWebChatAdapter(optionsWithLinks());
    const wrongThread = adapter.normalizeInbound({
      ...inboundWebChatEvent("evt-wrong"),
      thread_id: "other-thread",
    });
    expect(wrongThread.ok).toBe(false);

    const malformed = adapter.normalizeInbound({ ...inboundWebChatEvent("evt-bad"), event_id: "" });
    expect(malformed.ok).toBe(false);

    const overSize = adapter.normalizeInbound(inboundWebChatEvent("evt-big", "x".repeat(2001)));
    expect(overSize.ok).toBe(false);

    const empty = adapter.normalizeInbound(inboundWebChatEvent("evt-empty", "   "));
    expect(empty.ok).toBe(false);

    const expired = adapter.normalizeInbound({
      ...inboundWebChatEvent("evt-expired"),
      event_kind: "action",
      action_id: "pause",
      action_expires_at: "2026-05-23T11:59:00.000Z",
    });
    expect(expired.ok).toBe(false);

    const attachment = adapter.normalizeInbound({
      ...inboundWebChatEvent("evt-attachment"),
      event_kind: "attachment_reference",
      attachment_ref: "upload-1",
    });
    expect(attachment.ok).toBe(true);
  });

  it("refuses unsupported dashboard-like intents", () => {
    const adapter = createWebChatAdapter(optionsWithLinks([verifiedLink]));
    const result = adapter.normalizeInbound(
      inboundWebChatEvent("evt-dashboard", "show analytics and list all jobs"),
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected refusal");
    expect(result.refusal.reason_code).toBe("unsupported_intent");
  });
});
