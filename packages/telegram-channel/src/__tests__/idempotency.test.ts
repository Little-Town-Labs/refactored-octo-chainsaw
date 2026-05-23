import { buildTelegramIdempotencyKey, InMemoryTelegramDuplicateStore } from "../index.js";
import { telegramMessageUpdate } from "./fixtures.js";
import { boundTelegramUpdate } from "../normalize.js";

describe("telegram idempotency", () => {
  it("builds stable keys from Telegram update_id", () => {
    expect(buildTelegramIdempotencyKey({ update_id: 200 })).toBe("telegram:update:200");
  });

  it("suppresses duplicate Telegram updates", () => {
    const bounded = boundTelegramUpdate(telegramMessageUpdate(201));
    expect("update_id" in bounded).toBe(true);

    const store = new InMemoryTelegramDuplicateStore();
    const key = buildTelegramIdempotencyKey(bounded as { update_id: number });

    expect(store.claim(key, bounded as never).status).toBe("accepted");
    expect(store.claim(key, bounded as never).status).toBe("duplicate_suppressed");
  });
});
