import type { ChannelMessage, JsonObject } from "@spyglass/channels-core";

import { sanitizeId } from "./idempotency.js";
import type { BoundedWebChatEvent } from "./types.js";

export const WEB_CHAT_AUDIT_EVENT_TYPES = [
  "channel.normalized",
  "channel.refused",
  "channel.duplicate_suppressed",
  "channel.rendered",
  "channel.delivery_recorded",
  "channel.accessibility_validated",
  "channel.unsupported_intent_refused",
  "channel.capability_registered",
] as const;
export type WebChatAuditEventType = (typeof WEB_CHAT_AUDIT_EVENT_TYPES)[number];

export interface WebChatAuditEvent extends JsonObject {
  readonly event_id: string;
  readonly event_type: WebChatAuditEventType;
  readonly correlation_id: string;
  readonly occurred_at: string;
  readonly reason_code?: string;
  readonly status?: string;
  readonly message_id?: string;
  readonly event_ref?: string;
  readonly thread_id?: string;
  readonly participant_id?: string;
  readonly native_ref?: string;
}

export const webChatAuditEvent = (input: {
  readonly event_type: WebChatAuditEventType;
  readonly correlation_id: string;
  readonly event?: BoundedWebChatEvent;
  readonly message?: ChannelMessage;
  readonly reason_code?: string;
  readonly status?: string;
  readonly native_ref?: string;
}): WebChatAuditEvent => {
  const threadId = input.message?.thread.thread_id ?? input.event?.thread_id;
  const messageId = input.message?.message_id;
  const eventRef = input.event?.event_id;
  return {
    event_id: [
      "audit",
      "web-chat",
      sanitizeId(input.event_type),
      sanitizeId(input.correlation_id),
      sanitizeId(messageId ?? eventRef ?? "no-ref"),
    ].join(":"),
    event_type: input.event_type,
    correlation_id: input.correlation_id,
    occurred_at: new Date().toISOString(),
    ...(input.reason_code ? { reason_code: input.reason_code } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(messageId ? { message_id: messageId } : {}),
    ...(eventRef ? { event_ref: eventRef } : {}),
    ...(threadId ? { thread_id: threadId } : {}),
    ...(input.message?.participant.participant_id
      ? { participant_id: input.message.participant.participant_id }
      : {}),
    ...(input.native_ref ? { native_ref: input.native_ref } : {}),
  };
};
