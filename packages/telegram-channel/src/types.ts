import type {
  ChannelMessage,
  ChannelRefusal,
  DeliveryOutcome,
  JsonObject,
} from "@spyglass/channels-core";

export const TELEGRAM_UPDATE_KINDS = [
  "message",
  "edited_message",
  "callback_query",
  "unsupported",
] as const;
export type TelegramUpdateKind = (typeof TELEGRAM_UPDATE_KINDS)[number];

export interface TelegramUserRef {
  readonly id: number;
  readonly is_bot?: boolean;
  readonly username?: string;
}

export interface TelegramChatRef {
  readonly id: number;
  readonly type?: string;
}

export interface TelegramMessageRef {
  readonly message_id: number;
  readonly date?: number;
  readonly text?: string;
  readonly caption?: string;
  readonly from?: TelegramUserRef;
  readonly chat?: TelegramChatRef;
  readonly document?: { readonly file_id?: string };
  readonly photo?: readonly { readonly file_id?: string }[];
}

export interface TelegramCallbackQueryRef {
  readonly id: string;
  readonly data?: string;
  readonly from?: TelegramUserRef;
  readonly message?: TelegramMessageRef;
}

export interface TelegramNativeUpdate extends JsonObject {
  readonly update_id: number;
  readonly message?: TelegramMessageRef;
  readonly edited_message?: TelegramMessageRef;
  readonly callback_query?: TelegramCallbackQueryRef;
}

export interface BoundedTelegramUpdate {
  readonly update_id: number;
  readonly kind: TelegramUpdateKind;
  readonly message_ref?: string;
  readonly sender_ref?: string;
  readonly chat_ref?: string;
  readonly occurred_at: Date;
  readonly text?: string;
  readonly attachment_refs: readonly string[];
  readonly metadata: JsonObject;
}

export type TelegramLinkStatus = "verified" | "pending_verification" | "disabled" | "unknown";

export interface TelegramChannelLink {
  readonly link_id?: string;
  readonly participant_id?: string;
  readonly principal_id?: string;
  readonly telegram_account_id?: string;
  readonly telegram_chat_id?: string;
  readonly status: TelegramLinkStatus;
  readonly pending_challenge_id?: string;
  readonly thread_id?: string;
  readonly seeker_ticket_id?: string;
  readonly match_ticket_id?: string;
}

export interface TelegramLinkLookup {
  findLink(update: BoundedTelegramUpdate): TelegramChannelLink;
}

export interface TelegramIdempotencyRecord {
  readonly idempotency_key: string;
  readonly telegram_update_id: number;
  readonly first_seen_at: Date;
  readonly status: "accepted" | "duplicate_suppressed" | "refused";
  readonly message_id?: string;
  readonly audit_event_id?: string;
}

export interface TelegramDuplicateStore {
  claim(key: string, update: BoundedTelegramUpdate): TelegramIdempotencyRecord;
  complete(key: string, record: Omit<TelegramIdempotencyRecord, "idempotency_key">): void;
}

export type TelegramNormalizeResult =
  | { readonly ok: true; readonly message: ChannelMessage }
  | { readonly ok: false; readonly refusal: ChannelRefusal; readonly duplicate?: boolean };

export interface TelegramOutboundPayload extends JsonObject {
  readonly chat_id: number | string;
  readonly text: string;
  readonly source_message_id: string;
  readonly parse_mode?: "MarkdownV2" | "HTML" | "plain";
  readonly reply_to_message_id?: number;
  readonly correlation_id?: string;
  readonly fallback_used?: boolean;
}

export type TelegramRenderResult =
  | {
      readonly ok: true;
      readonly native_payload: TelegramOutboundPayload;
      readonly message: ChannelMessage;
    }
  | { readonly ok: false; readonly refusal: ChannelRefusal };

export type TelegramProviderResult =
  | { readonly ok: true; readonly message_id?: number | string }
  | {
      readonly ok: false;
      readonly error_code?: number;
      readonly description?: string;
      readonly retry_after_seconds?: number;
      readonly native_ref?: string;
    };

export interface TelegramAdapterOptions {
  readonly link_lookup: TelegramLinkLookup;
  readonly duplicate_store: TelegramDuplicateStore;
  readonly max_text_chars?: number;
  readonly now?: () => Date;
}

export type TelegramDeliveryOutcome = DeliveryOutcome;
