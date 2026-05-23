import { validateCapability, type ChannelAdapterCapability } from "@spyglass/channels-core";

export const TELEGRAM_MAX_TEXT_CHARS = 4096;

export const telegramChannelCapability: ChannelAdapterCapability = validateCapability({
  adapter_name: "telegram-channel",
  adapter_version: "1.0.0",
  channel_kind: "telegram",
  content_parts: ["text", "command", "attachment_ref", "rich_card", "system_notice"],
  max_text_chars: TELEGRAM_MAX_TEXT_CHARS,
  supports_rich_cards: true,
  supports_attachments: true,
  supports_threads: true,
  acknowledgement_mode: "sync",
  retry_mode: "platform_retry",
  notes:
    "F17 adapter supports Telegram text, command-like text, bounded attachment references, and rich-card fallback rendering.",
});
