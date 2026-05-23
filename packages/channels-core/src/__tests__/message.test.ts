import {
  createChannelMessage,
  emailInboundMessage,
  outboundMatchNotification,
  telegramInboundMessage,
  textPart,
  webChatInboundMessage,
} from "../index.js";

describe("ChannelMessage", () => {
  it("builds canonical inbound fixtures for Telegram, email, and web chat", () => {
    const messages = [telegramInboundMessage(), emailInboundMessage(), webChatInboundMessage()];

    expect(messages.map((message) => message.channel.kind)).toEqual([
      "telegram",
      "email",
      "web_chat",
    ]);
    expect(messages.every((message) => message.direction === "inbound")).toBe(true);
    expect(messages.every((message) => message.idempotency_key.length > 0)).toBe(true);
    expect(messages.every((message) => message.participant.link_status === "verified")).toBe(true);
  });

  it("classifies inbound text as untrusted and outbound content as approved projection", () => {
    expect(telegramInboundMessage().content[0]?.classification).toBe("untrusted_user_input");
    expect(outboundMatchNotification().content[0]?.classification).toBe("approved_projection");
    expect(outboundMatchNotification().disclosure.posture).toBe("approved_projection");
  });

  it("rejects outbound approved projections without a projection reference", () => {
    expect(() =>
      createChannelMessage({
        ...outboundMatchNotification(),
        message_id: undefined,
        disclosure: { posture: "approved_projection" },
      }),
    ).toThrow("projection_ref");
  });

  it("requires content parts for the schema shape", () => {
    expect(() =>
      createChannelMessage({
        ...telegramInboundMessage(),
        message_id: undefined,
        content: [],
      }),
    ).toThrow("content");
  });

  it("keeps provider metadata outside semantic content", () => {
    const message = createChannelMessage({
      ...telegramInboundMessage(),
      message_id: undefined,
      content: [textPart("hello")],
      metadata: { native_update_id: 100, ignored_provider_field: "kept-as-metadata" },
    });

    expect(message.metadata).toEqual({
      native_update_id: 100,
      ignored_provider_field: "kept-as-metadata",
    });
    expect(message.content).toHaveLength(1);
  });
});
