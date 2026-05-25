import { createChannelMessage } from "@spyglass/channels-core";
import { InMemorySeekerFlowRepositories } from "../repo.js";
import type {
  MatchNotificationEvent,
  SeekerConversationEvent,
  SeekerFlowChannel,
  SeekerTicketProductState,
} from "../types.js";

export const fixedNow = new Date("2026-05-25T12:00:00.000Z");

export const createRepos = (): InMemorySeekerFlowRepositories =>
  new InMemorySeekerFlowRepositories();

export const makeEvent = (
  channel: SeekerFlowChannel,
  flowFamily: SeekerConversationEvent["flowFamily"],
  overrides: Partial<SeekerConversationEvent> = {},
): SeekerConversationEvent => {
  const channelMessageId = overrides.channelMessageId ?? `${channel}:${flowFamily}:message`;
  return {
    eventId: overrides.eventId ?? `${channel}:${flowFamily}:event`,
    seekerId: overrides.seekerId ?? "seeker-1",
    channel,
    channelMessageId,
    flowFamily,
    text: overrides.text ?? "",
    receivedAt: overrides.receivedAt ?? fixedNow,
    channelPosture: overrides.channelPosture ?? {
      seekerId: overrides.seekerId ?? "seeker-1",
      channel,
      channelLinkId: `${channel}:link`,
      verified: true,
      authorized: true,
    },
    ...overrides,
  };
};

export const makeChannelMessage = (channel: SeekerFlowChannel) =>
  createChannelMessage({
    direction: "inbound",
    channel: {
      kind: channel === "web-chat" ? "web_chat" : channel,
      version: "test",
      enabled: true,
    },
    participant: {
      principal_id: "seeker-1",
      link_status: "verified",
      role: "seeker",
    },
    thread: {
      thread_id: `${channel}:thread`,
      seeker_ticket_id: "seeker-ticket:seeker-1",
      match_ticket_id: "match-1",
      state: "open",
    },
    idempotency_key: `${channel}:idem`,
    occurred_at: fixedNow,
    content: [{ kind: "text", classification: "untrusted_user_input", text: "hello" }],
    intent: { family: "test", supported: true },
    disclosure: { posture: "untrusted_inbound" },
    audit: { correlation_id: `${channel}:corr`, source: "test" },
  });

export const activeTicket = (seekerId = "seeker-1"): SeekerTicketProductState => ({
  ticketId: `seeker-ticket:${seekerId}`,
  seekerId,
  state: "active",
  profileComplete: true,
  jurisdictionAttested: true,
  thresholdReady: true,
  updatedAt: fixedNow,
});

export const matchEvent = (
  overrides: Partial<MatchNotificationEvent> = {},
): MatchNotificationEvent => ({
  eventId: "match-event-1",
  channel: "web-chat",
  seekerId: "seeker-1",
  seekerTicketId: "seeker-ticket:seeker-1",
  matchTicketId: "match-1",
  notificationKind: "threshold-cleared",
  approvedProjectionRef: "projection:seeker:match-1",
  policyDecisionRef: "policy:allow",
  idempotencyKey: "match-1",
  occurredAt: fixedNow,
  ...overrides,
});
