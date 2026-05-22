import {
  asyncThreadedEmailCapability,
  createFakeAdapter,
  degradeRichCardToText,
  outboundMatchNotification,
  plainTextFallbackCapability,
  richRealtimeChatCapability,
  runAdapterConformance,
  telegramInboundMessage,
  validateCapability,
} from "../index.js";

describe("adapter conformance", () => {
  it("validates rich realtime, async email, and plain-text fallback capabilities", () => {
    expect(validateCapability(richRealtimeChatCapability).supports_rich_cards).toBe(true);
    expect(validateCapability(asyncThreadedEmailCapability).supports_threads).toBe(true);
    expect(validateCapability(plainTextFallbackCapability).supports_rich_cards).toBe(false);
  });

  it("runs fake adapter conformance checks", () => {
    const adapter = createFakeAdapter(richRealtimeChatCapability, telegramInboundMessage());
    const result = runAdapterConformance(adapter, {}, outboundMatchNotification());

    expect(result.passed).toBe(true);
    expect(result.checks).toEqual([
      "capability",
      "normalizeInbound",
      "renderOutbound",
      "acknowledgeInbound",
      "reportDelivery",
    ]);
  });

  it("degrades rich cards to plain text for minimal channels", () => {
    const card = outboundMatchNotification().content[0]?.rich_card;

    expect(card).toBeDefined();
    expect(degradeRichCardToText(card!).kind).toBe("text");
    expect(degradeRichCardToText(card!).classification).toBe("approved_projection");
  });
});
