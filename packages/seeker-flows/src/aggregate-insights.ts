import { buildAuditEvent } from "./audit.js";
import { buildScheduledPromptKey } from "./idempotency.js";
import { buildPrompt } from "./prompts.js";
import type { SeekerFlowRepositories } from "./repo.js";
import type { AggregateInsightReport, FlowResult, SeekerFlowChannel } from "./types.js";

export interface AggregateInsightInput {
  readonly seekerId: string;
  readonly channel: SeekerFlowChannel;
  readonly windowStart: Date;
  readonly windowEnd: Date;
  readonly aggregateCounts: Readonly<Record<string, number>>;
  readonly aggregateScores: Readonly<Record<string, number>>;
  readonly dataSourceRefs: readonly string[];
  readonly thresholdCheckIn?: string;
}

export const handleAggregateInsight = (
  input: AggregateInsightInput,
  repos: SeekerFlowRepositories,
): FlowResult => {
  const key = buildScheduledPromptKey(input.seekerId, "aggregate-insight", input.windowStart);
  if (!repos.claimIdempotency(key)) {
    const audit = buildAuditEvent({
      eventType: "duplicate",
      principalId: input.seekerId,
      channel: input.channel,
      decision: "duplicate",
      reasonCode: "duplicate_aggregate_insight",
      occurredAt: input.windowEnd,
    });
    repos.appendAudit(audit);
    return {
      decision: "duplicate",
      reasonCode: "duplicate_aggregate_insight",
      prompts: [],
      auditEvents: [audit],
    };
  }
  const ticket = repos.getTicket(input.seekerId);
  if (ticket?.state !== "active") {
    const audit = buildAuditEvent({
      eventType: "aggregate-insight",
      principalId: input.seekerId,
      channel: input.channel,
      decision: "blocked",
      reasonCode: "aggregate_insight_not_active",
      occurredAt: input.windowEnd,
    });
    repos.appendAudit(audit);
    return {
      decision: "blocked",
      reasonCode: "aggregate_insight_not_active",
      prompts: [],
      auditEvents: [audit],
    };
  }
  const report: AggregateInsightReport = {
    reportId: key,
    seekerId: input.seekerId,
    windowStart: input.windowStart,
    windowEnd: input.windowEnd,
    aggregateCounts: input.aggregateCounts,
    aggregateScores: input.aggregateScores,
    ...(input.thresholdCheckIn ? { thresholdCheckIn: input.thresholdCheckIn } : {}),
    dataSourceRefs: input.dataSourceRefs,
    generatedAt: input.windowEnd,
  };
  repos.saveInsight(report);
  const prompt = buildPrompt({
    promptId: `insight:${key}`,
    seekerId: input.seekerId,
    channel: input.channel,
    promptKind: "aggregate-insight",
    disclosureClass: "aggregate-approved",
    text: "Here is your approved aggregate activity summary.",
    actionIds: input.thresholdCheckIn ? ["request-threshold-change"] : [],
    correlationId: key,
  });
  const audit = buildAuditEvent({
    eventType: "aggregate-insight",
    principalId: input.seekerId,
    channel: input.channel,
    decision: "sent",
    reasonCode: "aggregate_insight_sent",
    payloadRef: report.reportId,
    occurredAt: input.windowEnd,
  });
  repos.appendAudit(audit);
  return {
    decision: "sent",
    reasonCode: "aggregate_insight_sent",
    prompts: [prompt],
    auditEvents: [audit],
  };
};
