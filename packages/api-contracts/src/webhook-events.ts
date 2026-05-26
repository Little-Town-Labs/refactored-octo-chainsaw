export const WEBHOOK_EVENTS_CONTRACT_PATH = "openapi/webhook-events.v1.yaml" as const;
export const WEBHOOK_SCHEMA_VERSION = "2026-05-25" as const;

export const EMPLOYER_WEBHOOK_EVENT_TYPES = [
  "match.notification.created",
  "dossier.delivery.created",
] as const;

export type EmployerWebhookEventType = (typeof EMPLOYER_WEBHOOK_EVENT_TYPES)[number];

export interface WebhookEnvelope<TData extends Record<string, unknown> = Record<string, unknown>> {
  readonly event_id: string;
  readonly event_type: EmployerWebhookEventType;
  readonly schema_version: typeof WEBHOOK_SCHEMA_VERSION;
  readonly organization_id: string;
  readonly created_at: string;
  readonly data: TData;
}

export const WEBHOOK_SIGNATURE_HEADERS = {
  eventId: "Spyglass-Event-Id",
  deliveryId: "Spyglass-Delivery-Id",
  timestamp: "Spyglass-Timestamp",
  keyId: "Spyglass-Key-Id",
  signature: "Spyglass-Signature",
  schemaVersion: "Spyglass-Schema-Version",
} as const;
