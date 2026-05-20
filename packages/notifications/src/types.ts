export const NOTICE_CATEGORIES = [
  "advance_aedt_notice",
  "outcome_transparency",
  "inconclusive_outcome",
  "policy_update",
] as const;
export type NoticeCategory = (typeof NOTICE_CATEGORIES)[number];

export const NOTICE_TEMPLATE_STATUSES = ["draft", "published", "retired", "superseded"] as const;
export type NoticeTemplateStatus = (typeof NOTICE_TEMPLATE_STATUSES)[number];

export const NOTIFICATION_ARTIFACT_STATUSES = [
  "ready",
  "blocked",
  "superseded",
  "delivered_intent_created",
] as const;
export type NotificationArtifactStatus = (typeof NOTIFICATION_ARTIFACT_STATUSES)[number];

export const TIMING_BASES = ["none", "advance_notice", "outcome_notice", "policy_update"] as const;
export type TimingBasis = (typeof TIMING_BASES)[number];

export const NOTIFICATION_GATE_DECISIONS = ["allowed", "refused"] as const;
export type NotificationGateDecision = (typeof NOTIFICATION_GATE_DECISIONS)[number];

export const NOTIFICATION_GATE_REASON_CODES = [
  "notice_ready",
  "missing_artifact",
  "artifact_blocked",
  "template_not_published",
  "template_superseded",
  "not_yet_eligible",
  "missing_recipient",
  "invalid_payload",
  "policy_blocked",
] as const;
export type NotificationGateReasonCode = (typeof NOTIFICATION_GATE_REASON_CODES)[number];

export const CHANNEL_INTENTS = ["email", "telegram", "web", "a2a", "unspecified"] as const;
export type ChannelIntent = (typeof CHANNEL_INTENTS)[number];

export const DELIVERY_COMMAND_STATUSES = [
  "pending",
  "claimed",
  "sent",
  "cancelled",
  "failed",
] as const;
export type DeliveryCommandStatus = (typeof DELIVERY_COMMAND_STATUSES)[number];

export const NOTIFICATION_REASON_CODES = [
  "artifact_ready",
  "inconclusive_notice",
  "missing_required_ref",
  "invalid_payload",
] as const;
export type NotificationReasonCode = (typeof NOTIFICATION_REASON_CODES)[number];

export type JsonObject = Record<string, unknown>;

export interface PolicyRef {
  readonly policy_id: string;
  readonly version: string;
}

export interface NoticeTemplateVersion {
  readonly notice_template_version_id: string;
  readonly template_id: string;
  readonly version: string;
  readonly status: NoticeTemplateStatus;
  readonly notice_category: NoticeCategory;
  readonly jurisdiction_scope: readonly string[];
  readonly content_ref: string;
  readonly content_hash: string;
  readonly effective_from: Date;
  readonly effective_until: Date | null;
  readonly published_at: Date | null;
  readonly audit_event_id: string | null;
  readonly created_at: Date;
}

export type NewNoticeTemplateVersion = Omit<
  NoticeTemplateVersion,
  "notice_template_version_id" | "created_at"
> & {
  readonly notice_template_version_id?: string;
  readonly created_at?: Date;
};

export interface NoticeTimingEvidence {
  readonly basis: TimingBasis;
  readonly produced_at: Date;
  readonly required_notice_by: Date | null;
  readonly earliest_delivery_at: Date | null;
  readonly business_days_required: number;
  readonly calendar_ref: string | null;
}

export interface CandidateNotificationArtifact {
  readonly artifact_id: string;
  readonly match_id: string;
  readonly run_id: string;
  readonly dossier_id: string;
  readonly candidate_principal_id: string;
  readonly notice_category: NoticeCategory;
  readonly status: NotificationArtifactStatus;
  readonly template_id: string;
  readonly template_version: string;
  readonly jurisdiction_refs: readonly string[];
  readonly policy_ref: PolicyRef;
  readonly timing: NoticeTimingEvidence;
  readonly content_refs: readonly string[];
  readonly content_hash: string;
  readonly reason_code: NotificationReasonCode;
  readonly audit_event_id: string | null;
  readonly created_at: Date;
}

export type NewCandidateNotificationArtifact = Omit<
  CandidateNotificationArtifact,
  "artifact_id" | "created_at"
> & {
  readonly artifact_id?: string;
  readonly created_at?: Date;
};

export interface NotificationArtifactInput {
  readonly match_id: string;
  readonly run_id: string;
  readonly dossier_id: string;
  readonly candidate_principal_id: string | null;
  readonly notice_category: NoticeCategory;
  readonly template: NoticeTemplateVersion;
  readonly jurisdiction_refs: readonly string[];
  readonly policy_ref: PolicyRef;
  readonly timing: NoticeTimingEvidence;
  readonly content_refs: readonly string[];
  readonly reason_code?: NotificationReasonCode;
  readonly audit_event_id?: string | null;
}

export interface NotificationGateEvaluation {
  readonly gate_event_id: string;
  readonly artifact_id: string | null;
  readonly match_id: string;
  readonly decision: NotificationGateDecision;
  readonly reason_code: NotificationGateReasonCode;
  readonly evaluated_at: Date;
  readonly policy_ref: PolicyRef;
  readonly audit_event_id: string | null;
  readonly created_at: Date;
}

export type NewNotificationGateEvaluation = Omit<
  NotificationGateEvaluation,
  "gate_event_id" | "created_at"
> & {
  readonly gate_event_id?: string;
  readonly created_at?: Date;
};

export interface DeliveryWindow {
  readonly earliest_delivery_at: Date | null;
  readonly latest_delivery_at: Date | null;
}

export interface NotificationDeliveryCommand {
  readonly command_id: string;
  readonly artifact_id: string;
  readonly candidate_principal_id: string;
  readonly notice_category: NoticeCategory;
  readonly channel_intent: ChannelIntent;
  readonly idempotency_key: string;
  readonly content_hash: string;
  readonly delivery_window: DeliveryWindow;
  readonly status: DeliveryCommandStatus;
  readonly audit_event_id: string | null;
  readonly created_at: Date;
}

export type NewNotificationDeliveryCommand = Omit<
  NotificationDeliveryCommand,
  "command_id" | "created_at"
> & {
  readonly command_id?: string;
  readonly created_at?: Date;
};

export interface NotificationPrincipal {
  readonly principal_id: string;
  readonly scopes: readonly string[];
}
