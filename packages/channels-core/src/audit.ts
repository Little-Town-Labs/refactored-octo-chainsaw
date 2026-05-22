import type { ChannelKind } from "./message.js";
import type { ChannelReasonCode } from "./errors.js";

export const CHANNEL_AUDIT_EVENT_TYPES = [
  "channel.normalized",
  "channel.refused",
  "channel.duplicate_suppressed",
  "channel.outbound_rendered",
  "channel.delivery_recorded",
  "channel.capability_registered",
] as const;
export type ChannelAuditEventType = (typeof CHANNEL_AUDIT_EVENT_TYPES)[number];

export interface ChannelAuditEvent {
  readonly event_id: string;
  readonly event_type: ChannelAuditEventType;
  readonly channel_kind: ChannelKind;
  readonly occurred_at: Date;
  readonly correlation_id: string;
  readonly message_id?: string;
  readonly principal_id?: string;
  readonly reason_code?: ChannelReasonCode;
  readonly native_ref?: string;
  readonly evidence?: Record<string, unknown>;
}

export type NewChannelAuditEvent = Omit<ChannelAuditEvent, "event_id" | "occurred_at"> & {
  readonly event_id?: string;
  readonly occurred_at?: Date;
};

export const createChannelAuditEvent = (event: NewChannelAuditEvent): ChannelAuditEvent => ({
  ...event,
  event_id: event.event_id ?? buildAuditEventId(event),
  occurred_at: event.occurred_at ?? new Date(),
});

export const buildAuditEventId = (
  event: Omit<ChannelAuditEvent, "event_id" | "occurred_at">,
): string =>
  [
    "chanaudit",
    event.event_type.replace("channel.", ""),
    event.channel_kind,
    event.message_id ?? event.native_ref ?? event.correlation_id,
  ]
    .join("_")
    .replace(/[^a-zA-Z0-9_-]+/g, "-");
