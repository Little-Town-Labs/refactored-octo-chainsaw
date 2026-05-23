import type { ChannelKind, ContentPartKind } from "./message.js";

export const ACKNOWLEDGEMENT_MODES = ["sync", "async", "none"] as const;
export type AcknowledgementMode = (typeof ACKNOWLEDGEMENT_MODES)[number];

export const RETRY_MODES = ["provider_retry", "platform_retry", "manual_review"] as const;
export type RetryMode = (typeof RETRY_MODES)[number];

export interface ChannelAdapterCapability {
  readonly adapter_name: string;
  readonly adapter_version: string;
  readonly channel_kind: ChannelKind;
  readonly content_parts: readonly ContentPartKind[];
  readonly max_text_chars: number;
  readonly supports_rich_cards: boolean;
  readonly supports_attachments: boolean;
  readonly supports_threads: boolean;
  readonly acknowledgement_mode: AcknowledgementMode;
  readonly retry_mode: RetryMode;
  readonly notes?: string;
}

export const validateCapability = (
  capability: ChannelAdapterCapability,
): ChannelAdapterCapability => {
  if (capability.adapter_name.trim().length === 0) {
    throw new Error("Channel adapter capability requires adapter_name");
  }
  if (capability.adapter_version.trim().length === 0) {
    throw new Error("Channel adapter capability requires adapter_version");
  }
  if (capability.content_parts.length === 0) {
    throw new Error("Channel adapter capability must support at least one content part");
  }
  if (capability.max_text_chars < 1) {
    throw new Error("Channel adapter capability max_text_chars must be positive");
  }
  return capability;
};

export const richRealtimeChatCapability: ChannelAdapterCapability = validateCapability({
  adapter_name: "rich-realtime-chat",
  adapter_version: "1.0.0",
  channel_kind: "telegram",
  content_parts: ["text", "command", "rich_card", "system_notice"],
  max_text_chars: 4096,
  supports_rich_cards: true,
  supports_attachments: false,
  supports_threads: true,
  acknowledgement_mode: "sync",
  retry_mode: "platform_retry",
});

export const asyncThreadedEmailCapability: ChannelAdapterCapability = validateCapability({
  adapter_name: "async-threaded-email",
  adapter_version: "1.0.0",
  channel_kind: "email",
  content_parts: ["text", "attachment_ref", "system_notice"],
  max_text_chars: 20000,
  supports_rich_cards: false,
  supports_attachments: true,
  supports_threads: true,
  acknowledgement_mode: "async",
  retry_mode: "provider_retry",
});

export const plainTextFallbackCapability: ChannelAdapterCapability = validateCapability({
  adapter_name: "plain-text-fallback",
  adapter_version: "1.0.0",
  channel_kind: "web_chat",
  content_parts: ["text", "command", "system_notice"],
  max_text_chars: 2000,
  supports_rich_cards: false,
  supports_attachments: false,
  supports_threads: false,
  acknowledgement_mode: "sync",
  retry_mode: "manual_review",
});

export const BUILT_IN_CAPABILITIES = [
  richRealtimeChatCapability,
  asyncThreadedEmailCapability,
  plainTextFallbackCapability,
] as const;
