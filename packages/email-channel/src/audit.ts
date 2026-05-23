import {
  buildAuditEventId,
  createChannelAuditEvent,
  type ChannelAuditEvent,
  type ChannelAuditEventType,
  type ChannelMessage,
  type ChannelReasonCode,
} from "@spyglass/channels-core";

import type { BoundedEmailEvent } from "./types.js";

export const emailAuditEvent = (input: {
  readonly event_type: ChannelAuditEventType;
  readonly correlation_id: string;
  readonly event?: BoundedEmailEvent;
  readonly message?: ChannelMessage;
  readonly reason_code?: ChannelReasonCode;
  readonly native_ref?: string;
  readonly evidence?: Record<string, unknown>;
}): ChannelAuditEvent =>
  createChannelAuditEvent({
    event_type: input.event_type,
    channel_kind: "email",
    correlation_id: input.correlation_id,
    ...(input.message ? { message_id: input.message.message_id } : {}),
    ...(input.message?.participant.principal_id
      ? { principal_id: input.message.participant.principal_id }
      : {}),
    ...(input.reason_code ? { reason_code: input.reason_code } : {}),
    ...(input.native_ref ? { native_ref: input.native_ref } : {}),
    evidence: {
      ...(input.evidence ?? {}),
      ...(input.event
        ? {
            email_provider: input.event.provider,
            email_event_kind: input.event.event_kind,
            email_provider_event_id: input.event.provider_event_id,
            email_message_id: input.event.message_id,
          }
        : {}),
    },
  });

export const emailAuditEventId = (
  event: Omit<ChannelAuditEvent, "event_id" | "occurred_at">,
): string => buildAuditEventId(event);
