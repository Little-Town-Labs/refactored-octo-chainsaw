import type { ChannelMessage } from "@spyglass/channels-core";

export const SEEKER_FLOW_CHANNELS = ["telegram", "email", "web-chat"] as const;
export type SeekerFlowChannel = (typeof SEEKER_FLOW_CHANNELS)[number];

export const FLOW_FAMILIES = [
  "onboarding",
  "match-notification",
  "dossier-review",
  "controls",
  "aggregate-insight",
  "demographic-consent",
  "refusal",
] as const;
export type FlowFamily = (typeof FLOW_FAMILIES)[number];

export const TICKET_STATES = [
  "onboarding",
  "active",
  "paused",
  "in-conversation",
  "hired",
  "withdrawn",
  "closed",
] as const;
export type SeekerTicketProductStateName = (typeof TICKET_STATES)[number];

export type FlowDecision =
  | "accepted"
  | "refused"
  | "blocked"
  | "duplicate"
  | "sent"
  | "failed"
  | "recorded";

export interface VerifiedChannelPosture {
  readonly seekerId: string;
  readonly channel: SeekerFlowChannel;
  readonly channelLinkId: string;
  readonly verified: boolean;
  readonly authorized: boolean;
  readonly disabled?: boolean;
}

export interface SeekerConversationEvent {
  readonly eventId: string;
  readonly seekerId: string;
  readonly channel: SeekerFlowChannel;
  readonly channelMessageId: string;
  readonly flowFamily: FlowFamily;
  readonly text?: string;
  readonly attachmentRefs?: readonly string[];
  readonly actionId?: string;
  readonly promptId?: string;
  readonly idempotencyKey?: string;
  readonly receivedAt: Date;
  readonly message?: ChannelMessage;
  readonly channelPosture: VerifiedChannelPosture;
}

export interface SeekerTicketProductState {
  readonly ticketId: string;
  readonly seekerId: string;
  readonly state: SeekerTicketProductStateName;
  readonly profileComplete: boolean;
  readonly jurisdictionAttested: boolean;
  readonly thresholdReady: boolean;
  readonly updatedAt: Date;
}

export interface SeekerProfileDraft {
  readonly profileDraftId: string;
  readonly seekerId: string;
  readonly resumeTextRef?: string;
  readonly resumeFileRef?: string;
  readonly structuredFields: Readonly<Record<string, string>>;
  readonly missingRequiredFields: readonly string[];
  readonly untrustedInputFlags: readonly string[];
  readonly sourceChannel: SeekerFlowChannel;
  readonly updatedAt: Date;
}

export interface PreferenceThresholdPosture {
  readonly postureId: string;
  readonly seekerId: string;
  readonly thresholds: Readonly<Record<string, number>>;
  readonly preferences: Readonly<Record<string, string>>;
  readonly validationVersion: string;
  readonly effectiveAt: Date;
}

export interface WorkJurisdictionAttestation {
  readonly attestationId: string;
  readonly seekerId: string;
  readonly jurisdiction: string;
  readonly attestedAt: Date;
  readonly sourceChannel: SeekerFlowChannel;
}

export interface MatchNotificationEvent {
  readonly eventId: string;
  readonly channel?: SeekerFlowChannel;
  readonly seekerId: string;
  readonly seekerTicketId: string;
  readonly matchTicketId: string;
  readonly notificationKind:
    | "threshold-cleared"
    | "one-side-cleared"
    | "inconclusive"
    | "threshold-check-in";
  readonly approvedProjectionRef?: string;
  readonly policyDecisionRef: string;
  readonly idempotencyKey: string;
  readonly stale?: boolean;
  readonly jurisdictionBlocked?: boolean;
  readonly occurredAt: Date;
}

export type DossierReviewDecisionKind =
  | "acknowledge"
  | "decline"
  | "request-human-follow-up"
  | "request-threshold-change"
  | "pause"
  | "resume"
  | "withdraw";

export interface DossierReviewDecision {
  readonly decisionId: string;
  readonly matchTicketId: string;
  readonly seekerId: string;
  readonly decision: DossierReviewDecisionKind;
  readonly sourcePromptId: string;
  readonly notesRef?: string;
  readonly recordedAt: Date;
}

export interface AggregateInsightReport {
  readonly reportId: string;
  readonly seekerId: string;
  readonly windowStart: Date;
  readonly windowEnd: Date;
  readonly aggregateCounts: Readonly<Record<string, number>>;
  readonly aggregateScores: Readonly<Record<string, number>>;
  readonly thresholdCheckIn?: string;
  readonly dataSourceRefs: readonly string[];
  readonly generatedAt: Date;
}

export type DemographicConsentState =
  | "not-asked"
  | "consented"
  | "declined"
  | "withdrawn"
  | "disabled-counsel"
  | "disabled-jurisdiction";

export interface DemographicConsentPosture {
  readonly seekerId: string;
  readonly consentState: DemographicConsentState;
  readonly collectionEnabled: boolean;
  readonly consentVersion?: string;
  readonly jurisdictionPosture?: string;
  readonly segregatedDataRef?: string;
  readonly reasonCode?: string;
  readonly decidedAt: Date;
  readonly withdrawnAt?: Date;
}

export interface SeekerFlowAuditEvent {
  readonly auditEventId: string;
  readonly correlationId: string;
  readonly eventType:
    | "onboarding"
    | "profile"
    | "jurisdiction"
    | "threshold"
    | "match-notification"
    | "dossier-review"
    | "control"
    | "aggregate-insight"
    | "demographic-consent"
    | "refusal"
    | "duplicate"
    | "delivery-outcome";
  readonly principalId: string;
  readonly ticketId?: string;
  readonly channel: SeekerFlowChannel;
  readonly decision: FlowDecision;
  readonly reasonCode: string;
  readonly payloadRef?: string;
  readonly occurredAt: Date;
}

export interface SeekerOutboundPrompt {
  readonly promptId: string;
  readonly seekerId: string;
  readonly channel: SeekerFlowChannel;
  readonly promptKind:
    | "ask-profile"
    | "ask-jurisdiction"
    | "ask-threshold"
    | "confirm-change"
    | "match-notification"
    | "dossier-review"
    | "control-confirmation"
    | "aggregate-insight"
    | "demographic-consent"
    | "refusal";
  readonly disclosureClass:
    | "seeker-approved"
    | "aggregate-approved"
    | "refusal-safe"
    | "non-collection-explanation";
  readonly text: string;
  readonly actionIds: readonly string[];
  readonly correlationId: string;
}

export interface FlowResult {
  readonly decision: FlowDecision;
  readonly reasonCode: string;
  readonly prompts: readonly SeekerOutboundPrompt[];
  readonly auditEvents: readonly SeekerFlowAuditEvent[];
}
