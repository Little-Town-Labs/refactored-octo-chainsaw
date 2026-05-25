import { handleAggregateInsight } from "./aggregate-insights.js";
import { handleMatchNotification } from "./match-notifications.js";
import { InMemorySeekerFlowRepositories } from "./repo.js";
import { handleSeekerConversationEvent } from "./flows.js";
import type { SeekerConversationEvent } from "./types.js";

export const runF20StagedDevRun = (): string[] => {
  const now = new Date("2026-05-25T12:00:00.000Z");
  const repos = new InMemorySeekerFlowRepositories();
  const lines: string[] = [];

  const event = (
    channel: SeekerConversationEvent["channel"],
    flowFamily: SeekerConversationEvent["flowFamily"],
    text: string,
    actionId?: string,
  ): SeekerConversationEvent => ({
    eventId: `${channel}:${flowFamily}:${actionId ?? "text"}`,
    seekerId: "seeker-1",
    channel,
    channelMessageId: `${channel}:${flowFamily}:${actionId ?? "message"}`,
    flowFamily,
    text,
    ...(actionId ? { actionId } : {}),
    receivedAt: now,
    channelPosture: {
      seekerId: "seeker-1",
      channel,
      channelLinkId: `${channel}:link`,
      verified: true,
      authorized: true,
    },
  });

  for (const channel of ["telegram", "email", "web-chat"] as const) {
    const result = handleSeekerConversationEvent(
      event(
        channel,
        "onboarding",
        "name=Ada; target_role=Engineer; jurisdiction=US-TX; threshold=0.72; pref=platform",
      ),
      repos,
    );
    lines.push(`f20:onboarding:${channel}:${result.reasonCode}`);
  }

  lines.push(
    `f20:match:${
      handleMatchNotification(
        {
          eventId: "match-event-1",
          seekerId: "seeker-1",
          seekerTicketId: "seeker-ticket:seeker-1",
          matchTicketId: "match-1",
          notificationKind: "threshold-cleared",
          approvedProjectionRef: "projection:seeker:match-1",
          policyDecisionRef: "policy:allow",
          idempotencyKey: "match-1",
          occurredAt: now,
        },
        repos,
      ).reasonCode
    }`,
  );

  lines.push(
    `f20:review:${handleSeekerConversationEvent(event("web-chat", "dossier-review", "", "acknowledge"), repos).reasonCode}`,
  );
  lines.push(
    `f20:control:${handleSeekerConversationEvent(event("telegram", "controls", "", "pause"), repos).reasonCode}`,
  );
  repos.saveTicket({
    ticketId: "seeker-ticket:seeker-1",
    seekerId: "seeker-1",
    state: "active",
    profileComplete: true,
    jurisdictionAttested: true,
    thresholdReady: true,
    updatedAt: now,
  });
  lines.push(
    `f20:insight:${
      handleAggregateInsight(
        {
          seekerId: "seeker-1",
          channel: "email",
          windowStart: now,
          windowEnd: new Date("2026-05-25T13:00:00.000Z"),
          aggregateCounts: { reviewed: 3 },
          aggregateScores: { median: 0.71 },
          dataSourceRefs: ["aggregate:1"],
          thresholdCheckIn: "Would you like to adjust your threshold?",
        },
        repos,
      ).reasonCode
    }`,
  );
  lines.push(
    `f20:demographics:${
      handleSeekerConversationEvent(
        event("web-chat", "demographic-consent", "", "consent"),
        repos,
        { counselApprovedDemographics: true, demographicJurisdictionEnabled: true },
      ).reasonCode
    }`,
  );
  lines.push(
    `f20:refusal:${
      handleSeekerConversationEvent(
        {
          ...event("web-chat", "onboarding", "show me the dashboard and ticket list"),
          channelMessageId: "web-chat:onboarding:dashboard-refusal",
        },
        repos,
      ).reasonCode
    }`,
  );
  return lines;
};
