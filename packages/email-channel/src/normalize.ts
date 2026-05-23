import {
  commandPart,
  createChannelMessage,
  malformedPayload,
  overSizePayload,
  refusal,
  textPart,
  unauthenticatedLink,
  unauthorizedParticipant,
  type ChannelIntent,
  type ChannelRefusal,
  type ContentPart,
} from "@spyglass/channels-core";

import { emailAuditEvent } from "./audit.js";
import {
  EMAIL_MAX_ATTACHMENT_BYTES,
  EMAIL_MAX_BODY_CHARS,
  EMAIL_MAX_SUBJECT_CHARS,
} from "./capabilities.js";
import { deliveryResultFromEmailEvent } from "./delivery.js";
import { buildEmailIdempotencyKey } from "./idempotency.js";
import { isBlockedEmailLink, isPendingEmailLink, isVerifiedEmailLink } from "./links.js";
import { ensureThreadAllowed, extractReplyAlias, normalizeEmailAddress } from "./threading.js";
import type {
  BoundedEmailEvent,
  EmailAdapterOptions,
  EmailChannelLink,
  EmailNormalizeResult,
  EmailProviderEvent,
} from "./types.js";

export const boundEmailEvent = (
  event: EmailProviderEvent,
  maxBodyChars = EMAIL_MAX_BODY_CHARS,
  maxSubjectChars = EMAIL_MAX_SUBJECT_CHARS,
  maxAttachmentBytes = EMAIL_MAX_ATTACHMENT_BYTES,
): BoundedEmailEvent | ChannelRefusal => {
  if (!event.provider || !event.event_kind || !event.provider_event_id || !event.received_at) {
    return malformedPayload();
  }

  if (event.subject && event.subject.length > maxSubjectChars) {
    return overSizePayload();
  }
  if (event.text_body && event.text_body.length > maxBodyChars) {
    return overSizePayload();
  }
  if (
    event.attachment_refs?.some(
      (attachment) => (attachment.size_bytes ?? 0) > maxAttachmentBytes || !attachment.provider_ref,
    )
  ) {
    return overSizePayload();
  }

  const from = event.from?.email ? normalizeEmailAddress(event.from.email) : undefined;
  const toRefs = event.to?.map((to) => `email:${normalizeEmailAddress(to.email)}`) ?? [];
  const replyAlias = extractReplyAlias(event);
  const occurredAt = parseDate(event.occurred_at) ?? parseDate(event.received_at);
  const receivedAt = parseDate(event.received_at);
  if (!receivedAt || !occurredAt) {
    return malformedPayload();
  }

  return {
    provider: event.provider,
    event_kind: event.event_kind,
    provider_event_id: event.provider_event_id,
    to_refs: toRefs,
    reference_headers: boundedHeaders(event.reference_headers),
    has_html: Boolean(event.has_html),
    attachment_refs:
      event.attachment_refs?.map((attachment) => `email-attachment:${attachment.provider_ref}`) ??
      [],
    spam_signals: event.spam_signals ?? {},
    occurred_at: occurredAt,
    received_at: receivedAt,
    metadata: {
      provider: event.provider,
      has_html: Boolean(event.has_html),
      to_count: toRefs.length,
      attachment_count: event.attachment_refs?.length ?? 0,
      spam_status: event.spam_signals?.provider_status,
      spoof_risk: event.spam_signals?.spoof_risk,
    },
    ...(event.message_id ? { message_id: event.message_id.slice(0, 512) } : {}),
    ...(from ? { from_ref: `email:${from}` } : {}),
    ...(replyAlias ? { reply_alias: replyAlias } : {}),
    ...(event.subject ? { subject: event.subject } : {}),
    ...(event.text_body ? { text_body: stripQuotedText(event.text_body) } : {}),
    ...(event.native_ref ? { native_ref: event.native_ref.slice(0, 512) } : {}),
    ...(parseDate(event.retry_after) ? { retry_after: parseDate(event.retry_after)! } : {}),
  };
};

export const normalizeEmailInbound = (
  event: EmailProviderEvent,
  options: EmailAdapterOptions,
): EmailNormalizeResult => {
  const bounded = boundEmailEvent(
    event,
    options.max_body_chars,
    options.max_subject_chars,
    options.max_attachment_bytes,
  );
  if ("reason_code" in bounded) {
    return { ok: false, refusal: bounded };
  }

  const idempotencyKey = buildEmailIdempotencyKey(bounded);
  const claimed = options.duplicate_store.claim(idempotencyKey, bounded);
  if (claimed.status === "duplicate_suppressed") {
    return {
      ok: false,
      duplicate: true,
      refusal: refusal("duplicate_suppressed", "Email event was already processed"),
    };
  }

  const delivery = deliveryResultFromEmailEvent(bounded, options.now);
  if (delivery) {
    options.duplicate_store.complete(idempotencyKey, {
      provider_event_id: bounded.provider_event_id,
      first_seen_at: claimed.first_seen_at,
      status: "accepted",
      ...(delivery.native_ref ? { message_ref: delivery.native_ref } : {}),
      audit_event_id: emailAuditEvent({
        event_type: "channel.delivery_recorded",
        correlation_id: correlationFor(bounded),
        event: bounded,
        reason_code: delivery.reason_code,
        ...(delivery.native_ref ? { native_ref: delivery.native_ref } : {}),
      }).event_id,
    });
    return {
      ok: false,
      delivery,
      refusal: refusal(delivery.reason_code, "Email event recorded as delivery status"),
    };
  }

  const link = options.link_lookup.findLink(bounded);
  const linkRefusal = refusalForLink(link);
  if (linkRefusal) {
    options.duplicate_store.complete(idempotencyKey, {
      provider_event_id: bounded.provider_event_id,
      first_seen_at: claimed.first_seen_at,
      status: "refused",
      audit_event_id: emailAuditEvent({
        event_type: "channel.refused",
        correlation_id: correlationFor(bounded),
        event: bounded,
        reason_code: linkRefusal.reason_code,
      }).event_id,
    });
    return { ok: false, refusal: linkRefusal };
  }

  if (isSpamOrSpoofRisk(bounded)) {
    return { ok: false, refusal: unauthorizedParticipant() };
  }

  const thread = ensureThreadAllowed(
    options.link_lookup.findThread(bounded, link),
    link.allowed_thread_ids,
  );
  if ("reason_code" in thread) {
    return { ok: false, refusal: unauthorizedParticipant() };
  }

  if (!bounded.text_body && !bounded.subject && bounded.attachment_refs.length === 0) {
    return { ok: false, refusal: malformedPayload() };
  }

  const intent = classifyEmailIntent(
    [bounded.subject, bounded.text_body].filter(Boolean).join("\n"),
  );
  const content = contentPartsFor(bounded);
  const message = createChannelMessage({
    direction: "inbound",
    channel: { kind: "email", version: "1.0.0", enabled: true },
    participant: {
      link_status:
        link.status === "verified" || link.status === "pending_verification"
          ? link.status
          : "disabled",
      role: "seeker",
      ...(link.participant_id ? { participant_id: link.participant_id } : {}),
      ...(link.principal_id ? { principal_id: link.principal_id } : {}),
      ...((link.email_address ?? bounded.from_ref)
        ? { channel_account_id: link.email_address ?? bounded.from_ref }
        : {}),
    },
    thread,
    idempotency_key: idempotencyKey,
    occurred_at: bounded.occurred_at,
    received_at: options.now?.() ?? bounded.received_at,
    content,
    intent,
    disclosure: { posture: "untrusted_inbound" },
    audit: { correlation_id: correlationFor(bounded), source: "email-webhook" },
    metadata: bounded.metadata,
  });

  const auditEvent = emailAuditEvent({
    event_type: "channel.normalized",
    correlation_id: message.audit.correlation_id,
    event: bounded,
    message,
  });

  options.duplicate_store.complete(idempotencyKey, {
    provider_event_id: bounded.provider_event_id,
    first_seen_at: claimed.first_seen_at,
    status: "accepted",
    message_ref: message.message_id,
    audit_event_id: auditEvent.event_id,
  });

  return { ok: true, message };
};

export const classifyEmailIntent = (text: string): ChannelIntent => {
  const normalized = text.trim().toLowerCase();
  if (/browse|show all jobs|list jobs/.test(normalized)) {
    return { family: "browse_all_jobs", supported: false, confidence: 0.9 };
  }
  if (/match tickets|hidden run|run state|raw dossier|dossier internals/.test(normalized)) {
    return { family: "inspect_hidden_run_state", supported: false, confidence: 0.9 };
  }
  if (/direct message|message employer|message company|counterparty/.test(normalized)) {
    return { family: "direct_counterparty_message", supported: false, confidence: 0.9 };
  }
  if (/override|parley/.test(normalized)) {
    return { family: "override_parley_run", supported: false, confidence: 0.9 };
  }
  if (/verify|confirm|code/.test(normalized)) {
    return { family: "onboarding", supported: true, confidence: 0.8 };
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

const refusalForLink = (link: EmailChannelLink): ChannelRefusal | undefined => {
  if (isVerifiedEmailLink(link) || isPendingEmailLink(link)) {
    return undefined;
  }
  if (isBlockedEmailLink(link)) {
    return unauthorizedParticipant();
  }
  return unauthenticatedLink();
};

const contentPartsFor = (event: BoundedEmailEvent): readonly ContentPart[] => {
  const parts: ContentPart[] = [];
  const body = [event.subject ? `Subject: ${event.subject}` : "", event.text_body ?? ""]
    .filter(Boolean)
    .join("\n\n");
  if (body) {
    const command = body.trim().match(/^\/([a-zA-Z0-9_]+)/)?.[1];
    parts.push(command ? commandPart(command) : textPart(body));
  }
  for (const attachmentRef of event.attachment_refs) {
    parts.push({
      kind: "attachment_ref",
      attachment_ref: attachmentRef,
      classification: "untrusted_user_input",
    });
  }
  return parts;
};

const boundedHeaders = (
  headers: EmailProviderEvent["reference_headers"],
): BoundedEmailEvent["reference_headers"] => ({
  ...(headers?.message_id ? { message_id: headers.message_id.slice(0, 512) } : {}),
  ...(headers?.in_reply_to ? { in_reply_to: headers.in_reply_to.slice(0, 512) } : {}),
  ...(headers?.references
    ? { references: headers.references.slice(-20).map((ref) => ref.slice(0, 512)) }
    : {}),
});

const isSpamOrSpoofRisk = (event: BoundedEmailEvent): boolean =>
  event.spam_signals.spoof_risk === true ||
  ["spam", "fail", "quarantine"].includes(String(event.spam_signals.provider_status ?? ""));

const stripQuotedText = (body: string): string => {
  const lines = body.split(/\r?\n/);
  const quoteStart = lines.findIndex(
    (line) => line.startsWith(">") || /^On .+ wrote:$/i.test(line.trim()),
  );
  return (quoteStart >= 0 ? lines.slice(0, quoteStart) : lines).join("\n").trim();
};

const parseDate = (value: string | Date | undefined): Date | undefined => {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const correlationFor = (event: BoundedEmailEvent): string =>
  `corr-email-${event.provider}-${event.provider_event_id}`;
