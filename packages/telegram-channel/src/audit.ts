import {
  buildAuditEventId,
  createChannelAuditEvent,
  type ChannelAuditEvent,
  type ChannelAuditEventType,
  type ChannelMessage,
  type ChannelReasonCode,
} from "@spyglass/channels-core";

import type { BoundedTelegramUpdate } from "./types.js";

export const telegramAuditEvent = (input: {
  readonly event_type: ChannelAuditEventType;
  readonly correlation_id: string;
  readonly update?: BoundedTelegramUpdate;
  readonly message?: ChannelMessage;
  readonly reason_code?: ChannelReasonCode;
  readonly native_ref?: string;
  readonly evidence?: Record<string, unknown>;
}): ChannelAuditEvent =>
  createChannelAuditEvent({
    event_type: input.event_type,
    channel_kind: "telegram",
    correlation_id: input.correlation_id,
    ...(input.message ? { message_id: input.message.message_id } : {}),
    ...(input.message?.participant.principal_id
      ? { principal_id: input.message.participant.principal_id }
      : {}),
    ...(input.reason_code ? { reason_code: input.reason_code } : {}),
    ...(input.native_ref ? { native_ref: input.native_ref } : {}),
    evidence: {
      ...(input.evidence ?? {}),
      ...(input.update
        ? {
            telegram_update_id: input.update.update_id,
            telegram_kind: input.update.kind,
            telegram_chat_ref: input.update.chat_ref,
          }
        : {}),
    },
  });

export const telegramAuditEventId = (
  event: Omit<ChannelAuditEvent, "event_id" | "occurred_at">,
): string => buildAuditEventId(event);
