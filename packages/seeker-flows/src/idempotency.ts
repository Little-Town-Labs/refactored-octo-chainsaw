import type { MatchNotificationEvent, SeekerConversationEvent } from "./types.js";

export const buildConversationIdempotencyKey = (event: SeekerConversationEvent): string =>
  event.idempotencyKey ??
  [
    "seeker-flow",
    event.channel,
    event.seekerId,
    event.channelMessageId,
    event.flowFamily,
    event.promptId ?? "no-prompt",
    event.actionId ?? "no-action",
  ].join(":");

export const buildScheduledPromptKey = (
  seekerId: string,
  flowFamily: string,
  windowStart: Date,
): string =>
  ["seeker-flow", "scheduled", seekerId, flowFamily, windowStart.toISOString()].join(":");

export const buildMatchNotificationKey = (event: MatchNotificationEvent): string =>
  event.idempotencyKey ||
  ["seeker-flow", "match", event.seekerId, event.matchTicketId, event.eventId].join(":");

export class InMemoryIdempotencyStore {
  readonly #seen = new Set<string>();

  claim(key: string): boolean {
    if (this.#seen.has(key)) {
      return false;
    }
    this.#seen.add(key);
    return true;
  }

  has(key: string): boolean {
    return this.#seen.has(key);
  }
}
