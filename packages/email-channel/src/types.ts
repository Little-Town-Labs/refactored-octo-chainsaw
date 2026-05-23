import type {
  ChannelMessage,
  ChannelRefusal,
  DeliveryOutcome,
  JsonObject,
} from "@spyglass/channels-core";

export const EMAIL_EVENT_KINDS = [
  "inbound_message",
  "delivery",
  "deferred",
  "bounce",
  "complaint",
  "suppression",
  "unsupported",
] as const;
export type EmailEventKind = (typeof EMAIL_EVENT_KINDS)[number];

export type EmailProvider = "resend" | "postmark" | "ses" | "fixture";

export interface EmailAddressRef {
  readonly email: string;
  readonly name?: string;
  readonly mailbox_hash?: string;
}

export interface EmailReferenceHeaders {
  readonly message_id?: string;
  readonly in_reply_to?: string;
  readonly references?: readonly string[];
}

export interface EmailAttachmentRef {
  readonly provider_ref: string;
  readonly filename: string;
  readonly content_type?: string;
  readonly size_bytes?: number;
}

export interface EmailSpamSignals extends JsonObject {
  readonly provider_score?: number;
  readonly provider_status?: string;
  readonly spoof_risk?: boolean;
}

export interface EmailProviderEvent extends JsonObject {
  readonly provider: EmailProvider;
  readonly event_kind: EmailEventKind;
  readonly provider_event_id: string;
  readonly message_id?: string;
  readonly from?: EmailAddressRef;
  readonly to?: readonly EmailAddressRef[];
  readonly reply_alias?: string;
  readonly reference_headers?: EmailReferenceHeaders;
  readonly subject?: string;
  readonly text_body?: string;
  readonly has_html?: boolean;
  readonly attachment_refs?: readonly EmailAttachmentRef[];
  readonly spam_signals?: EmailSpamSignals;
  readonly occurred_at?: string | Date;
  readonly received_at: string | Date;
  readonly native_ref?: string;
  readonly retry_after?: string | Date;
  readonly error_code?: number | string;
  readonly description?: string;
}

export interface BoundedEmailEvent {
  readonly provider: EmailProvider;
  readonly event_kind: EmailEventKind;
  readonly provider_event_id: string;
  readonly message_id?: string;
  readonly from_ref?: string;
  readonly to_refs: readonly string[];
  readonly reply_alias?: string;
  readonly reference_headers: EmailReferenceHeaders;
  readonly subject?: string;
  readonly text_body?: string;
  readonly has_html: boolean;
  readonly attachment_refs: readonly string[];
  readonly spam_signals: EmailSpamSignals;
  readonly occurred_at: Date;
  readonly received_at: Date;
  readonly native_ref?: string;
  readonly retry_after?: Date;
  readonly metadata: JsonObject;
}

export type EmailLinkStatus =
  | "verified"
  | "pending_verification"
  | "disabled"
  | "unsubscribed"
  | "suppressed"
  | "unknown";

export interface EmailChannelLink {
  readonly link_id?: string;
  readonly participant_id?: string;
  readonly principal_id?: string;
  readonly email_address?: string;
  readonly status: EmailLinkStatus;
  readonly pending_challenge_id?: string;
  readonly allowed_thread_ids?: readonly string[];
  readonly seeker_ticket_id?: string;
  readonly match_ticket_id?: string;
}

export interface EmailThread {
  readonly thread_id: string;
  readonly reply_alias?: string;
  readonly native_thread_ref?: string;
  readonly seeker_ticket_id?: string;
  readonly match_ticket_id?: string;
  readonly state: "open" | "awaiting_verification" | "paused" | "closed" | "errored";
}

export interface EmailLinkLookup {
  findLink(event: BoundedEmailEvent): EmailChannelLink;
  findThread(event: BoundedEmailEvent, link: EmailChannelLink): EmailThread | undefined;
}

export interface EmailIdempotencyRecord {
  readonly idempotency_key: string;
  readonly provider_event_id: string;
  readonly first_seen_at: Date;
  readonly status: "accepted" | "duplicate_suppressed" | "refused";
  readonly message_ref?: string;
  readonly audit_event_id?: string;
}

export interface EmailDuplicateStore {
  claim(key: string, event: BoundedEmailEvent): EmailIdempotencyRecord;
  complete(key: string, record: Omit<EmailIdempotencyRecord, "idempotency_key">): void;
}

export type EmailNormalizeResult =
  | { readonly ok: true; readonly message: ChannelMessage }
  | {
      readonly ok: false;
      readonly refusal: ChannelRefusal;
      readonly duplicate?: boolean;
      readonly delivery?: DeliveryOutcome;
    };

export interface EmailOutboundPayload extends JsonObject {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly source_message_id: string;
  readonly thread_id: string;
  readonly reply_alias?: string;
  readonly html?: string;
  readonly headers?: EmailReferenceHeaders;
  readonly correlation_id?: string;
  readonly fallback_used?: boolean;
}

export type EmailRenderResult =
  | {
      readonly ok: true;
      readonly native_payload: EmailOutboundPayload;
      readonly message: ChannelMessage;
    }
  | { readonly ok: false; readonly refusal: ChannelRefusal };

export type EmailProviderResult =
  | {
      readonly kind: "accepted" | "delivered" | "deferred" | "bounce" | "complaint" | "suppression";
      readonly native_ref?: string;
      readonly retry_after?: Date;
      readonly provider_metadata?: JsonObject;
    }
  | {
      readonly kind: "throttled" | "retryable_failure" | "terminal_failure";
      readonly native_ref?: string;
      readonly retry_after?: Date;
      readonly error_code?: number | string;
      readonly description?: string;
    };

export interface EmailAdapterOptions {
  readonly link_lookup: EmailLinkLookup;
  readonly duplicate_store: EmailDuplicateStore;
  readonly max_subject_chars?: number;
  readonly max_body_chars?: number;
  readonly max_attachment_bytes?: number;
  readonly now?: () => Date;
}

export type EmailDeliveryOutcome = DeliveryOutcome;
