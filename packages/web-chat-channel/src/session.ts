import {
  malformedPayload,
  unauthenticatedLink,
  type ChannelRefusal,
} from "@spyglass/channels-core";

import type { BoundedWebChatEvent, WebChatSessionBinding } from "./types.js";

export const boundSessionRef = (
  session: WebChatSessionBinding | undefined,
): WebChatSessionBinding | undefined => {
  if (!session) return undefined;
  return {
    ...(session.session_id ? { session_id: sanitizeNativeRef(session.session_id) } : {}),
    ...(session.principal_id ? { principal_id: sanitizeNativeRef(session.principal_id) } : {}),
    ...(session.issued_at ? { issued_at: session.issued_at } : {}),
    ...(session.expires_at ? { expires_at: session.expires_at } : {}),
    ...(session.assurance ? { assurance: sanitizeNativeRef(session.assurance) } : {}),
    ...(session.native_ref ? { native_ref: sanitizeNativeRef(session.native_ref) } : {}),
  };
};

export const validateAuthenticatedSession = (
  event: BoundedWebChatEvent,
  now: Date,
): ChannelRefusal | undefined => {
  if (!event.session?.session_id || !event.session.principal_id || !event.session.expires_at) {
    return unauthenticatedLink();
  }

  const expiresAt = parseDate(event.session.expires_at);
  if (!expiresAt) return malformedPayload();
  if (expiresAt.getTime() <= now.getTime()) {
    return unauthenticatedLink();
  }

  return undefined;
};

export const parseDate = (value: string | Date | undefined): Date | undefined => {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

export const sanitizeNativeRef = (value: string): string => value.trim().slice(0, 256);
