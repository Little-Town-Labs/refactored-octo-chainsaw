import {
  signWebhook,
  verifyWebhookSignature,
  verifyWebhookSignatureOnce,
} from "../webhook-signing";

describe("F23 webhook signing", () => {
  const input = {
    secret: "secret",
    keyId: "key_1",
    endpointId: "endpoint_1",
    eventId: "event_1",
    deliveryId: "delivery_1",
    schemaVersion: "1.0.0",
    body: JSON.stringify({ event_id: "event_1" }),
    timestamp: 1_800_000_000,
  };

  it("signs and verifies canonical webhook headers", () => {
    const headers = new Headers(Object.entries(signWebhook(input)));

    expect(
      verifyWebhookSignature({
        secret: input.secret,
        expectedKeyId: input.keyId,
        endpointId: input.endpointId,
        body: input.body,
        headers,
        now: new Date(input.timestamp * 1000),
      }),
    ).toBe(true);
  });

  it("rejects tampered payloads, stale timestamps, and unknown keys", () => {
    const headers = new Headers(Object.entries(signWebhook(input)));

    expect(
      verifyWebhookSignature({
        secret: input.secret,
        expectedKeyId: input.keyId,
        endpointId: input.endpointId,
        body: JSON.stringify({ event_id: "tampered" }),
        headers,
        now: new Date(input.timestamp * 1000),
      }),
    ).toBe(false);
    expect(
      verifyWebhookSignature({
        secret: input.secret,
        expectedKeyId: input.keyId,
        endpointId: input.endpointId,
        body: input.body,
        headers,
        now: new Date((input.timestamp + 301) * 1000),
      }),
    ).toBe(false);
    expect(
      verifyWebhookSignature({
        secret: input.secret,
        expectedKeyId: "unknown",
        endpointId: input.endpointId,
        body: input.body,
        headers,
        now: new Date(input.timestamp * 1000),
      }),
    ).toBe(false);
  });

  it("rejects replayed delivery identifiers", async () => {
    const headers = new Headers(Object.entries(signWebhook(input)));
    const claimed = new Set<string>();
    const replayStore = {
      claimDelivery: async (deliveryId: string) => {
        if (claimed.has(deliveryId)) {
          return false;
        }
        claimed.add(deliveryId);
        return true;
      },
    };

    await expect(
      verifyWebhookSignatureOnce({
        secret: input.secret,
        expectedKeyId: input.keyId,
        endpointId: input.endpointId,
        body: input.body,
        headers,
        replayStore,
        now: new Date(input.timestamp * 1000),
      }),
    ).resolves.toBe(true);
    await expect(
      verifyWebhookSignatureOnce({
        secret: input.secret,
        expectedKeyId: input.keyId,
        endpointId: input.endpointId,
        body: input.body,
        headers,
        replayStore,
        now: new Date(input.timestamp * 1000),
      }),
    ).resolves.toBe(false);
  });
});
