import type {
  FlowDecision,
  SeekerFlowAuditEvent,
  SeekerFlowChannel,
  SeekerConversationEvent,
} from "./types.js";

export interface BuildAuditEventArgs {
  readonly eventType: SeekerFlowAuditEvent["eventType"];
  readonly principalId: string;
  readonly channel: SeekerFlowChannel;
  readonly decision: FlowDecision;
  readonly reasonCode: string;
  readonly correlationId?: string;
  readonly ticketId?: string;
  readonly payloadRef?: string;
  readonly occurredAt?: Date;
}

export const buildAuditEvent = (args: BuildAuditEventArgs): SeekerFlowAuditEvent => {
  const occurredAt = args.occurredAt ?? new Date();
  const correlationId = args.correlationId ?? `${args.eventType}:${args.principalId}`;
  return {
    auditEventId: `seeker_flow:${args.eventType}:${args.principalId}:${occurredAt.toISOString()}`,
    correlationId,
    eventType: args.eventType,
    principalId: args.principalId,
    ...(args.ticketId ? { ticketId: args.ticketId } : {}),
    channel: args.channel,
    decision: args.decision,
    reasonCode: args.reasonCode,
    ...(args.payloadRef ? { payloadRef: args.payloadRef } : {}),
    occurredAt,
  };
};

export const buildEventAudit = (
  event: SeekerConversationEvent,
  eventType: SeekerFlowAuditEvent["eventType"],
  decision: FlowDecision,
  reasonCode: string,
  ticketId?: string,
): SeekerFlowAuditEvent => {
  const args: BuildAuditEventArgs = {
    eventType,
    principalId: event.seekerId,
    channel: event.channel,
    decision,
    reasonCode,
    correlationId: event.channelMessageId,
    occurredAt: event.receivedAt,
  };
  return buildAuditEvent(ticketId ? { ...args, ticketId } : args);
};
