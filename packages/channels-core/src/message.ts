export const CHANNEL_KINDS = ["telegram", "email", "web_chat", "a2a_delegate"] as const;
export type ChannelKind = (typeof CHANNEL_KINDS)[number];

export const CHANNEL_DIRECTIONS = ["inbound", "outbound"] as const;
export type ChannelDirection = (typeof CHANNEL_DIRECTIONS)[number];

export const CHANNEL_LINK_STATUSES = [
  "verified",
  "pending_verification",
  "disabled",
  "unknown",
] as const;
export type ChannelLinkStatus = (typeof CHANNEL_LINK_STATUSES)[number];

export const CHANNEL_PARTICIPANT_ROLES = ["seeker", "operator", "system"] as const;
export type ChannelParticipantRole = (typeof CHANNEL_PARTICIPANT_ROLES)[number];

export const CHANNEL_THREAD_STATES = [
  "open",
  "awaiting_verification",
  "paused",
  "closed",
  "errored",
] as const;
export type ChannelThreadState = (typeof CHANNEL_THREAD_STATES)[number];

export const CONTENT_PART_KINDS = [
  "text",
  "command",
  "attachment_ref",
  "rich_card",
  "system_notice",
] as const;
export type ContentPartKind = (typeof CONTENT_PART_KINDS)[number];

export const CONTENT_CLASSIFICATIONS = [
  "untrusted_user_input",
  "approved_projection",
  "system_generated",
  "provider_metadata",
] as const;
export type ContentClassification = (typeof CONTENT_CLASSIFICATIONS)[number];

export const DISCLOSURE_POSTURES = [
  "untrusted_inbound",
  "approved_projection",
  "system_notice",
  "refused",
] as const;
export type DisclosurePosture = (typeof DISCLOSURE_POSTURES)[number];

export type JsonObject = Record<string, unknown>;

export interface ChannelDescriptor {
  readonly kind: ChannelKind;
  readonly version: string;
  readonly enabled: boolean;
}

export interface ChannelParticipant {
  readonly participant_id?: string;
  readonly principal_id?: string;
  readonly channel_account_id?: string;
  readonly link_status: ChannelLinkStatus;
  readonly role: ChannelParticipantRole;
}

export interface ChannelThread {
  readonly thread_id: string;
  readonly native_thread_ref?: string;
  readonly seeker_ticket_id?: string;
  readonly match_ticket_id?: string;
  readonly state: ChannelThreadState;
}

export interface RichCard {
  readonly title: string;
  readonly body: string;
  readonly actions?: readonly string[];
}

export interface ContentPart {
  readonly kind: ContentPartKind;
  readonly classification: ContentClassification;
  readonly text?: string;
  readonly command?: string;
  readonly attachment_ref?: string;
  readonly rich_card?: RichCard;
}

export interface ChannelIntent {
  readonly family: string;
  readonly supported: boolean;
  readonly confidence?: number;
}

export interface ChannelDisclosure {
  readonly posture: DisclosurePosture;
  readonly projection_ref?: string;
  readonly privacy_ruleset_ref?: string;
}

export interface ChannelAuditRef {
  readonly correlation_id: string;
  readonly source: string;
  readonly event_id?: string;
}

export interface ChannelMessage {
  readonly message_id: string;
  readonly direction: ChannelDirection;
  readonly channel: ChannelDescriptor;
  readonly participant: ChannelParticipant;
  readonly thread: ChannelThread;
  readonly idempotency_key: string;
  readonly occurred_at: Date;
  readonly received_at?: Date;
  readonly content: readonly ContentPart[];
  readonly intent: ChannelIntent;
  readonly disclosure: ChannelDisclosure;
  readonly audit: ChannelAuditRef;
  readonly delivery?: unknown;
  readonly metadata?: JsonObject;
}

export type NewChannelMessage = Omit<ChannelMessage, "message_id"> & {
  readonly message_id?: string;
};

export const createChannelMessage = (message: NewChannelMessage): ChannelMessage => {
  const canonical: ChannelMessage = {
    ...message,
    message_id: message.message_id ?? buildMessageId(message),
  };
  validateChannelMessage(canonical);
  return canonical;
};

export const buildMessageId = (message: Omit<ChannelMessage, "message_id">): string =>
  [
    "chanmsg",
    message.direction,
    message.channel.kind,
    sanitizeIdPart(message.thread.thread_id),
    sanitizeIdPart(message.idempotency_key),
  ].join("_");

export const validateChannelMessage = (message: ChannelMessage): ChannelMessage => {
  assertNonEmpty(message.message_id, "message_id");
  assertNonEmpty(message.channel.version, "channel.version");
  assertNonEmpty(message.thread.thread_id, "thread.thread_id");
  assertNonEmpty(message.idempotency_key, "idempotency_key");
  assertNonEmpty(message.audit.correlation_id, "audit.correlation_id");
  assertNonEmpty(message.audit.source, "audit.source");

  if (message.content.length === 0) {
    throw new Error("ChannelMessage.content must contain at least one part");
  }

  if (message.direction === "inbound" && message.disclosure.posture !== "untrusted_inbound") {
    throw new Error("Inbound channel messages must use untrusted_inbound disclosure posture");
  }

  if (
    message.direction === "outbound" &&
    message.disclosure.posture === "approved_projection" &&
    !message.disclosure.projection_ref
  ) {
    throw new Error("Outbound approved projections must include disclosure.projection_ref");
  }

  return message;
};

export const isInboundMessage = (message: ChannelMessage): boolean =>
  message.direction === "inbound";

export const isOutboundMessage = (message: ChannelMessage): boolean =>
  message.direction === "outbound";

const assertNonEmpty = (value: string, field: string): void => {
  if (value.trim().length === 0) {
    throw new Error(`ChannelMessage.${field} must be non-empty`);
  }
};

const sanitizeIdPart = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 96);
