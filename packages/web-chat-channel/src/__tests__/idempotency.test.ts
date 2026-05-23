import { createWebChatAdapter } from "../adapter.js";
import { buildWebChatIdempotencyKey } from "../idempotency.js";
import { boundWebChatEvent } from "../normalize.js";
import { inboundWebChatEvent, optionsWithLinks } from "./fixtures.js";

describe("web-chat idempotency", () => {
  it("derives stable retry keys and suppresses duplicate client events", () => {
    const bounded = boundWebChatEvent(inboundWebChatEvent());
    if ("reason_code" in bounded) throw new Error(bounded.message);
    expect(buildWebChatIdempotencyKey(bounded)).toContain("evt-web-1");

    const adapter = createWebChatAdapter(optionsWithLinks());
    const first = adapter.normalizeInbound(inboundWebChatEvent("evt-dupe"));
    const second = adapter.normalizeInbound(inboundWebChatEvent("evt-dupe"));

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    if (second.ok) throw new Error("expected duplicate");
    expect(second.duplicate).toBe(true);
    expect(second.refusal.reason_code).toBe("duplicate_suppressed");
  });
});
