import {
  buildConversationIdempotencyKey,
  buildMatchNotificationKey,
  buildScheduledPromptKey,
  InMemoryIdempotencyStore,
} from "../idempotency.js";
import { makeEvent, matchEvent } from "./fixtures.js";

describe("idempotency", () => {
  it("suppresses duplicate inbound messages, scheduled prompts, and match notifications", () => {
    const store = new InMemoryIdempotencyStore();
    const keys = [
      buildConversationIdempotencyKey(makeEvent("telegram", "onboarding")),
      buildScheduledPromptKey(
        "seeker-1",
        "aggregate-insight",
        new Date("2026-05-25T12:00:00.000Z"),
      ),
      buildMatchNotificationKey(matchEvent()),
    ];

    for (const key of keys) {
      expect(store.claim(key)).toBe(true);
      expect(store.claim(key)).toBe(false);
    }
  });
});
