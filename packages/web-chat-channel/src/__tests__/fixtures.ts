import {
  createChannelMessage,
  richCardPart,
  textPart,
  type ChannelMessage,
} from "@spyglass/channels-core";

import {
  createStaticWebChatLinkLookup,
  InMemoryWebChatDuplicateStore,
  type WebChatAdapterOptions,
  type WebChatChannelLink,
  type WebChatClientEvent,
  type WebChatThread,
} from "../index.js";

export const fixedNow = new Date("2026-05-23T12:00:00.000Z");
export const future = new Date("2026-05-23T13:00:00.000Z");
export const past = new Date("2026-05-23T11:00:00.000Z");

export const verifiedLink: WebChatChannelLink = {
  link_id: "link-web-1",
  participant_id: "participant-seeker-1",
  principal_id: "principal-seeker-1",
  channel_account_id: "clerk:user_1",
  status: "verified",
  allowed_thread_ids: ["thread-web-1"],
};

export const pendingLink: WebChatChannelLink = {
  link_id: "link-web-pending-1",
  principal_id: "principal-pending",
  channel_account_id: "clerk:user_pending",
  status: "pending_verification",
  pending_challenge_id: "challenge-web-1",
  allowed_thread_ids: ["thread-web-pending"],
};

export const disabledLink: WebChatChannelLink = {
  ...verifiedLink,
  link_id: "link-web-disabled",
  principal_id: "principal-disabled",
  status: "disabled",
};

export const pausedLink: WebChatChannelLink = {
  ...verifiedLink,
  link_id: "link-web-paused",
  principal_id: "principal-paused",
  status: "paused",
};

export const withdrawnLink: WebChatChannelLink = {
  ...verifiedLink,
  link_id: "link-web-withdrawn",
  principal_id: "principal-withdrawn",
  status: "withdrawn",
};

export const verifiedThread: WebChatThread = {
  thread_id: "thread-web-1",
  native_thread_ref: "web-chat:thread-web-1",
  state: "open",
};

export const optionsWithLinks = (
  links: readonly WebChatChannelLink[] = [verifiedLink],
  threads: readonly WebChatThread[] = [verifiedThread],
): WebChatAdapterOptions => ({
  link_lookup: createStaticWebChatLinkLookup(links, threads),
  duplicate_store: new InMemoryWebChatDuplicateStore(),
  now: () => fixedNow,
});

export const inboundWebChatEvent = (
  eventId = "evt-web-1",
  text = "I want to tune my threshold",
): WebChatClientEvent => ({
  event_id: eventId,
  event_kind: "text",
  thread_id: "thread-web-1",
  session: {
    session_id: "sess-1",
    principal_id: "principal-seeker-1",
    expires_at: future,
    assurance: "clerk",
  },
  text,
  received_at: fixedNow,
  occurred_at: fixedNow,
  client_context: {
    locale: "en-US",
    route: "/",
    referrer: "https://spyglass.local/",
    user_agent_hint: "fixture",
  },
});

export const pendingWebChatEvent = (): WebChatClientEvent => ({
  ...inboundWebChatEvent("evt-web-verify", "verify 123456"),
  event_kind: "verification",
  thread_id: "thread-web-pending",
  session: {
    session_id: "sess-pending",
    principal_id: "principal-pending",
    expires_at: future,
  },
});

export const approvedOutboundMessage = (): ChannelMessage =>
  createChannelMessage({
    direction: "outbound",
    channel: { kind: "web_chat", version: "1.0.0", enabled: true },
    participant: {
      participant_id: "participant-seeker-1",
      principal_id: "principal-seeker-1",
      channel_account_id: "clerk:user_1",
      link_status: "verified",
      role: "seeker",
    },
    thread: {
      thread_id: "thread-web-1",
      native_thread_ref: "web-chat:thread-web-1",
      state: "open",
    },
    idempotency_key: "outbound:web:1",
    occurred_at: fixedNow,
    content: [textPart("A match reached your review threshold.", false)],
    intent: { family: "match_notification_ack", supported: true },
    disclosure: {
      posture: "approved_projection",
      projection_ref: "projection-1",
      privacy_ruleset_ref: "ruleset-1",
    },
    audit: { correlation_id: "corr-web-outbound-1", source: "projection-ready" },
  });

export const richOutboundMessage = (): ChannelMessage =>
  createChannelMessage({
    ...approvedOutboundMessage(),
    idempotency_key: "outbound:web:rich",
    content: [
      richCardPart({
        title: "Match cleared",
        body: "A match reached your review threshold.",
        actions: ["Review", "Pause"],
      }),
    ],
  });

export const systemOutboundMessage = (): ChannelMessage =>
  createChannelMessage({
    ...approvedOutboundMessage(),
    idempotency_key: "outbound:web:system",
    disclosure: { posture: "system_notice" },
    content: [
      { kind: "system_notice", text: "Verification complete.", classification: "system_generated" },
    ],
  });
