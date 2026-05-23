import { malformedPayload } from "@spyglass/channels-core";
import type { BoundedEmailEvent, EmailReferenceHeaders, EmailThread } from "./types.js";

export const normalizeEmailAddress = (email: string): string =>
  email.trim().normalize("NFKC").toLowerCase();

export const extractReplyAlias = (event: {
  readonly reply_alias?: string;
  readonly to?: readonly { readonly email: string }[];
}): string | undefined => {
  if (event.reply_alias?.trim()) {
    return normalizeEmailAddress(event.reply_alias);
  }
  return event.to
    ?.map((to) => normalizeEmailAddress(to.email))
    .find((email) => email.includes("+"));
};

export const buildEmailThreadId = (
  event: Pick<
    BoundedEmailEvent,
    "reply_alias" | "reference_headers" | "message_id" | "provider_event_id"
  >,
): string => {
  const alias = event.reply_alias?.replace(/@.*/, "") ?? "email";
  const reference =
    event.reference_headers.in_reply_to ??
    event.reference_headers.references?.at(-1) ??
    event.message_id ??
    event.provider_event_id;
  return `thread-email-${sanitizeId(alias)}-${sanitizeId(reference)}`;
};

export const nativeThreadRef = (headers: EmailReferenceHeaders): string | undefined =>
  headers.in_reply_to ?? headers.references?.at(-1) ?? headers.message_id;

export const ensureThreadAllowed = (
  thread: EmailThread | undefined,
  allowedThreadIds: readonly string[] | undefined,
): EmailThread | ReturnType<typeof malformedPayload> => {
  if (!thread) {
    return malformedPayload();
  }
  if (
    allowedThreadIds &&
    allowedThreadIds.length > 0 &&
    !allowedThreadIds.includes(thread.thread_id)
  ) {
    return malformedPayload();
  }
  return thread;
};

export const sanitizeId = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 96);
