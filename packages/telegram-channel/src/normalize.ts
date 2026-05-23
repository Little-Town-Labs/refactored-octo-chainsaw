import {
  commandPart,
  createChannelMessage,
  malformedPayload,
  overSizePayload,
  refusal,
  textPart,
  unauthenticatedLink,
  unauthorizedParticipant,
  unsupportedIntent,
  type ChannelIntent,
  type ChannelRefusal,
  type ContentPart,
} from "@spyglass/channels-core";

import { telegramAuditEvent } from "./audit.js";
import { TELEGRAM_MAX_TEXT_CHARS } from "./capabilities.js";
import { buildTelegramIdempotencyKey } from "./idempotency.js";
import { isPendingTelegramLink, isVerifiedTelegramLink } from "./links.js";
import type {
  BoundedTelegramUpdate,
  TelegramAdapterOptions,
  TelegramChannelLink,
  TelegramNativeUpdate,
  TelegramNormalizeResult,
} from "./types.js";

export const boundTelegramUpdate = (
  update: TelegramNativeUpdate,
  maxTextChars = TELEGRAM_MAX_TEXT_CHARS,
): BoundedTelegramUpdate | ChannelRefusal => {
  if (!Number.isInteger(update.update_id) || update.update_id < 0) {
    return malformedPayload();
  }

  const message = update.message ?? update.edited_message ?? update.callback_query?.message;
  const callback = update.callback_query;
  const text = message?.text ?? message?.caption ?? callback?.data;
  const kind = update.message
    ? "message"
    : update.edited_message
      ? "edited_message"
      : update.callback_query
        ? "callback_query"
        : "unsupported";

  if (kind === "unsupported") {
    return unsupportedIntent();
  }

  if (!message && !callback) {
    return malformedPayload();
  }

  if (text && text.length > maxTextChars) {
    return overSizePayload();
  }

  const sender = message?.from ?? callback?.from;
  const chat = message?.chat ?? callback?.message?.chat;
  const date = message?.date ? new Date(message.date * 1000) : new Date();

  return {
    update_id: update.update_id,
    kind,
    occurred_at: date,
    attachment_refs: extractAttachmentRefs(message),
    metadata: {
      has_callback: Boolean(callback),
      chat_type: chat?.type,
      username: sender?.username,
    },
    ...(message?.message_id ? { message_ref: `telegram-message:${message.message_id}` } : {}),
    ...(sender?.id ? { sender_ref: `telegram-user:${sender.id}` } : {}),
    ...(chat?.id ? { chat_ref: `telegram-chat:${chat.id}` } : {}),
    ...(text ? { text } : {}),
  };
};

export const normalizeTelegramInbound = (
  update: TelegramNativeUpdate,
  options: TelegramAdapterOptions,
): TelegramNormalizeResult => {
  const bounded = boundTelegramUpdate(update, options.max_text_chars);
  if ("reason_code" in bounded) {
    return { ok: false, refusal: bounded };
  }

  const idempotencyKey = buildTelegramIdempotencyKey(bounded);
  const claimed = options.duplicate_store.claim(idempotencyKey, bounded);
  if (claimed.status === "duplicate_suppressed") {
    return {
      ok: false,
      duplicate: true,
      refusal: refusal("duplicate_suppressed", "Telegram update was already processed"),
    };
  }

  const link = options.link_lookup.findLink(bounded);
  const linkRefusal = refusalForLink(link);
  if (linkRefusal) {
    options.duplicate_store.complete(idempotencyKey, {
      telegram_update_id: bounded.update_id,
      first_seen_at: claimed.first_seen_at,
      status: "refused",
      audit_event_id: telegramAuditEvent({
        event_type: "channel.refused",
        correlation_id: correlationFor(bounded),
        update: bounded,
        reason_code: linkRefusal.reason_code,
      }).event_id,
    });
    return { ok: false, refusal: linkRefusal };
  }

  if (!bounded.text && bounded.attachment_refs.length === 0) {
    return { ok: false, refusal: malformedPayload() };
  }

  const intent = classifyTelegramIntent(bounded.text ?? "");
  const content = contentPartsFor(bounded);
  const message = createChannelMessage({
    direction: "inbound",
    channel: { kind: "telegram", version: "1.0.0", enabled: true },
    participant: {
      link_status: link.status,
      role: "seeker",
      ...(link.participant_id ? { participant_id: link.participant_id } : {}),
      ...(link.principal_id ? { principal_id: link.principal_id } : {}),
      ...((link.telegram_account_id ?? bounded.sender_ref)
        ? { channel_account_id: link.telegram_account_id ?? bounded.sender_ref }
        : {}),
    },
    thread: {
      thread_id:
        link.thread_id ?? `telegram-thread-${sanitizeId(bounded.chat_ref ?? idempotencyKey)}`,
      state: link.status === "pending_verification" ? "awaiting_verification" : "open",
      ...(bounded.chat_ref ? { native_thread_ref: bounded.chat_ref } : {}),
      ...(link.seeker_ticket_id ? { seeker_ticket_id: link.seeker_ticket_id } : {}),
      ...(link.match_ticket_id ? { match_ticket_id: link.match_ticket_id } : {}),
    },
    idempotency_key: idempotencyKey,
    occurred_at: bounded.occurred_at,
    received_at: options.now?.() ?? new Date(),
    content,
    intent,
    disclosure: { posture: "untrusted_inbound" },
    audit: { correlation_id: correlationFor(bounded), source: "telegram-webhook" },
    metadata: bounded.metadata,
  });

  const auditEvent = telegramAuditEvent({
    event_type: "channel.normalized",
    correlation_id: message.audit.correlation_id,
    update: bounded,
    message,
  });

  options.duplicate_store.complete(idempotencyKey, {
    telegram_update_id: bounded.update_id,
    first_seen_at: claimed.first_seen_at,
    status: "accepted",
    message_id: message.message_id,
    audit_event_id: auditEvent.event_id,
  });

  return { ok: true, message };
};

export const classifyTelegramIntent = (text: string): ChannelIntent => {
  const normalized = text.trim().toLowerCase();
  if (/browse|show all jobs|list jobs/.test(normalized)) {
    return { family: "browse_all_jobs", supported: false, confidence: 0.9 };
  }
  if (/match tickets|hidden run|run state/.test(normalized)) {
    return { family: "inspect_hidden_run_state", supported: false, confidence: 0.9 };
  }
  if (/override|parley/.test(normalized)) {
    return { family: "override_parley_run", supported: false, confidence: 0.9 };
  }
  if (/^\/?(start|onboard)/.test(normalized)) {
    return { family: "onboarding", supported: true, confidence: 0.9 };
  }
  if (/threshold/.test(normalized)) {
    return { family: "threshold_tuning", supported: true, confidence: 0.85 };
  }
  if (/pause/.test(normalized)) {
    return { family: "pause", supported: true, confidence: 0.85 };
  }
  if (/resume/.test(normalized)) {
    return { family: "resume", supported: true, confidence: 0.85 };
  }
  if (/withdraw/.test(normalized)) {
    return { family: "withdraw", supported: true, confidence: 0.85 };
  }
  if (/review|match/.test(normalized)) {
    return { family: "dossier_review_response", supported: true, confidence: 0.75 };
  }
  if (/demographic|opt/.test(normalized)) {
    return { family: "demographic_opt_in_response", supported: true, confidence: 0.75 };
  }
  return { family: "fallback_free_text", supported: true, confidence: 0.5 };
};

const refusalForLink = (link: TelegramChannelLink): ChannelRefusal | undefined => {
  if (isVerifiedTelegramLink(link) || isPendingTelegramLink(link)) {
    return undefined;
  }
  if (link.status === "disabled") {
    return unauthorizedParticipant();
  }
  return unauthenticatedLink();
};

const contentPartsFor = (update: BoundedTelegramUpdate): readonly ContentPart[] => {
  const parts: ContentPart[] = [];
  if (update.text) {
    const command = update.text.trim().match(/^\/([a-zA-Z0-9_]+)/)?.[1];
    parts.push(command ? commandPart(command) : textPart(update.text));
  }
  for (const attachmentRef of update.attachment_refs) {
    parts.push({
      kind: "attachment_ref",
      attachment_ref: attachmentRef,
      classification: "untrusted_user_input",
    });
  }
  return parts;
};

const extractAttachmentRefs = (
  message: TelegramNativeUpdate["message"] | undefined,
): readonly string[] => {
  const refs: string[] = [];
  if (message?.document?.file_id) {
    refs.push(`telegram-file:${message.document.file_id}`);
  }
  const photo = message?.photo?.at(-1);
  if (photo?.file_id) {
    refs.push(`telegram-file:${photo.file_id}`);
  }
  return refs;
};

const correlationFor = (update: BoundedTelegramUpdate): string =>
  `corr-telegram-${update.update_id}`;

const sanitizeId = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
