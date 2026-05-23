import {
  degradeRichCardToText,
  missingPrivacyProjection,
  refusal,
  unsupportedIntent,
  type ChannelMessage,
  type ChannelRefusal,
} from "@spyglass/channels-core";

import { EMAIL_MAX_BODY_CHARS, EMAIL_MAX_SUBJECT_CHARS } from "./capabilities.js";
import { sanitizeId } from "./threading.js";
import type { EmailOutboundPayload, EmailRenderResult } from "./types.js";

export const renderEmailOutbound = (
  message: ChannelMessage,
  maxBodyChars = EMAIL_MAX_BODY_CHARS,
  maxSubjectChars = EMAIL_MAX_SUBJECT_CHARS,
): EmailRenderResult => {
  const refusalResult = outboundRefusal(message, maxBodyChars, maxSubjectChars);
  if (refusalResult) {
    return { ok: false, refusal: refusalResult };
  }

  const rendered = renderText(message);
  if (!rendered) {
    return { ok: false, refusal: unsupportedIntent() };
  }

  const target = targetEmail(message);
  if (!target) {
    return {
      ok: false,
      refusal: refusal("unauthorized_participant", "Email outbound message is missing target"),
    };
  }

  const native_payload: EmailOutboundPayload = {
    to: target,
    subject: subjectFor(message, rendered.text).slice(0, maxSubjectChars),
    text: rendered.text,
    source_message_id: message.message_id,
    thread_id: message.thread.thread_id,
    correlation_id: message.audit.correlation_id,
    headers: {
      message_id: `<${sanitizeId(message.message_id)}@spyglass.local>`,
      ...(message.thread.native_thread_ref
        ? { in_reply_to: message.thread.native_thread_ref }
        : {}),
      ...(message.thread.native_thread_ref
        ? { references: [message.thread.native_thread_ref] }
        : {}),
    },
    ...(message.thread.native_thread_ref ? { reply_alias: message.thread.native_thread_ref } : {}),
    ...(rendered.fallback_used ? { fallback_used: true } : {}),
  };

  return { ok: true, native_payload, message };
};

const outboundRefusal = (
  message: ChannelMessage,
  maxBodyChars: number,
  maxSubjectChars: number,
): ChannelRefusal | undefined => {
  if (message.direction !== "outbound" || message.channel.kind !== "email") {
    return unsupportedIntent();
  }
  if (message.participant.link_status !== "verified" || message.thread.state !== "open") {
    return refusal("unauthorized_participant", "Email target is not sendable");
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
  if (
    rendered.text.length > maxBodyChars ||
    subjectFor(message, rendered.text).length > maxSubjectChars
  ) {
    return refusal("over_size_payload", "Email outbound payload exceeds max length");
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

const targetEmail = (message: ChannelMessage): string | undefined =>
  message.participant.channel_account_id?.replace(/^email:/, "");

const subjectFor = (message: ChannelMessage, body: string): string => {
  const firstLine = body.split(/\r?\n/).find((line) => line.trim().length > 0) ?? "Spyglass";
  if (message.intent.family === "match_notification_ack") return "Spyglass match update";
  if (message.intent.family === "onboarding") return "Spyglass verification";
  return firstLine.slice(0, 120);
};
