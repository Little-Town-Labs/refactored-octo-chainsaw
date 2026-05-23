import {
  createChannelMessage,
  richCardPart,
  textPart,
  type ChannelMessage,
} from "@spyglass/channels-core";

import {
  createStaticTelegramLinkLookup,
  InMemoryTelegramDuplicateStore,
  type TelegramAdapterOptions,
  type TelegramChannelLink,
  type TelegramNativeUpdate,
} from "../index.js";

export const fixedNow = new Date("2026-05-23T12:00:00.000Z");

export const verifiedLink: TelegramChannelLink = {
  link_id: "link-telegram-1",
  participant_id: "participant-seeker-1",
  principal_id: "principal-seeker-1",
  telegram_account_id: "telegram-user:42",
  telegram_chat_id: "telegram-chat:4242",
  status: "verified",
  thread_id: "thread-telegram-1",
};

export const pendingLink: TelegramChannelLink = {
  link_id: "link-pending-1",
  telegram_account_id: "telegram-user:43",
  telegram_chat_id: "telegram-chat:4343",
  status: "pending_verification",
  pending_challenge_id: "challenge-1",
  thread_id: "thread-pending-1",
};

export const disabledLink: TelegramChannelLink = {
  link_id: "link-disabled-1",
  telegram_account_id: "telegram-user:44",
  telegram_chat_id: "telegram-chat:4444",
  status: "disabled",
  participant_id: "participant-disabled",
  principal_id: "principal-disabled",
  thread_id: "thread-disabled-1",
};

export const optionsWithLinks = (...links: TelegramChannelLink[]): TelegramAdapterOptions => ({
  link_lookup: createStaticTelegramLinkLookup(links),
  duplicate_store: new InMemoryTelegramDuplicateStore(),
  now: () => fixedNow,
});

export const telegramMessageUpdate = (
  updateId: number,
  userId = 42,
  chatId = 4242,
  text = "I want to tune my threshold",
): TelegramNativeUpdate => ({
  update_id: updateId,
  message: {
    message_id: updateId + 10,
    date: 1779537600,
    text,
    from: { id: userId, username: `user${userId}` },
    chat: { id: chatId, type: "private" },
  },
});

export const callbackUpdate = (
  updateId: number,
  userId = 42,
  chatId = 4242,
  data = "review",
): TelegramNativeUpdate => ({
  update_id: updateId,
  callback_query: {
    id: `callback-${updateId}`,
    data,
    from: { id: userId },
    message: {
      message_id: updateId + 20,
      date: 1779537600,
      chat: { id: chatId, type: "private" },
    },
  },
});

export const approvedOutboundMessage = (): ChannelMessage =>
  createChannelMessage({
    direction: "outbound",
    channel: { kind: "telegram", version: "1.0.0", enabled: true },
    participant: {
      participant_id: "participant-seeker-1",
      principal_id: "principal-seeker-1",
      channel_account_id: "telegram-user:42",
      link_status: "verified",
      role: "seeker",
    },
    thread: {
      thread_id: "thread-telegram-1",
      native_thread_ref: "telegram-chat:4242",
      state: "open",
    },
    idempotency_key: "outbound:telegram:1",
    occurred_at: fixedNow,
    content: [textPart("A match reached your review threshold.", false)],
    intent: { family: "match_notification_ack", supported: true },
    disclosure: {
      posture: "approved_projection",
      projection_ref: "projection-1",
      privacy_ruleset_ref: "ruleset-1",
    },
    audit: { correlation_id: "corr-outbound-1", source: "projection-ready" },
  });

export const richOutboundMessage = (): ChannelMessage =>
  createChannelMessage({
    ...approvedOutboundMessage(),
    idempotency_key: "outbound:telegram:rich",
    content: [
      richCardPart({
        title: "Match cleared",
        body: "A match reached your review threshold.",
        actions: ["review", "pause"],
      }),
    ],
  });

export const systemOutboundMessage = (): ChannelMessage =>
  createChannelMessage({
    ...approvedOutboundMessage(),
    idempotency_key: "outbound:telegram:system",
    disclosure: { posture: "system_notice" },
    content: [
      { kind: "system_notice", text: "Verification complete.", classification: "system_generated" },
    ],
  });
