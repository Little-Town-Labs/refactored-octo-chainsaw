import { richCardPart, textPart } from "./content.js";
import { createChannelMessage, type ChannelMessage } from "./message.js";

const fixedDate = new Date("2026-05-22T12:00:00.000Z");

export const telegramInboundMessage = (): ChannelMessage =>
  createChannelMessage({
    direction: "inbound",
    channel: { kind: "telegram", version: "1.0.0", enabled: true },
    participant: {
      participant_id: "participant-seeker-1",
      principal_id: "principal-seeker-1",
      channel_account_id: "telegram-42",
      link_status: "verified",
      role: "seeker",
    },
    thread: { thread_id: "thread-telegram-1", native_thread_ref: "chat-42", state: "open" },
    idempotency_key: "telegram:update:100",
    occurred_at: fixedDate,
    received_at: fixedDate,
    content: [textPart("I want to tune my threshold")],
    intent: { family: "threshold_tuning", supported: true, confidence: 0.95 },
    disclosure: { posture: "untrusted_inbound" },
    audit: { correlation_id: "corr-f16-telegram", source: "telegram-webhook" },
  });

export const emailInboundMessage = (): ChannelMessage =>
  createChannelMessage({
    direction: "inbound",
    channel: { kind: "email", version: "1.0.0", enabled: true },
    participant: {
      participant_id: "participant-seeker-1",
      principal_id: "principal-seeker-1",
      channel_account_id: "seeker@example.test",
      link_status: "verified",
      role: "seeker",
    },
    thread: { thread_id: "thread-email-1", native_thread_ref: "message-thread", state: "open" },
    idempotency_key: "email:message:abc",
    occurred_at: fixedDate,
    received_at: fixedDate,
    content: [textPart("Please pause my search")],
    intent: { family: "pause", supported: true, confidence: 0.9 },
    disclosure: { posture: "untrusted_inbound" },
    audit: { correlation_id: "corr-f16-email", source: "email-inbound" },
  });

export const webChatInboundMessage = (): ChannelMessage =>
  createChannelMessage({
    direction: "inbound",
    channel: { kind: "web_chat", version: "1.0.0", enabled: true },
    participant: {
      participant_id: "participant-seeker-1",
      principal_id: "principal-seeker-1",
      channel_account_id: "clerk-user-1",
      link_status: "verified",
      role: "seeker",
    },
    thread: { thread_id: "thread-web-1", state: "open" },
    idempotency_key: "webchat:event:xyz",
    occurred_at: fixedDate,
    received_at: fixedDate,
    content: [textPart("Start onboarding")],
    intent: { family: "onboarding", supported: true, confidence: 0.95 },
    disclosure: { posture: "untrusted_inbound" },
    audit: { correlation_id: "corr-f16-web", source: "web-chat" },
  });

export const outboundMatchNotification = (): ChannelMessage =>
  createChannelMessage({
    direction: "outbound",
    channel: { kind: "telegram", version: "1.0.0", enabled: true },
    participant: {
      participant_id: "participant-seeker-1",
      principal_id: "principal-seeker-1",
      channel_account_id: "telegram-42",
      link_status: "verified",
      role: "seeker",
    },
    thread: { thread_id: "thread-telegram-1", native_thread_ref: "chat-42", state: "open" },
    idempotency_key: "outbound:match:1",
    occurred_at: fixedDate,
    content: [
      richCardPart({
        title: "Match cleared",
        body: "A match reached your review threshold.",
        actions: ["review", "pause"],
      }),
    ],
    intent: { family: "match_notification_ack", supported: true },
    disclosure: {
      posture: "approved_projection",
      projection_ref: "projection-match-1",
      privacy_ruleset_ref: "privacy-ruleset-1",
    },
    audit: { correlation_id: "corr-f16-outbound", source: "dossier-projection" },
  });

export const unsupportedDashboardMessage = (): ChannelMessage =>
  createChannelMessage({
    direction: "inbound",
    channel: { kind: "telegram", version: "1.0.0", enabled: true },
    participant: {
      participant_id: "participant-seeker-1",
      principal_id: "principal-seeker-1",
      channel_account_id: "telegram-42",
      link_status: "verified",
      role: "seeker",
    },
    thread: { thread_id: "thread-telegram-1", native_thread_ref: "chat-42", state: "open" },
    idempotency_key: "telegram:update:unsupported",
    occurred_at: fixedDate,
    received_at: fixedDate,
    content: [textPart("Show all jobs and all match tickets")],
    intent: { family: "browse_all_jobs", supported: false, confidence: 0.9 },
    disclosure: { posture: "untrusted_inbound" },
    audit: { correlation_id: "corr-f16-unsupported", source: "telegram-webhook" },
  });
