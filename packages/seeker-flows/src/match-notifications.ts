import { buildAuditEvent } from "./audit.js";
import { buildPrompt } from "./prompts.js";
import { canNotifyMatch } from "./policy.js";
import type { SeekerFlowRepositories } from "./repo.js";
import type { FlowResult, MatchNotificationEvent } from "./types.js";

export const handleMatchNotification = (
  event: MatchNotificationEvent,
  repos: SeekerFlowRepositories,
): FlowResult => {
  const ticket = repos.getTicket(event.seekerId);
  const duplicate = !repos.claimIdempotency(`match:${event.idempotencyKey}`);
  if (duplicate) {
    const audit = buildAuditEvent({
      eventType: "duplicate",
      principalId: event.seekerId,
      channel: event.channel ?? "web-chat",
      decision: "duplicate",
      reasonCode: "duplicate_match_notification",
      ticketId: event.matchTicketId,
      occurredAt: event.occurredAt,
    });
    repos.appendAudit(audit);
    return {
      decision: "duplicate",
      reasonCode: "duplicate_match_notification",
      prompts: [],
      auditEvents: [audit],
    };
  }
  if (!canNotifyMatch(ticket, event)) {
    const audit = buildAuditEvent({
      eventType: "match-notification",
      principalId: event.seekerId,
      channel: event.channel ?? "web-chat",
      decision: "blocked",
      reasonCode: "match_notification_not_authorized",
      ticketId: event.matchTicketId,
      occurredAt: event.occurredAt,
    });
    repos.appendAudit(audit);
    return {
      decision: "blocked",
      reasonCode: "match_notification_not_authorized",
      prompts: [],
      auditEvents: [audit],
    };
  }
  const prompt = buildPrompt({
    promptId: `match:${event.matchTicketId}:${event.eventId}`,
    seekerId: event.seekerId,
    channel: event.channel ?? "web-chat",
    promptKind: "match-notification",
    text: `A match cleared your threshold. Review the approved summary for ${event.matchTicketId}.`,
    actionIds: [
      "acknowledge",
      "decline",
      "request-human-follow-up",
      "request-threshold-change",
      "pause",
      "resume",
      "withdraw",
    ],
    correlationId: event.eventId,
  });
  const audit = buildAuditEvent({
    eventType: "match-notification",
    principalId: event.seekerId,
    channel: prompt.channel,
    decision: "sent",
    reasonCode: "match_notification_sent",
    ticketId: event.matchTicketId,
    payloadRef: event.approvedProjectionRef ?? event.matchTicketId,
    occurredAt: event.occurredAt,
  });
  repos.appendAudit(audit);
  return {
    decision: "sent",
    reasonCode: "match_notification_sent",
    prompts: [prompt],
    auditEvents: [audit],
  };
};
