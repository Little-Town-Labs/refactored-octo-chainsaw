import type {
  BoundedWebChatEvent,
  WebChatChannelLink,
  WebChatLinkLookup,
  WebChatThread,
} from "./types.js";

export const unknownWebChatLink = (): WebChatChannelLink => ({ status: "unknown" });

export const createStaticWebChatLinkLookup = (
  links: readonly WebChatChannelLink[],
  threads: readonly WebChatThread[] = [],
): WebChatLinkLookup => ({
  findLink(event: BoundedWebChatEvent): WebChatChannelLink {
    const principalId = event.session?.principal_id;
    return (
      links.find((link) => link.principal_id && link.principal_id === principalId) ??
      unknownWebChatLink()
    );
  },
  findThread(event: BoundedWebChatEvent, link: WebChatChannelLink): WebChatThread | undefined {
    const existing = threads.find((thread) => thread.thread_id === event.thread_id);
    if (existing) return existing;
    return {
      thread_id: event.thread_id,
      native_thread_ref: `web-chat:${event.thread_id}`,
      ...(link.seeker_ticket_id ? { seeker_ticket_id: link.seeker_ticket_id } : {}),
      ...(link.match_ticket_id ? { match_ticket_id: link.match_ticket_id } : {}),
      state: link.status === "pending_verification" ? "awaiting_verification" : "open",
    };
  },
});

export const isVerifiedWebChatLink = (link: WebChatChannelLink): boolean =>
  link.status === "verified" && Boolean(link.participant_id && link.principal_id);

export const isPendingWebChatLink = (link: WebChatChannelLink): boolean =>
  link.status === "pending_verification" && Boolean(link.pending_challenge_id);

export const isBlockedWebChatLink = (link: WebChatChannelLink): boolean =>
  link.status === "disabled" || link.status === "paused" || link.status === "withdrawn";

export const ensureThreadAllowed = (
  thread: WebChatThread | undefined,
  allowedThreadIds: readonly string[] | undefined,
): WebChatThread | undefined => {
  if (!thread) return undefined;
  if (allowedThreadIds && !allowedThreadIds.includes(thread.thread_id)) return undefined;
  return thread;
};
