import { buildEventAudit } from "./audit.js";
import { buildRefusalPrompt } from "./prompts.js";
import type { SeekerFlowRepositories } from "./repo.js";
import type { DossierReviewDecisionKind, FlowResult, SeekerConversationEvent } from "./types.js";

const SUPPORTED_DECISIONS = new Set<DossierReviewDecisionKind>([
  "acknowledge",
  "decline",
  "request-human-follow-up",
  "request-threshold-change",
  "pause",
  "resume",
  "withdraw",
]);

export const handleDossierReview = (
  event: SeekerConversationEvent,
  repos: SeekerFlowRepositories,
): FlowResult => {
  if (isForbiddenDataRequest(event.text ?? "")) {
    const reasonCode = "hidden_or_raw_data_refused";
    const prompt = buildRefusalPrompt(
      event.seekerId,
      event.channel,
      event.channelMessageId,
      reasonCode,
    );
    const audit = buildEventAudit(event, "refusal", "refused", reasonCode);
    repos.appendAudit(audit);
    return { decision: "refused", reasonCode, prompts: [prompt], auditEvents: [audit] };
  }
  const decision = normalizeDecision(event.actionId ?? event.text ?? "");
  if (!decision) {
    const audit = buildEventAudit(event, "dossier-review", "blocked", "unsupported_review_action");
    repos.appendAudit(audit);
    return {
      decision: "blocked",
      reasonCode: "unsupported_review_action",
      prompts: [],
      auditEvents: [audit],
    };
  }
  repos.saveDossierReview({
    decisionId: `review:${event.seekerId}:${event.channelMessageId}`,
    matchTicketId: event.message?.thread.match_ticket_id ?? "match-ticket:unknown",
    seekerId: event.seekerId,
    decision,
    sourcePromptId: event.promptId ?? "prompt:unknown",
    ...(event.text ? { notesRef: `notes:${event.channelMessageId}` } : {}),
    recordedAt: event.receivedAt,
  });
  const audit = buildEventAudit(event, "dossier-review", "recorded", `review_${decision}`);
  repos.appendAudit(audit);
  return {
    decision: "recorded",
    reasonCode: `review_${decision}`,
    prompts: [],
    auditEvents: [audit],
  };
};

export const isForbiddenDataRequest = (text: string): boolean =>
  /raw|hidden|transcript|scoring|counterparty|direct message|parley/i.test(text);

const normalizeDecision = (value: string): DossierReviewDecisionKind | undefined => {
  const normalized = value.trim().toLowerCase().replaceAll("_", "-") as DossierReviewDecisionKind;
  return SUPPORTED_DECISIONS.has(normalized) ? normalized : undefined;
};
