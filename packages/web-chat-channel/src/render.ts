import {
  degradeRichCardToText,
  missingPrivacyProjection,
  refusal,
  unsupportedIntent,
  type ChannelMessage,
  type ChannelRefusal,
  type ContentPart,
} from "@spyglass/channels-core";

import { buildAccessibilityModel, validateWebChatAccessibility } from "./accessibility.js";
import { WEB_CHAT_MAX_ACTIONS, WEB_CHAT_MAX_TEXT_CHARS } from "./capabilities.js";
import { sanitizeId } from "./idempotency.js";
import type { WebChatActionModel, WebChatRenderModel, WebChatRenderResult } from "./types.js";

export const renderWebChatOutbound = (
  message: ChannelMessage,
  maxTextChars = WEB_CHAT_MAX_TEXT_CHARS,
  maxActions = WEB_CHAT_MAX_ACTIONS,
): WebChatRenderResult => {
  const refusalResult = outboundRefusal(message, maxTextChars);
  if (refusalResult) {
    return { ok: false, refusal: refusalResult };
  }

  const parts = renderParts(message);
  if (parts.length === 0) {
    return { ok: false, refusal: unsupportedIntent() };
  }

  const actions = actionsFor(message, maxActions);
  const native_payload: WebChatRenderModel = {
    render_id: `web-chat-render:${sanitizeId(message.message_id)}`,
    thread_id: message.thread.thread_id,
    source_message_id: message.message_id,
    message_parts: parts,
    actions,
    accessibility: buildAccessibilityModel({
      actions,
      statusAnnouncement: parts.some((part) => part.kind === "error") ? "assertive" : "polite",
    }),
    native_refs: {
      correlation_id: message.audit.correlation_id,
      intent: message.intent.family,
    },
    ...(message.content.some((part) => part.kind === "rich_card") ? { fallback_used: true } : {}),
  };

  const accessibility = validateWebChatAccessibility(native_payload);
  if (!accessibility.ok && accessibility.refusal) {
    return { ok: false, refusal: accessibility.refusal };
  }

  return { ok: true, native_payload, message };
};

const outboundRefusal = (
  message: ChannelMessage,
  maxTextChars: number,
): ChannelRefusal | undefined => {
  if (message.direction !== "outbound" || message.channel.kind !== "web_chat") {
    return unsupportedIntent();
  }
  if (message.participant.link_status !== "verified" || message.thread.state !== "open") {
    return refusal("unauthorized_participant", "Web-chat target is not sendable");
  }
  if (
    message.disclosure.posture !== "approved_projection" &&
    message.disclosure.posture !== "system_notice"
  ) {
    return missingPrivacyProjection();
  }
  const totalText = renderParts(message)
    .map((part) => part.text)
    .join("\n").length;
  if (totalText > maxTextChars) {
    return refusal("over_size_payload", "Web-chat outbound payload exceeds max length");
  }
  return undefined;
};

type WebChatMessagePart = WebChatRenderModel["message_parts"][number];

const renderParts = (message: ChannelMessage): WebChatRenderModel["message_parts"] =>
  message.content.flatMap((part, index) => {
    const disclosure_posture =
      message.disclosure.posture === "system_notice" ? "system_generated" : "approved_projection";
    if ((part.kind === "text" || part.kind === "system_notice") && part.text) {
      const rendered: WebChatMessagePart = {
        part_id: `part-${index}`,
        kind: part.kind === "system_notice" ? "status" : "text",
        text: part.text,
        disclosure_posture,
      };
      return [rendered];
    }
    if (part.kind === "rich_card" && part.rich_card) {
      const degraded = degradeRichCardToText(part.rich_card);
      const rendered: WebChatMessagePart = {
        part_id: `part-${index}`,
        kind: "rich_card_summary",
        text: degraded.text ?? `${part.rich_card.title}\n${part.rich_card.body}`,
        disclosure_posture,
      };
      return [rendered];
    }
    return [];
  });

const actionsFor = (message: ChannelMessage, maxActions: number): readonly WebChatActionModel[] =>
  (message.content as readonly ContentPart[])
    .flatMap((part) => part.rich_card?.actions ?? [])
    .slice(0, maxActions)
    .map((label) => ({
      action_id: `action:${sanitizeId(message.message_id)}:${sanitizeId(label)}`,
      label,
      enabled: message.thread.state === "open",
      activation: "button" as const,
      ...(message.thread.state === "open" ? {} : { disabled_reason: "Thread is not open" }),
    }));
