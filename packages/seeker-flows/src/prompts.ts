import type { FlowResult, SeekerFlowChannel, SeekerOutboundPrompt } from "./types.js";

export interface PromptArgs {
  readonly promptId: string;
  readonly seekerId: string;
  readonly channel: SeekerFlowChannel;
  readonly promptKind: SeekerOutboundPrompt["promptKind"];
  readonly text: string;
  readonly correlationId: string;
  readonly actionIds?: readonly string[];
  readonly disclosureClass?: SeekerOutboundPrompt["disclosureClass"];
}

export const buildPrompt = (args: PromptArgs): SeekerOutboundPrompt => ({
  promptId: args.promptId,
  seekerId: args.seekerId,
  channel: args.channel,
  promptKind: args.promptKind,
  disclosureClass: args.disclosureClass ?? "seeker-approved",
  text: args.text,
  actionIds: args.actionIds ?? [],
  correlationId: args.correlationId,
});

export const buildRefusalPrompt = (
  seekerId: string,
  channel: SeekerFlowChannel,
  correlationId: string,
  reasonCode: string,
): SeekerOutboundPrompt =>
  buildPrompt({
    promptId: `refusal:${reasonCode}:${correlationId}`,
    seekerId,
    channel,
    promptKind: "refusal",
    disclosureClass: "refusal-safe",
    text: refusalText(reasonCode),
    correlationId,
  });

export const refusalText = (reasonCode: string): string => {
  if (reasonCode.includes("dashboard")) {
    return "I can help in this conversation, but I cannot show dashboards, ticket lists, analytics, or recommended jobs.";
  }
  if (
    reasonCode.includes("hidden") ||
    reasonCode.includes("raw") ||
    reasonCode.includes("transcript")
  ) {
    return "I cannot expose hidden run state, raw records, transcripts, scoring internals, or direct counterparty messages.";
  }
  if (reasonCode.includes("unauthorized")) {
    return "I need a verified channel link before I can take that product action.";
  }
  return "I cannot complete that request in this conversation.";
};

export const emptyResult = (reasonCode: string): FlowResult => ({
  decision: "blocked",
  reasonCode,
  prompts: [],
  auditEvents: [],
});
