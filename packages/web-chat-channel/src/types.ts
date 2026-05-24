import type {
  ChannelMessage,
  ChannelRefusal,
  DeliveryOutcome,
  JsonObject,
} from "@spyglass/channels-core";

export const WEB_CHAT_EVENT_KINDS = [
  "text",
  "action",
  "verification",
  "acknowledgement",
  "status",
  "attachment_reference",
] as const;
export type WebChatEventKind = (typeof WEB_CHAT_EVENT_KINDS)[number];

export const WEB_CHAT_LINK_STATUSES = [
  "verified",
  "pending_verification",
  "disabled",
  "paused",
  "withdrawn",
  "unknown",
] as const;
export type WebChatLinkStatus = (typeof WEB_CHAT_LINK_STATUSES)[number];

export const WEB_CHAT_DELIVERY_STATUSES = [
  "rendered",
  "displayed",
  "acknowledged",
  "retryable_failure",
  "terminal_failure",
  "expired",
  "cancelled",
  "refused",
  "unsupported",
  "duplicate",
] as const;
export type WebChatDeliveryStatus = (typeof WEB_CHAT_DELIVERY_STATUSES)[number];

export interface WebChatSessionBinding extends JsonObject {
  readonly session_id?: string;
  readonly principal_id?: string;
  readonly issued_at?: string | Date;
  readonly expires_at?: string | Date;
  readonly assurance?: string;
  readonly native_ref?: string;
}

export interface WebChatClientContext extends JsonObject {
  readonly locale?: string;
  readonly route?: string;
  readonly referrer?: string;
  readonly client_timestamp?: string | Date;
  readonly user_agent_hint?: string;
}

export interface WebChatClientEvent extends JsonObject {
  readonly event_id: string;
  readonly event_kind: WebChatEventKind;
  readonly thread_id: string;
  readonly session?: WebChatSessionBinding;
  readonly action_id?: string;
  readonly action_expires_at?: string | Date;
  readonly text?: string;
  readonly attachment_ref?: string;
  readonly status?: WebChatDeliveryStatus;
  readonly client_context?: WebChatClientContext;
  readonly received_at: string | Date;
  readonly occurred_at?: string | Date;
  readonly native_ref?: string;
}

export interface BoundedWebChatEvent {
  readonly event_id: string;
  readonly event_kind: WebChatEventKind;
  readonly thread_id: string;
  readonly session?: WebChatSessionBinding;
  readonly action_id?: string;
  readonly action_expires_at?: Date;
  readonly text?: string;
  readonly attachment_ref?: string;
  readonly status?: WebChatDeliveryStatus;
  readonly client_context: WebChatClientContext;
  readonly occurred_at: Date;
  readonly received_at: Date;
  readonly native_ref?: string;
  readonly metadata: JsonObject;
}

export interface WebChatChannelLink {
  readonly link_id?: string;
  readonly participant_id?: string;
  readonly principal_id?: string;
  readonly channel_account_id?: string;
  readonly status: WebChatLinkStatus;
  readonly pending_challenge_id?: string;
  readonly allowed_thread_ids?: readonly string[];
  readonly seeker_ticket_id?: string;
  readonly match_ticket_id?: string;
}

export interface WebChatThread {
  readonly thread_id: string;
  readonly native_thread_ref?: string;
  readonly seeker_ticket_id?: string;
  readonly match_ticket_id?: string;
  readonly state: "open" | "awaiting_verification" | "paused" | "closed" | "errored";
}

export interface WebChatLinkLookup {
  findLink(event: BoundedWebChatEvent): WebChatChannelLink;
  findThread(event: BoundedWebChatEvent, link: WebChatChannelLink): WebChatThread | undefined;
}

export interface WebChatIdempotencyRecord {
  readonly idempotency_key: string;
  readonly event_id: string;
  readonly first_seen_at: Date;
  readonly status: "accepted" | "duplicate_suppressed" | "refused";
  readonly message_ref?: string;
  readonly audit_event_id?: string;
}

export interface WebChatDuplicateStore {
  claim(key: string, event: BoundedWebChatEvent): WebChatIdempotencyRecord;
  complete(key: string, record: Omit<WebChatIdempotencyRecord, "idempotency_key">): void;
}

export type WebChatNormalizeResult =
  | { readonly ok: true; readonly message: ChannelMessage }
  | {
      readonly ok: false;
      readonly refusal: ChannelRefusal;
      readonly duplicate?: boolean;
      readonly delivery?: DeliveryOutcome;
    };

export interface WebChatActionModel extends JsonObject {
  readonly action_id: string;
  readonly label: string;
  readonly enabled: boolean;
  readonly activation: "button" | "link" | "submit";
  readonly disabled_reason?: string;
}

export interface WebChatAccessibilityModel extends JsonObject {
  readonly focus_order: readonly string[];
  readonly accessible_names: Readonly<Record<string, string>>;
  readonly keyboard_activation: Readonly<Record<string, readonly ("enter" | "space")[]>>;
  readonly status_announcement: "none" | "polite" | "assertive";
  readonly reduced_motion_safe: boolean;
  readonly error_posture?: "inline_and_announced" | "refused_before_render" | "none";
}

export interface WebChatRenderModel extends JsonObject {
  readonly render_id: string;
  readonly thread_id: string;
  readonly source_message_id: string;
  readonly message_parts: readonly {
    readonly part_id: string;
    readonly kind: "text" | "status" | "fallback" | "rich_card_summary" | "error";
    readonly text: string;
    readonly disclosure_posture: "approved_projection" | "system_generated";
  }[];
  readonly actions: readonly WebChatActionModel[];
  readonly accessibility: WebChatAccessibilityModel;
  readonly native_refs?: JsonObject;
  readonly fallback_used?: boolean;
}

export type WebChatRenderResult =
  | {
      readonly ok: true;
      readonly native_payload: WebChatRenderModel;
      readonly message: ChannelMessage;
    }
  | { readonly ok: false; readonly refusal: ChannelRefusal };

export interface WebChatStatusEvent extends JsonObject {
  readonly message_id?: string;
  readonly render_id?: string;
  readonly status?: WebChatDeliveryStatus;
  readonly native_ref?: string;
  readonly retry_after?: string | Date;
  readonly reason?: string;
}

export interface WebChatAdapterOptions {
  readonly link_lookup: WebChatLinkLookup;
  readonly duplicate_store: WebChatDuplicateStore;
  readonly max_text_chars?: number;
  readonly max_actions?: number;
  readonly now?: () => Date;
}

export type WebChatDeliveryOutcome = DeliveryOutcome;
