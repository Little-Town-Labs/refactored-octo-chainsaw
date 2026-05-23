import { mapEmailDeliveryResult } from "../delivery.js";

describe("email delivery mapping", () => {
  it.each([
    ["accepted", "accepted_for_delivery"],
    ["delivered", "delivered"],
    ["deferred", "retryable_failure"],
    ["bounce", "terminal_failure"],
    ["complaint", "terminal_failure"],
    ["suppression", "terminal_failure"],
    ["retryable_failure", "retryable_failure"],
    ["terminal_failure", "terminal_failure"],
    ["throttled", "provider_rate_limited"],
  ] as const)("maps %s provider result", (kind, status) => {
    expect(mapEmailDeliveryResult({ kind, native_ref: `native:${kind}` }).status).toBe(status);
  });
});
