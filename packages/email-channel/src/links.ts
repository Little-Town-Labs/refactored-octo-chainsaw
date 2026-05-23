import type { BoundedEmailEvent, EmailChannelLink, EmailLinkLookup, EmailThread } from "./types.js";
import { buildEmailThreadId, nativeThreadRef, normalizeEmailAddress } from "./threading.js";

export const unknownEmailLink = (): EmailChannelLink => ({ status: "unknown" });

export const createStaticEmailLinkLookup = (
  links: readonly EmailChannelLink[],
  threads: readonly EmailThread[] = [],
): EmailLinkLookup => ({
  findLink(event: BoundedEmailEvent): EmailChannelLink {
    const from = event.from_ref?.replace(/^email:/, "");
    return (
      links.find(
        (link) => link.email_address && from === normalizeEmailAddress(link.email_address),
      ) ?? unknownEmailLink()
    );
  },
  findThread(event: BoundedEmailEvent, link: EmailChannelLink): EmailThread | undefined {
    const derivedThreadId = buildEmailThreadId(event);
    const existing = threads.find((thread) => thread.thread_id === derivedThreadId);
    if (existing) return existing;
    const nativeRef = nativeThreadRef(event.reference_headers);
    return {
      thread_id: derivedThreadId,
      ...(event.reply_alias ? { reply_alias: event.reply_alias } : {}),
      ...(nativeRef ? { native_thread_ref: nativeRef } : {}),
      ...(link.seeker_ticket_id ? { seeker_ticket_id: link.seeker_ticket_id } : {}),
      ...(link.match_ticket_id ? { match_ticket_id: link.match_ticket_id } : {}),
      state: link.status === "pending_verification" ? "awaiting_verification" : "open",
    };
  },
});

export const isVerifiedEmailLink = (link: EmailChannelLink): boolean =>
  link.status === "verified" && Boolean(link.participant_id && link.principal_id);

export const isPendingEmailLink = (link: EmailChannelLink): boolean =>
  link.status === "pending_verification" && Boolean(link.pending_challenge_id);

export const isBlockedEmailLink = (link: EmailChannelLink): boolean =>
  link.status === "disabled" || link.status === "unsubscribed" || link.status === "suppressed";
