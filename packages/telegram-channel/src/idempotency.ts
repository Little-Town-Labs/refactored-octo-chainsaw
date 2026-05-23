import type {
  BoundedTelegramUpdate,
  TelegramDuplicateStore,
  TelegramIdempotencyRecord,
} from "./types.js";

export const buildTelegramIdempotencyKey = (
  update: Pick<BoundedTelegramUpdate, "update_id">,
): string => `telegram:update:${update.update_id}`;

export class InMemoryTelegramDuplicateStore implements TelegramDuplicateStore {
  readonly #records = new Map<string, TelegramIdempotencyRecord>();

  claim(key: string, update: BoundedTelegramUpdate): TelegramIdempotencyRecord {
    const existing = this.#records.get(key);
    if (existing) {
      const duplicate: TelegramIdempotencyRecord = {
        ...existing,
        status: "duplicate_suppressed",
      };
      this.#records.set(key, duplicate);
      return duplicate;
    }

    const record: TelegramIdempotencyRecord = {
      idempotency_key: key,
      telegram_update_id: update.update_id,
      first_seen_at: new Date(),
      status: "accepted",
    };
    this.#records.set(key, record);
    return record;
  }

  complete(key: string, record: Omit<TelegramIdempotencyRecord, "idempotency_key">): void {
    this.#records.set(key, { ...record, idempotency_key: key });
  }
}
