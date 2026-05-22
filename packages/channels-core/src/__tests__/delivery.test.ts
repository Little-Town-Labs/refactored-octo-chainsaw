import { classifyProviderResult, deliveryOutcome } from "../index.js";

describe("delivery outcomes", () => {
  it("classifies provider results into canonical statuses", () => {
    expect(classifyProviderResult({ kind: "delivered" }).status).toBe("delivered");
    expect(classifyProviderResult({ kind: "accepted" }).status).toBe("accepted_for_delivery");
    expect(classifyProviderResult({ kind: "retryable_failure" }).reason_code).toBe(
      "delivery_provider_unavailable",
    );
    expect(classifyProviderResult({ kind: "terminal_failure" }).reason_code).toBe(
      "provider_rejected",
    );
  });

  it("preserves retry metadata for throttling", () => {
    const retryAfter = new Date("2026-05-22T12:05:00.000Z");
    const result = classifyProviderResult({ kind: "throttled", retry_after: retryAfter });

    expect(result.status).toBe("provider_rate_limited");
    expect(result.reason_code).toBe("provider_throttled");
    expect(result.retry_after).toBe(retryAfter);
  });

  it("creates refused and unsupported outcomes with reason codes", () => {
    expect(deliveryOutcome("refused", "unauthenticated_channel_link").status).toBe("refused");
    expect(deliveryOutcome("unsupported", "unsupported_intent").reason_code).toBe(
      "unsupported_intent",
    );
  });
});
