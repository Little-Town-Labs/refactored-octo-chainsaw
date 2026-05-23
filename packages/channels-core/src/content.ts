import type { ContentPart, RichCard } from "./message.js";

export const ALLOWED_SEEKER_INTENTS = [
  "onboarding",
  "resume_profile_update",
  "threshold_tuning",
  "match_notification_ack",
  "dossier_review_response",
  "pause",
  "resume",
  "withdraw",
  "aggregate_insight_ack",
  "demographic_opt_in_response",
  "fallback_free_text",
] as const;
export type AllowedSeekerIntent = (typeof ALLOWED_SEEKER_INTENTS)[number];

export const UNSUPPORTED_SEEKER_INTENTS = [
  "browse_all_jobs",
  "list_all_match_tickets",
  "inspect_hidden_run_state",
  "direct_counterparty_message",
  "override_parley_run",
  "analytics_dashboard_request",
] as const;
export type UnsupportedSeekerIntent = (typeof UNSUPPORTED_SEEKER_INTENTS)[number];

export type SeekerIntent = AllowedSeekerIntent | UnsupportedSeekerIntent;

export const isAllowedSeekerIntent = (intent: string): intent is AllowedSeekerIntent =>
  ALLOWED_SEEKER_INTENTS.includes(intent as AllowedSeekerIntent);

export const isUnsupportedSeekerIntent = (intent: string): intent is UnsupportedSeekerIntent =>
  UNSUPPORTED_SEEKER_INTENTS.includes(intent as UnsupportedSeekerIntent);

export const classifySeekerIntent = (
  candidate: string,
): { readonly family: SeekerIntent | "unknown"; readonly supported: boolean } => {
  const normalized = candidate
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_");
  if (isAllowedSeekerIntent(normalized)) {
    return { family: normalized, supported: true };
  }
  if (isUnsupportedSeekerIntent(normalized)) {
    return { family: normalized, supported: false };
  }
  return { family: "unknown", supported: false };
};

export const textPart = (text: string, inbound = true): ContentPart => ({
  kind: "text",
  text,
  classification: inbound ? "untrusted_user_input" : "approved_projection",
});

export const commandPart = (command: string): ContentPart => ({
  kind: "command",
  command,
  classification: "untrusted_user_input",
});

export const richCardPart = (rich_card: RichCard): ContentPart => ({
  kind: "rich_card",
  rich_card,
  classification: "approved_projection",
});

export const degradeRichCardToText = (card: RichCard): ContentPart => {
  const actions =
    card.actions && card.actions.length > 0 ? `\nActions: ${card.actions.join(", ")}` : "";
  return textPart(`${card.title}\n${card.body}${actions}`, false);
};

export const assertNoUnsupportedIntent = (intent: string): void => {
  if (isUnsupportedSeekerIntent(intent)) {
    throw new Error(`Unsupported seeker-channel intent: ${intent}`);
  }
};
