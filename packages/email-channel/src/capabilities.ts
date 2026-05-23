import { validateCapability, type ChannelAdapterCapability } from "@spyglass/channels-core";

export const EMAIL_MAX_SUBJECT_CHARS = 160;
export const EMAIL_MAX_BODY_CHARS = 20000;
export const EMAIL_MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export const emailChannelCapability: ChannelAdapterCapability = validateCapability({
  adapter_name: "email-channel",
  adapter_version: "1.0.0",
  channel_kind: "email",
  content_parts: ["text", "command", "attachment_ref", "rich_card", "system_notice"],
  max_text_chars: EMAIL_MAX_BODY_CHARS,
  supports_rich_cards: false,
  supports_attachments: true,
  supports_threads: true,
  acknowledgement_mode: "async",
  retry_mode: "provider_retry",
  notes:
    "F18 adapter supports provider-parsed inbound email, Spyglass reply-alias threading, text-first outbound rendering, bounded attachment references, and rich-card fallback text.",
});
