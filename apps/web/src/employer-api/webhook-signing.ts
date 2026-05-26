import { createHmac, timingSafeEqual } from "node:crypto";

export interface WebhookSignatureInput {
  readonly secret: string;
  readonly keyId: string;
  readonly endpointId: string;
  readonly eventId: string;
  readonly deliveryId: string;
  readonly schemaVersion: string;
  readonly body: string;
  readonly timestamp: number;
}

export interface WebhookSignatureHeaders {
  readonly "Spyglass-Webhook-Key-Id": string;
  readonly "Spyglass-Webhook-Timestamp": string;
  readonly "Spyglass-Webhook-Signature": string;
  readonly "Spyglass-Webhook-Event-Id": string;
  readonly "Spyglass-Webhook-Delivery-Id": string;
  readonly "Spyglass-Webhook-Schema-Version": string;
}

export interface WebhookSigningSecret {
  readonly key_id: string;
  readonly secret: string;
  readonly status: "active" | "overlap" | "revoked" | "expired";
  readonly active_from: Date;
  readonly active_until: Date | null;
}

export interface WebhookReplayStore {
  claimDelivery(deliveryId: string, timestamp: number): Promise<boolean>;
}

export function webhookSignaturePayload(
  input: Omit<WebhookSignatureInput, "secret" | "keyId">,
): string {
  return [
    input.timestamp,
    input.endpointId,
    input.eventId,
    input.deliveryId,
    input.schemaVersion,
    input.body,
  ].join(".");
}

export function signWebhook(input: WebhookSignatureInput): WebhookSignatureHeaders {
  const signature = createHmac("sha256", input.secret)
    .update(webhookSignaturePayload(input), "utf8")
    .digest("hex");

  return {
    "Spyglass-Webhook-Key-Id": input.keyId,
    "Spyglass-Webhook-Timestamp": String(input.timestamp),
    "Spyglass-Webhook-Signature": `v1=${signature}`,
    "Spyglass-Webhook-Event-Id": input.eventId,
    "Spyglass-Webhook-Delivery-Id": input.deliveryId,
    "Spyglass-Webhook-Schema-Version": input.schemaVersion,
  };
}

export function verifyWebhookSignature(input: {
  readonly secret: string;
  readonly expectedKeyId: string;
  readonly headers: Headers;
  readonly endpointId: string;
  readonly body: string;
  readonly now?: Date;
  readonly toleranceSeconds?: number;
}): boolean {
  const keyId = input.headers.get("spyglass-webhook-key-id");
  const timestampRaw = input.headers.get("spyglass-webhook-timestamp");
  const signature = input.headers.get("spyglass-webhook-signature");
  const eventId = input.headers.get("spyglass-webhook-event-id");
  const deliveryId = input.headers.get("spyglass-webhook-delivery-id");
  const schemaVersion = input.headers.get("spyglass-webhook-schema-version");

  if (!keyId || !timestampRaw || !signature || !eventId || !deliveryId || !schemaVersion) {
    return false;
  }

  if (keyId !== input.expectedKeyId || !signature.startsWith("v1=")) {
    return false;
  }

  const timestamp = Number(timestampRaw);
  if (!Number.isInteger(timestamp)) {
    return false;
  }

  const nowSeconds = Math.floor((input.now ?? new Date()).getTime() / 1000);
  if (Math.abs(nowSeconds - timestamp) > (input.toleranceSeconds ?? 300)) {
    return false;
  }

  const expected = signWebhook({
    secret: input.secret,
    keyId,
    endpointId: input.endpointId,
    eventId,
    deliveryId,
    schemaVersion,
    body: input.body,
    timestamp,
  })["Spyglass-Webhook-Signature"];

  return safeEqual(signature, expected);
}

export async function verifyWebhookSignatureOnce(input: {
  readonly secret: string;
  readonly expectedKeyId: string;
  readonly headers: Headers;
  readonly endpointId: string;
  readonly body: string;
  readonly replayStore: WebhookReplayStore;
  readonly now?: Date;
  readonly toleranceSeconds?: number;
}): Promise<boolean> {
  if (!verifyWebhookSignature(input)) {
    return false;
  }

  const deliveryId = input.headers.get("spyglass-webhook-delivery-id");
  const timestampRaw = input.headers.get("spyglass-webhook-timestamp");
  if (!deliveryId || !timestampRaw) {
    return false;
  }

  return input.replayStore.claimDelivery(deliveryId, Number(timestampRaw));
}

export function rotateWebhookSigningSecret(
  current: WebhookSigningSecret,
  next: Omit<WebhookSigningSecret, "status" | "active_from" | "active_until">,
  now = new Date(),
): readonly [WebhookSigningSecret, WebhookSigningSecret] {
  return [
    { ...current, status: "overlap", active_until: new Date(now.getTime() + 24 * 60 * 60 * 1000) },
    { ...next, status: "active", active_from: now, active_until: null },
  ];
}

export function revokeWebhookSigningSecret(
  secret: WebhookSigningSecret,
  now = new Date(),
): WebhookSigningSecret {
  return { ...secret, status: "revoked", active_until: now };
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
