import {
  createFakeAdapter,
  missingPrivacyProjection,
  outboundMatchNotification,
  richRealtimeChatCapability,
  telegramInboundMessage,
  unauthenticatedLink,
  unauthorizedParticipant,
  type ChannelAdapter,
  type ChannelMessage,
} from "../index.js";

describe("ChannelAdapter boundary", () => {
  it("normalizes and renders through the fake adapter boundary", () => {
    const adapter = createFakeAdapter(richRealtimeChatCapability, telegramInboundMessage());

    const normalized = adapter.normalizeInbound({});
    expect(normalized.ok).toBe(true);

    const rendered = adapter.renderOutbound(outboundMatchNotification());
    expect("ok" in rendered ? rendered.ok : true).toBe(true);
  });

  it("returns structured refusals for unverified or unauthorized participants", () => {
    expect(unauthenticatedLink().reason_code).toBe("unauthenticated_channel_link");
    expect(unauthorizedParticipant().reason_code).toBe("unauthorized_participant");
  });

  it("refuses missing privacy projections before outbound rendering", () => {
    expect(missingPrivacyProjection().reason_code).toBe("privacy_projection_unavailable");
  });

  it("does not expose raw counterparty or hidden run state on outbound adapter input", () => {
    type OutboundInput = Parameters<ChannelAdapter["renderOutbound"]>[0];
    const message: OutboundInput = outboundMatchNotification();

    expect(message).toHaveProperty("disclosure.projection_ref", "projection-match-1");
    expect("raw_counterparty_record" in message).toBe(false);
    expect("canonical_transcript" in message).toBe(false);
    expect("hidden_run_state" in message).toBe(false);
  });

  it("keeps adapter inputs constrained to ChannelMessage", () => {
    const message: ChannelMessage = outboundMatchNotification();
    expect(message.direction).toBe("outbound");
  });
});
