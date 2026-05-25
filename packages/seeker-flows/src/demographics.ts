import { buildEventAudit } from "./audit.js";
import { buildPrompt } from "./prompts.js";
import type { SeekerFlowRepositories } from "./repo.js";
import type { DemographicConsentPosture, FlowResult, SeekerConversationEvent } from "./types.js";

export interface DemographicConsentOptions {
  readonly counselApproved: boolean;
  readonly jurisdictionEnabled: boolean;
  readonly consentVersion?: string;
}

export const handleDemographicConsent = (
  event: SeekerConversationEvent,
  repos: SeekerFlowRepositories,
  options: DemographicConsentOptions,
): FlowResult => {
  const posture = buildDemographicPosture(event, options);
  repos.saveDemographicConsent(posture);
  const prompt = buildPrompt({
    promptId: `demographic:${posture.consentState}:${event.channelMessageId}`,
    seekerId: event.seekerId,
    channel: event.channel,
    promptKind: "demographic-consent",
    disclosureClass: posture.collectionEnabled ? "seeker-approved" : "non-collection-explanation",
    text: demographicPromptText(posture),
    correlationId: event.channelMessageId,
  });
  const audit = buildEventAudit(
    event,
    "demographic-consent",
    "recorded",
    `demographic_${posture.consentState}`,
  );
  repos.appendAudit(audit);
  return {
    decision: "recorded",
    reasonCode: `demographic_${posture.consentState}`,
    prompts: [prompt],
    auditEvents: [audit],
  };
};

export const buildDemographicPosture = (
  event: SeekerConversationEvent,
  options: DemographicConsentOptions,
): DemographicConsentPosture => {
  if (!options.counselApproved) {
    return disabledPosture(event, "disabled-counsel", "counsel_not_approved");
  }
  if (!options.jurisdictionEnabled) {
    return disabledPosture(event, "disabled-jurisdiction", "jurisdiction_disabled");
  }
  const answer = (event.actionId ?? event.text ?? "").trim().toLowerCase();
  if (answer === "consent" || answer === "yes") {
    return {
      seekerId: event.seekerId,
      consentState: "consented",
      collectionEnabled: true,
      consentVersion: options.consentVersion ?? "f20-consent-v1",
      jurisdictionPosture: "enabled",
      segregatedDataRef: `bias-audit:${event.seekerId}`,
      decidedAt: event.receivedAt,
    };
  }
  if (answer === "withdraw") {
    return {
      seekerId: event.seekerId,
      consentState: "withdrawn",
      collectionEnabled: false,
      consentVersion: options.consentVersion ?? "f20-consent-v1",
      jurisdictionPosture: "enabled",
      decidedAt: event.receivedAt,
      withdrawnAt: event.receivedAt,
    };
  }
  return {
    seekerId: event.seekerId,
    consentState: "declined",
    collectionEnabled: false,
    consentVersion: options.consentVersion ?? "f20-consent-v1",
    jurisdictionPosture: "enabled",
    reasonCode: "declined_without_penalty",
    decidedAt: event.receivedAt,
  };
};

const disabledPosture = (
  event: SeekerConversationEvent,
  consentState: "disabled-counsel" | "disabled-jurisdiction",
  reasonCode: string,
): DemographicConsentPosture => ({
  seekerId: event.seekerId,
  consentState,
  collectionEnabled: false,
  reasonCode,
  decidedAt: event.receivedAt,
});

const demographicPromptText = (posture: DemographicConsentPosture): string => {
  if (posture.consentState === "consented") {
    return "Your optional demographic consent is recorded for segregated bias-audit use.";
  }
  if (posture.consentState === "withdrawn") {
    return "Your optional demographic consent has been withdrawn.";
  }
  if (posture.consentState.startsWith("disabled")) {
    return "Optional demographic collection is not active for this posture.";
  }
  return "No problem. Declining optional demographic collection does not affect matching.";
};
