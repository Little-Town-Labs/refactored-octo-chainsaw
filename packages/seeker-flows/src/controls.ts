import { buildEventAudit } from "./audit.js";
import { buildPrompt } from "./prompts.js";
import { canReceiveProductAction } from "./policy.js";
import type { SeekerFlowRepositories } from "./repo.js";
import type { FlowResult, SeekerConversationEvent, SeekerTicketProductStateName } from "./types.js";

const CONTROL_STATES: Record<string, SeekerTicketProductStateName> = {
  pause: "paused",
  resume: "active",
  withdraw: "withdrawn",
};

export const handleControl = (
  event: SeekerConversationEvent,
  repos: SeekerFlowRepositories,
): FlowResult => {
  const ticket = repos.getTicket(event.seekerId);
  const command = normalizeControl(event.actionId ?? event.text ?? "");
  if (!ticket || !command || !canReceiveProductAction(ticket)) {
    const audit = buildEventAudit(
      event,
      "control",
      "blocked",
      "control_not_allowed",
      ticket?.ticketId,
    );
    repos.appendAudit(audit);
    return {
      decision: "blocked",
      reasonCode: "control_not_allowed",
      prompts: [],
      auditEvents: [audit],
    };
  }
  const nextState = CONTROL_STATES[command];
  if (!nextState) {
    const audit = buildEventAudit(
      event,
      "control",
      "blocked",
      "control_not_allowed",
      ticket.ticketId,
    );
    repos.appendAudit(audit);
    return {
      decision: "blocked",
      reasonCode: "control_not_allowed",
      prompts: [],
      auditEvents: [audit],
    };
  }
  repos.saveTicket({ ...ticket, state: nextState, updatedAt: event.receivedAt });
  const prompt = buildPrompt({
    promptId: `control:${command}:${event.channelMessageId}`,
    seekerId: event.seekerId,
    channel: event.channel,
    promptKind: "control-confirmation",
    text: `Your seeker ticket is now ${nextState}.`,
    correlationId: event.channelMessageId,
  });
  const audit = buildEventAudit(
    event,
    "control",
    "recorded",
    `control_${command}`,
    ticket.ticketId,
  );
  repos.appendAudit(audit);
  return {
    decision: "recorded",
    reasonCode: `control_${command}`,
    prompts: [prompt],
    auditEvents: [audit],
  };
};

const normalizeControl = (value: string): string | undefined => {
  const normalized = value.trim().toLowerCase();
  return ["pause", "resume", "withdraw"].includes(normalized) ? normalized : undefined;
};
