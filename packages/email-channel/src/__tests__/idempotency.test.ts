import { createEmailAdapter } from "../adapter.js";
import { inboundEmailEvent, optionsWithLinks, verifiedLink } from "./fixtures.js";

describe("email idempotency", () => {
  it("suppresses duplicate provider events", () => {
    const adapter = createEmailAdapter(optionsWithLinks([verifiedLink]));
    const event = inboundEmailEvent("evt-dupe");

    const first = adapter.normalizeInbound(event);
    const second = adapter.normalizeInbound(event);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    if (second.ok) throw new Error("expected duplicate refusal");
    expect(second.duplicate).toBe(true);
    expect(second.refusal.reason_code).toBe("duplicate_suppressed");
  });
});
