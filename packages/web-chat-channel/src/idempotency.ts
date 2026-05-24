import type {
  BoundedWebChatEvent,
  WebChatDuplicateStore,
  WebChatIdempotencyRecord,
} from "./types.js";

export const buildWebChatIdempotencyKey = (event: BoundedWebChatEvent): string =>
  [
    "web-chat",
    sanitizeId(event.event_id),
    sanitizeId(event.event_kind),
    sanitizeId(event.session?.session_id ?? "anonymous"),
    sanitizeId(event.session?.principal_id ?? "no-principal"),
    sanitizeId(event.thread_id),
    sanitizeId(event.action_id ?? "no-action"),
  ].join(":");

export class InMemoryWebChatDuplicateStore implements WebChatDuplicateStore {
  readonly #records = new Map<string, WebChatIdempotencyRecord>();

  claim(key: string, event: BoundedWebChatEvent): WebChatIdempotencyRecord {
    const existing = this.#records.get(key);
    if (existing) {
      const duplicate: WebChatIdempotencyRecord = {
        ...existing,
        status: "duplicate_suppressed",
      };
      this.#records.set(key, duplicate);
      return duplicate;
    }

    const record: WebChatIdempotencyRecord = {
      idempotency_key: key,
      event_id: event.event_id,
      first_seen_at: new Date(),
      status: "accepted",
    };
    this.#records.set(key, record);
    return record;
  }

  complete(key: string, record: Omit<WebChatIdempotencyRecord, "idempotency_key">): void {
    this.#records.set(key, { ...record, idempotency_key: key });
  }
}

export const sanitizeId = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 96);
