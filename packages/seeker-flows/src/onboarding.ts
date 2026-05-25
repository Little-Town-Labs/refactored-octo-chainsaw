import { buildEventAudit } from "./audit.js";
import { buildPrompt, buildRefusalPrompt } from "./prompts.js";
import { buildProfileDraft, isProfileComplete } from "./profile.js";
import type { SeekerFlowRepositories } from "./repo.js";
import { buildThresholdPosture } from "./thresholds.js";
import type { FlowResult, SeekerConversationEvent, SeekerTicketProductState } from "./types.js";

export const handleOnboarding = (
  event: SeekerConversationEvent,
  repos: SeekerFlowRepositories,
): FlowResult => {
  let ticket = repos.getTicket(event.seekerId) ?? createOnboardingTicket(event);
  if (["withdrawn", "closed", "hired"].includes(ticket.state)) {
    const audit = buildEventAudit(
      event,
      "onboarding",
      "blocked",
      "ticket_terminal",
      ticket.ticketId,
    );
    repos.appendAudit(audit);
    return {
      decision: "blocked",
      reasonCode: "ticket_terminal",
      prompts: [],
      auditEvents: [audit],
    };
  }

  const profile = buildProfileDraft(event);
  repos.saveProfile(profile);
  const threshold = buildThresholdPosture(event);
  if (threshold) {
    repos.saveThreshold(threshold);
  }
  const jurisdiction = parseJurisdiction(event.text ?? "");
  if (jurisdiction) {
    repos.saveJurisdiction({
      attestationId: `jurisdiction:${event.seekerId}`,
      seekerId: event.seekerId,
      jurisdiction,
      attestedAt: event.receivedAt,
      sourceChannel: event.channel,
    });
  }

  ticket = {
    ...ticket,
    profileComplete: isProfileComplete(profile),
    thresholdReady: threshold !== undefined || ticket.thresholdReady,
    jurisdictionAttested: jurisdiction !== undefined || ticket.jurisdictionAttested,
    updatedAt: event.receivedAt,
  };
  if (ticket.profileComplete && ticket.thresholdReady && ticket.jurisdictionAttested) {
    ticket = { ...ticket, state: "active" };
  }
  repos.saveTicket(ticket);

  const reasonCode = ticket.state === "active" ? "onboarding_active" : nextMissingReason(ticket);
  const prompt = buildPrompt({
    promptId: `onboarding:${reasonCode}:${event.channelMessageId}`,
    seekerId: event.seekerId,
    channel: event.channel,
    promptKind: ticket.state === "active" ? "confirm-change" : promptKindFor(reasonCode),
    text: promptTextFor(reasonCode),
    correlationId: event.channelMessageId,
  });
  const audit = buildEventAudit(event, "onboarding", "accepted", reasonCode, ticket.ticketId);
  repos.appendAudit(audit);
  return { decision: "accepted", reasonCode, prompts: [prompt], auditEvents: [audit] };
};

export const handleOnboardingRefusal = (
  event: SeekerConversationEvent,
  reasonCode: string,
): FlowResult => {
  const prompt = buildRefusalPrompt(
    event.seekerId,
    event.channel,
    event.channelMessageId,
    reasonCode,
  );
  const audit = buildEventAudit(event, "refusal", "refused", reasonCode);
  return { decision: "refused", reasonCode, prompts: [prompt], auditEvents: [audit] };
};

const createOnboardingTicket = (event: SeekerConversationEvent): SeekerTicketProductState => ({
  ticketId: `seeker-ticket:${event.seekerId}`,
  seekerId: event.seekerId,
  state: "onboarding",
  profileComplete: false,
  jurisdictionAttested: false,
  thresholdReady: false,
  updatedAt: event.receivedAt,
});

const parseJurisdiction = (text: string): string | undefined => {
  const match = /jurisdiction=([a-z]{2}(?:-[a-z0-9]+)?)/i.exec(text);
  return match?.[1]?.toUpperCase();
};

const nextMissingReason = (ticket: SeekerTicketProductState): string => {
  if (!ticket.profileComplete) {
    return "missing_profile";
  }
  if (!ticket.jurisdictionAttested) {
    return "missing_jurisdiction";
  }
  return "missing_threshold";
};

const promptKindFor = (reasonCode: string) => {
  if (reasonCode === "missing_jurisdiction") {
    return "ask-jurisdiction" as const;
  }
  if (reasonCode === "missing_threshold") {
    return "ask-threshold" as const;
  }
  return "ask-profile" as const;
};

const promptTextFor = (reasonCode: string): string => {
  if (reasonCode === "onboarding_active") {
    return "Your seeker profile is active for matching.";
  }
  if (reasonCode === "missing_jurisdiction") {
    return "Please attest your work jurisdiction before matching can begin.";
  }
  if (reasonCode === "missing_threshold") {
    return "Please choose an initial match threshold.";
  }
  return "Please provide the required profile fields.";
};
