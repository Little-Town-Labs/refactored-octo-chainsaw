import type { BoundedEmailEvent, EmailDuplicateStore, EmailIdempotencyRecord } from "./types.js";
import { buildEmailThreadId, sanitizeId } from "./threading.js";

export const buildEmailIdempotencyKey = (event: BoundedEmailEvent): string =>
  [
    "email",
    event.provider,
    sanitizeId(event.provider_event_id),
    sanitizeId(event.message_id ?? "no-message"),
    sanitizeId(event.reply_alias ?? "no-alias"),
    sanitizeId(buildEmailThreadId(event)),
  ].join(":");

export class InMemoryEmailDuplicateStore implements EmailDuplicateStore {
  readonly #records = new Map<string, EmailIdempotencyRecord>();

  claim(key: string, event: BoundedEmailEvent): EmailIdempotencyRecord {
    const existing = this.#records.get(key);
    if (existing) {
      const duplicate: EmailIdempotencyRecord = {
        ...existing,
        status: "duplicate_suppressed",
      };
      this.#records.set(key, duplicate);
      return duplicate;
    }

    const record: EmailIdempotencyRecord = {
      idempotency_key: key,
      provider_event_id: event.provider_event_id,
      first_seen_at: new Date(),
      status: "accepted",
    };
    this.#records.set(key, record);
    return record;
  }

  complete(key: string, record: Omit<EmailIdempotencyRecord, "idempotency_key">): void {
    this.#records.set(key, { ...record, idempotency_key: key });
  }
}
