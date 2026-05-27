import { createHmac, timingSafeEqual } from "node:crypto";

import type { SafeMetadata, WebhookDelivery, WebhookSignatureVerification } from "../contracts.js";

export const WEBHOOK_SIGNATURE_HEADER = "x-spyglass-signature";
export const WEBHOOK_TIMESTAMP_HEADER = "x-spyglass-timestamp";
export const WEBHOOK_EVENT_HEADER = "x-spyglass-event-id";
export const WEBHOOK_DELIVERY_HEADER = "x-spyglass-delivery-id";

export function canonicalWebhookPayload(payload: SafeMetadata): string {
  return JSON.stringify(sortForStableString(payload));
}

export function signWebhookPayload(input: {
  readonly payload: SafeMetadata;
  readonly secret: string;
  readonly timestamp: string;
}): string {
  const signed = `${input.timestamp}.${canonicalWebhookPayload(input.payload)}`;
  return `sha256=${createHmac("sha256", input.secret).update(signed).digest("hex")}`;
}

export function withSignedWebhookHeaders(
  delivery: Omit<WebhookDelivery, "headers">,
): WebhookDelivery {
  return {
    ...delivery,
    headers: {
      [WEBHOOK_SIGNATURE_HEADER]: signWebhookPayload({
        payload: delivery.payload,
        secret: delivery.signing_secret,
        timestamp: delivery.sent_at,
      }),
      [WEBHOOK_TIMESTAMP_HEADER]: delivery.sent_at,
      [WEBHOOK_EVENT_HEADER]: delivery.event_id,
      [WEBHOOK_DELIVERY_HEADER]: delivery.delivery_id,
    },
  };
}

export function verifyWebhookSignature(delivery: WebhookDelivery): WebhookSignatureVerification {
  const signature = delivery.headers[WEBHOOK_SIGNATURE_HEADER] ?? "";
  const timestamp = delivery.headers[WEBHOOK_TIMESTAMP_HEADER] ?? "";
  const expected = signWebhookPayload({
    payload: delivery.payload,
    secret: delivery.signing_secret,
    timestamp,
  });
  return {
    valid: safeEqual(signature, expected),
    signature_header: signature,
    timestamp_header: timestamp,
    signed_payload_ref: `webhook-payload://${delivery.event_id}`,
  };
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function sortForStableString(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortForStableString);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, sortForStableString(entry)]),
  );
}
