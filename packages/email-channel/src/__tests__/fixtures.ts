import {
  createChannelMessage,
  richCardPart,
  textPart,
  type ChannelMessage,
} from "@spyglass/channels-core";

import {
  createStaticEmailLinkLookup,
  InMemoryEmailDuplicateStore,
  type EmailAdapterOptions,
  type EmailChannelLink,
  type EmailProviderEvent,
  type EmailThread,
} from "../index.js";

export const fixedNow = new Date("2026-05-23T12:00:00.000Z");

export const verifiedLink: EmailChannelLink = {
  link_id: "link-email-1",
  participant_id: "participant-seeker-1",
  principal_id: "principal-seeker-1",
  email_address: "seeker@example.com",
  status: "verified",
  allowed_thread_ids: ["thread-email-spyglass-reply-abc-m-root-example-com"],
};

export const pendingLink: EmailChannelLink = {
  link_id: "link-email-pending-1",
  email_address: "pending@example.com",
  status: "pending_verification",
  pending_challenge_id: "challenge-email-1",
  allowed_thread_ids: ["thread-email-verify-abc-m-verify-root-example-com"],
};

export const disabledLink: EmailChannelLink = {
  link_id: "link-email-disabled-1",
  participant_id: "participant-disabled",
  principal_id: "principal-disabled",
  email_address: "disabled@example.com",
  status: "disabled",
};

export const unsubscribedLink: EmailChannelLink = {
  link_id: "link-email-unsub-1",
  participant_id: "participant-unsub",
  principal_id: "principal-unsub",
  email_address: "unsub@example.com",
  status: "unsubscribed",
};

export const suppressedLink: EmailChannelLink = {
  link_id: "link-email-suppressed-1",
  participant_id: "participant-suppressed",
  principal_id: "principal-suppressed",
  email_address: "suppressed@example.com",
  status: "suppressed",
};

export const verifiedThread: EmailThread = {
  thread_id: "thread-email-spyglass-reply-abc-m-root-example-com",
  reply_alias: "spyglass+reply-abc@example.spyglass.test",
  native_thread_ref: "<m-root@example.com>",
  state: "open",
};

export const optionsWithLinks = (
  links: readonly EmailChannelLink[] = [verifiedLink],
  threads: readonly EmailThread[] = [verifiedThread],
): EmailAdapterOptions => ({
  link_lookup: createStaticEmailLinkLookup(links, threads),
  duplicate_store: new InMemoryEmailDuplicateStore(),
  now: () => fixedNow,
});

export const inboundEmailEvent = (
  providerEventId = "evt-1",
  from = "seeker@example.com",
  text = "I want to tune my threshold",
): EmailProviderEvent => ({
  provider: "resend",
  event_kind: "inbound_message",
  provider_event_id: providerEventId,
  message_id: "<m-1@example.com>",
  from: { email: from, name: "Seeker" },
  to: [{ email: "spyglass+reply-abc@example.spyglass.test" }],
  subject: "Re: Spyglass match",
  text_body: text,
  reference_headers: {
    message_id: "<m-1@example.com>",
    in_reply_to: "<m-root@example.com>",
    references: ["<m-root@example.com>"],
  },
  received_at: fixedNow,
  occurred_at: fixedNow,
});

export const pendingEmailEvent = (): EmailProviderEvent => ({
  ...inboundEmailEvent("evt-verify", "pending@example.com", "verify 123456"),
  message_id: "<m-verify@example.com>",
  to: [{ email: "verify+abc@example.spyglass.test" }],
  reference_headers: {
    message_id: "<m-verify@example.com>",
    in_reply_to: "<m-verify-root@example.com>",
    references: ["<m-verify-root@example.com>"],
  },
});

export const deliveryEmailEvent = (kind: EmailProviderEvent["event_kind"]): EmailProviderEvent => ({
  provider: "resend",
  event_kind: kind,
  provider_event_id: `evt-${kind}`,
  message_id: `<m-${kind}@example.com>`,
  native_ref: `resend:${kind}:1`,
  received_at: fixedNow,
  occurred_at: fixedNow,
});

export const approvedOutboundMessage = (): ChannelMessage =>
  createChannelMessage({
    direction: "outbound",
    channel: { kind: "email", version: "1.0.0", enabled: true },
    participant: {
      participant_id: "participant-seeker-1",
      principal_id: "principal-seeker-1",
      channel_account_id: "email:seeker@example.com",
      link_status: "verified",
      role: "seeker",
    },
    thread: {
      thread_id: "thread-email-spyglass-reply-abc-m-root-example-com",
      native_thread_ref: "<m-root@example.com>",
      state: "open",
    },
    idempotency_key: "outbound:email:1",
    occurred_at: fixedNow,
    content: [textPart("A match reached your review threshold.", false)],
    intent: { family: "match_notification_ack", supported: true },
    disclosure: {
      posture: "approved_projection",
      projection_ref: "projection-1",
      privacy_ruleset_ref: "ruleset-1",
    },
    audit: { correlation_id: "corr-email-outbound-1", source: "projection-ready" },
  });

export const richOutboundMessage = (): ChannelMessage =>
  createChannelMessage({
    ...approvedOutboundMessage(),
    idempotency_key: "outbound:email:rich",
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
    idempotency_key: "outbound:email:system",
    disclosure: { posture: "system_notice" },
    content: [
      { kind: "system_notice", text: "Verification complete.", classification: "system_generated" },
    ],
  });
