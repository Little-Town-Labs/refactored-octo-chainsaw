import { validateCapability } from "@spyglass/channels-core";

export const WEB_CHAT_ADAPTER_VERSION = "1.0.0";
export const WEB_CHAT_MAX_TEXT_CHARS = 2000;
export const WEB_CHAT_MAX_ACTIONS = 5;

export const webChatChannelCapability = validateCapability({
  adapter_name: "web-chat-channel",
  adapter_version: WEB_CHAT_ADAPTER_VERSION,
  channel_kind: "web_chat",
  content_parts: ["text", "command", "rich_card", "system_notice"],
  max_text_chars: WEB_CHAT_MAX_TEXT_CHARS,
  supports_rich_cards: true,
  supports_attachments: false,
  supports_threads: true,
  acknowledgement_mode: "sync",
  retry_mode: "platform_retry",
  notes: "Clerk-authenticated first-touch web chat with WCAG 2.2 AA-facing render contract",
});

export const webChatCapabilityMetadata = {
  pending_link_posture: "verification_or_resume_only",
  unauthenticated_prompt_posture: "sign_in_or_resume_prompt_only",
  acknowledgement_behavior: "sync",
  accessibility_contract: [
    "accessible_names",
    "keyboard_activation",
    "focus_order",
    "disabled_control_reason",
    "status_announcement",
    "reduced_motion_safe",
  ],
  delivery_statuses: [
    "rendered",
    "displayed",
    "acknowledged",
    "retryable_failure",
    "terminal_failure",
    "expired",
    "cancelled",
    "refused",
    "unsupported",
    "duplicate",
  ],
} as const;
