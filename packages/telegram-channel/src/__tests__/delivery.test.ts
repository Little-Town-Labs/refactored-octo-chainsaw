import { mapTelegramDeliveryResult } from "../index.js";
import { fixedNow } from "./fixtures.js";

describe("telegram delivery mapping", () => {
  const now = () => fixedNow;

  it("maps delivered provider responses", () => {
    expect(mapTelegramDeliveryResult({ ok: true, message_id: 10 }, now)).toMatchObject({
      status: "delivered",
      reason_code: "delivered",
      native_ref: "telegram-message:10",
    });
  });

  it("maps provider throttling with retry hints", () => {
    const outcome = mapTelegramDeliveryResult(
      { ok: false, error_code: 429, retry_after_seconds: 30, description: "Too Many Requests" },
      now,
    );

    expect(outcome.status).toBe("provider_rate_limited");
    expect(outcome.reason_code).toBe("provider_throttled");
    expect(outcome.retry_after?.toISOString()).toBe("2026-05-23T12:00:30.000Z");
  });

  it("maps retryable and terminal failures", () => {
    expect(mapTelegramDeliveryResult({ ok: false, error_code: 500 }, now).status).toBe(
      "retryable_failure",
    );
    expect(mapTelegramDeliveryResult({ ok: false, error_code: 400 }, now).status).toBe(
      "terminal_failure",
    );
  });
});
