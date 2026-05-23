import {
  degradeRichCardToText,
  missingPrivacyProjection,
  refusal,
  unsupportedIntent,
  type ChannelMessage,
  type ChannelRefusal,
} from "@spyglass/channels-core";

import { TELEGRAM_MAX_TEXT_CHARS } from "./capabilities.js";
import type { TelegramOutboundPayload, TelegramRenderResult } from "./types.js";

export const renderTelegramOutbound = (
  message: ChannelMessage,
  maxTextChars = TELEGRAM_MAX_TEXT_CHARS,
): TelegramRenderResult => {
  const refusalResult = outboundRefusal(message, maxTextChars);
  if (refusalResult) {
    return { ok: false, refusal: refusalResult };
  }

  const rendered = renderText(message);
  if (!rendered) {
    return { ok: false, refusal: unsupportedIntent() };
  }

  const chatId = message.thread.native_thread_ref ?? message.participant.channel_account_id;
  if (!chatId) {
    return {
      ok: false,
      refusal: refusal(
        "unauthorized_participant",
        "Telegram outbound message is missing target chat",
      ),
    };
  }

  const native_payload: TelegramOutboundPayload = {
    chat_id: chatId.replace(/^telegram-chat:/, ""),
    text: rendered.text,
    source_message_id: message.message_id,
    parse_mode: "plain",
    correlation_id: message.audit.correlation_id,
    ...(rendered.fallback_used ? { fallback_used: true } : {}),
  };

  return { ok: true, native_payload, message };
};

const outboundRefusal = (
  message: ChannelMessage,
  maxTextChars: number,
): ChannelRefusal | undefined => {
  if (message.direction !== "outbound" || message.channel.kind !== "telegram") {
    return unsupportedIntent();
  }
  if (message.participant.link_status !== "verified") {
    return refusal("unauthorized_participant", "Telegram participant is not verified");
  }
  if (
    message.disclosure.posture !== "approved_projection" &&
    message.disclosure.posture !== "system_notice"
  ) {
    return missingPrivacyProjection();
  }
  const rendered = renderText(message);
  if (!rendered) {
    return unsupportedIntent();
  }
  if (rendered.text.length > maxTextChars) {
    return refusal("over_size_payload", "Telegram outbound payload exceeds max text length");
  }
  return undefined;
};

const renderText = (
  message: ChannelMessage,
): { readonly text: string; readonly fallback_used?: boolean } | undefined => {
  const parts = message.content.flatMap((part) => {
    if (part.kind === "text" || part.kind === "system_notice") {
      return part.text ? [part.text] : [];
    }
    if (part.kind === "rich_card" && part.rich_card) {
      return [degradeRichCardToText(part.rich_card).text ?? ""];
    }
    return [];
  });
  if (parts.length === 0) {
    return undefined;
  }
  return {
    text: parts.join("\n\n"),
    fallback_used: message.content.some((part) => part.kind === "rich_card"),
  };
};
