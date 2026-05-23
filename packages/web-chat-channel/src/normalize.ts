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

import { WEB_CHAT_MAX_TEXT_CHARS } from "./capabilities.js";
import { mapWebChatDeliveryStatus } from "./delivery.js";
import { buildWebChatIdempotencyKey } from "./idempotency.js";
import {
  ensureThreadAllowed,
  isBlockedWebChatLink,
  isPendingWebChatLink,
  isVerifiedWebChatLink,
} from "./links.js";
import {
  boundSessionRef,
  parseDate,
  sanitizeNativeRef,
  validateAuthenticatedSession,
} from "./session.js";
import type {
  BoundedWebChatEvent,
  WebChatAdapterOptions,
  WebChatChannelLink,
  WebChatClientEvent,
  WebChatNormalizeResult,
} from "./types.js";

export const boundWebChatEvent = (
  event: WebChatClientEvent,
  maxTextChars = WEB_CHAT_MAX_TEXT_CHARS,
): BoundedWebChatEvent | ChannelRefusal => {
  if (!event.event_id || !event.event_kind || !event.thread_id || !event.received_at) {
    return malformedPayload();
  }
  if (event.text && event.text.length > maxTextChars) {
    return overSizePayload();
  }

  const occurredAt = parseDate(event.occurred_at) ?? parseDate(event.received_at);
  const receivedAt = parseDate(event.received_at);
  if (!occurredAt || !receivedAt) {
    return malformedPayload();
  }
  const session = boundSessionRef(event.session);

  return {
    event_id: sanitizeNativeRef(event.event_id),
    event_kind: event.event_kind,
    thread_id: sanitizeNativeRef(event.thread_id),
    client_context: boundClientContext(event.client_context),
    occurred_at: occurredAt,
    received_at: receivedAt,
    metadata: {
      event_kind: event.event_kind,
      has_session: Boolean(event.session?.session_id),
      route: event.client_context?.route,
      locale: event.client_context?.locale,
    },
    ...(session ? { session } : {}),
    ...(event.action_id ? { action_id: sanitizeNativeRef(event.action_id) } : {}),
    ...(parseDate(event.action_expires_at)
      ? { action_expires_at: parseDate(event.action_expires_at)! }
      : {}),
    ...(event.text ? { text: event.text.trim() } : {}),
    ...(event.attachment_ref ? { attachment_ref: sanitizeNativeRef(event.attachment_ref) } : {}),
    ...(event.status ? { status: event.status } : {}),
    ...(event.native_ref ? { native_ref: sanitizeNativeRef(event.native_ref) } : {}),
  };
};

export const normalizeWebChatInbound = (
  event: WebChatClientEvent,
  options: WebChatAdapterOptions,
): WebChatNormalizeResult => {
  const now = options.now?.() ?? new Date();
  const bounded = boundWebChatEvent(event, options.max_text_chars);
  if ("reason_code" in bounded) {
    return { ok: false, refusal: bounded };
  }

  const idempotencyKey = buildWebChatIdempotencyKey(bounded);
  const claimed = options.duplicate_store.claim(idempotencyKey, bounded);
  if (claimed.status === "duplicate_suppressed") {
    return {
      ok: false,
      duplicate: true,
      refusal: refusal("duplicate_suppressed", "Web-chat event was already processed"),
    };
  }

  if (bounded.event_kind === "status" && bounded.status) {
    const delivery = mapWebChatDeliveryStatus(
      {
        status: bounded.status,
        ...(bounded.action_id ? { message_id: bounded.action_id } : {}),
        ...(bounded.native_ref ? { native_ref: bounded.native_ref } : {}),
      },
      () => now,
    );
    options.duplicate_store.complete(idempotencyKey, {
      event_id: bounded.event_id,
      first_seen_at: claimed.first_seen_at,
      status: "accepted",
    });
    return {
      ok: false,
      delivery,
      refusal: refusal(delivery.reason_code, "Web-chat status event recorded"),
    };
  }

  const link = options.link_lookup.findLink(bounded);
  const linkRefusal = refusalForLinkAndSession(link, bounded, now);
  if (linkRefusal) {
    options.duplicate_store.complete(idempotencyKey, {
      event_id: bounded.event_id,
      first_seen_at: claimed.first_seen_at,
      status: "refused",
    });
    return { ok: false, refusal: linkRefusal };
  }

  const thread = ensureThreadAllowed(
    options.link_lookup.findThread(bounded, link),
    link.allowed_thread_ids,
  );
  if (!thread) {
    return { ok: false, refusal: unauthorizedParticipant() };
  }

  if (bounded.action_expires_at && bounded.action_expires_at.getTime() <= now.getTime()) {
    return {
      ok: false,
      refusal: refusal("provider_rejected", "Web-chat action has expired"),
    };
  }

  const content = contentPartsFor(bounded);
  if (content.length === 0) {
    return { ok: false, refusal: malformedPayload() };
  }

  const intent = classifyWebChatIntent([bounded.text, bounded.action_id].filter(Boolean).join(" "));
  if (!intent.supported) {
    return { ok: false, refusal: unsupportedIntent() };
  }

  const message = createChannelMessage({
    direction: "inbound",
    channel: { kind: "web_chat", version: "1.0.0", enabled: true },
    participant: {
      link_status:
        link.status === "verified" || link.status === "pending_verification"
          ? link.status
          : "disabled",
      role: "seeker",
      ...(link.participant_id ? { participant_id: link.participant_id } : {}),
      ...(link.principal_id ? { principal_id: link.principal_id } : {}),
      ...(link.channel_account_id ? { channel_account_id: link.channel_account_id } : {}),
    },
    thread,
    idempotency_key: idempotencyKey,
    occurred_at: bounded.occurred_at,
    received_at: now,
    content,
    intent,
    disclosure: { posture: "untrusted_inbound" },
    audit: { correlation_id: correlationFor(bounded), source: "web-chat-client" },
    metadata: bounded.metadata,
  });

  options.duplicate_store.complete(idempotencyKey, {
    event_id: bounded.event_id,
    first_seen_at: claimed.first_seen_at,
    status: "accepted",
    message_ref: message.message_id,
  });

  return { ok: true, message };
};

export const classifyWebChatIntent = (text: string): ChannelIntent => {
  const normalized = text.trim().toLowerCase();
  if (/browse|show all jobs|list jobs/.test(normalized)) {
    return { family: "browse_all_jobs", supported: false, confidence: 0.9 };
  }
  if (
    /match tickets|ticket list|hidden run|run state|raw dossier|dossier internals/.test(normalized)
  ) {
    return { family: "inspect_hidden_run_state", supported: false, confidence: 0.9 };
  }
  if (/analytics|recommended jobs|recommend jobs/.test(normalized)) {
    return { family: "analytics_dashboard_request", supported: false, confidence: 0.9 };
  }
  if (/direct message|message employer|message company|counterparty/.test(normalized)) {
    return { family: "direct_counterparty_message", supported: false, confidence: 0.9 };
  }
  if (/override|parley/.test(normalized)) {
    return { family: "override_parley_run", supported: false, confidence: 0.9 };
  }
  if (/verify|confirm|code|resume/.test(normalized)) {
    return { family: "onboarding", supported: true, confidence: 0.8 };
  }
  if (/threshold/.test(normalized)) {
    return { family: "threshold_tuning", supported: true, confidence: 0.85 };
  }
  if (/pause/.test(normalized)) {
    return { family: "pause", supported: true, confidence: 0.85 };
  }
  if (/withdraw/.test(normalized)) {
    return { family: "withdraw", supported: true, confidence: 0.85 };
  }
  if (/ack|ok|got it|review|match/.test(normalized)) {
    return { family: "match_notification_ack", supported: true, confidence: 0.75 };
  }
  return { family: "fallback_free_text", supported: true, confidence: 0.5 };
};

const refusalForLinkAndSession = (
  link: WebChatChannelLink,
  event: BoundedWebChatEvent,
  now: Date,
): ChannelRefusal | undefined => {
  if (isBlockedWebChatLink(link)) {
    return unauthorizedParticipant();
  }
  if (isPendingWebChatLink(link)) {
    return event.event_kind === "verification" || event.event_kind === "action"
      ? undefined
      : unauthenticatedLink();
  }
  const sessionRefusal = validateAuthenticatedSession(event, now);
  if (sessionRefusal) {
    return sessionRefusal;
  }
  if (!isVerifiedWebChatLink(link)) {
    return unauthenticatedLink();
  }
  if (event.session?.principal_id !== link.principal_id) {
    return unauthorizedParticipant();
  }
  return undefined;
};

const contentPartsFor = (event: BoundedWebChatEvent): readonly ContentPart[] => {
  if (event.event_kind === "action" || event.event_kind === "acknowledgement") {
    return [commandPart(event.action_id ?? event.text ?? event.event_kind)];
  }
  if (event.event_kind === "attachment_reference") {
    return event.attachment_ref
      ? [
          {
            kind: "attachment_ref",
            attachment_ref: event.attachment_ref,
            classification: "untrusted_user_input",
          },
        ]
      : [];
  }
  if (!event.text || event.text.trim().length === 0) return [];
  return [textPart(event.text, true)];
};

const boundClientContext = (
  context: WebChatClientEvent["client_context"],
): NonNullable<WebChatClientEvent["client_context"]> => ({
  ...(context?.locale ? { locale: sanitizeNativeRef(context.locale) } : {}),
  ...(context?.route ? { route: sanitizeNativeRef(context.route) } : {}),
  ...(context?.referrer ? { referrer: sanitizeNativeRef(context.referrer) } : {}),
  ...(context?.client_timestamp ? { client_timestamp: context.client_timestamp } : {}),
  ...(context?.user_agent_hint
    ? { user_agent_hint: sanitizeNativeRef(context.user_agent_hint) }
    : {}),
});

const correlationFor = (event: BoundedWebChatEvent): string =>
  ["web-chat", event.thread_id, event.event_id].join(":");
