import type { WebhookDeliveryPayload } from "./schemas";

export type WebhookResponseClass =
  | "success"
  | "client_error"
  | "server_error"
  | "timeout"
  | "network_error"
  | "suppressed";

export type WebhookDeliveryStatus =
  | "delivered"
  | "retry_scheduled"
  | "terminal_failure"
  | "suppressed";

export interface DossierDeliveryGateInput {
  readonly dossier_id: string | null;
  readonly signature_status: "valid" | "invalid" | "missing";
  readonly employer_projection: Record<string, unknown> | null;
}

export interface WebhookAttemptResult {
  readonly status: WebhookDeliveryStatus;
  readonly response_class: WebhookResponseClass;
  readonly next_attempt_at: Date | null;
  readonly terminal_reason: string | null;
}

export interface WebhookEventCreateInput {
  readonly org_id: string;
  readonly event_type: WebhookDeliveryPayload["event_type"];
  readonly schema_version: string;
  readonly req_id: string;
  readonly match_id?: string;
  readonly dossier?: WebhookDeliveryPayload["dossier"];
}

export interface WebhookEventRecord extends WebhookEventCreateInput {
  readonly webhook_event_id: string;
  readonly payload_hash: string;
  readonly created_at: Date;
}

export interface WebhookDeliveryReceiptRecord {
  readonly delivery_receipt_id: string;
  readonly webhook_event_id: string;
  readonly webhook_endpoint_id: string;
  readonly attempt: number;
  readonly status: WebhookDeliveryStatus;
  readonly response_class: WebhookResponseClass;
  readonly response_status?: number;
  readonly next_attempt_at: Date | null;
  readonly terminal_reason: string | null;
}

export interface WebhookDeliveryRepo {
  createEvent(
    input: WebhookEventCreateInput & { readonly payload_hash: string },
  ): Promise<WebhookEventRecord>;
  recordAttempt(input: {
    readonly webhook_event_id: string;
    readonly webhook_endpoint_id: string;
    readonly attempt: number;
    readonly status: WebhookDeliveryStatus;
    readonly response_class: WebhookResponseClass;
    readonly response_status?: number;
    readonly next_attempt_at: Date | null;
    readonly terminal_reason: string | null;
  }): Promise<WebhookDeliveryReceiptRecord>;
}

export interface WebhookDeliveryAuditSink {
  emit(event: {
    readonly type:
      | "employer_api.webhook.event_created"
      | "employer_api.webhook.delivery_delivered"
      | "employer_api.webhook.delivery_retry_scheduled"
      | "employer_api.webhook.delivery_terminal_failure"
      | "employer_api.webhook.delivery_suppressed";
    readonly org_id?: string;
    readonly webhook_event_id: string;
    readonly webhook_endpoint_id?: string;
    readonly delivery_receipt_id?: string;
  }): Promise<void>;
}

export interface WebhookAcknowledgementResult {
  readonly status: "delivered";
  readonly duplicate: boolean;
  readonly acknowledged_at: Date;
}

export function assertDossierDeliveryEligible(
  input: DossierDeliveryGateInput,
): WebhookDeliveryPayload["dossier"] {
  if (!input.dossier_id || input.signature_status !== "valid" || !input.employer_projection) {
    return undefined;
  }
  return input.employer_projection;
}

export async function createWebhookEvent(
  repo: WebhookDeliveryRepo,
  audit: WebhookDeliveryAuditSink,
  input: WebhookEventCreateInput,
): Promise<WebhookEventRecord> {
  const payload: WebhookDeliveryPayload = {
    event_id: "pending",
    event_type: input.event_type,
    schema_version: input.schema_version,
    org_id: input.org_id,
    req_id: input.req_id,
    ...(input.match_id ? { match_id: input.match_id } : {}),
    ...(input.dossier ? { dossier: input.dossier } : {}),
  };
  const event = await repo.createEvent({
    ...input,
    payload_hash: stablePayloadHash(payload),
  });
  await audit.emit({
    type: "employer_api.webhook.event_created",
    org_id: input.org_id,
    webhook_event_id: event.webhook_event_id,
  });
  return event;
}

export function classifyWebhookResponse(input: {
  readonly responseStatus?: number;
  readonly error?: "timeout" | "network_error";
}): WebhookResponseClass {
  if (input.error) {
    return input.error;
  }
  const status = input.responseStatus;
  if (status === undefined) {
    return "network_error";
  }
  if (status >= 200 && status <= 299) {
    return "success";
  }
  if (status >= 400 && status <= 499) {
    return "client_error";
  }
  return "server_error";
}

export async function recordWebhookDeliveryAttempt(
  repo: WebhookDeliveryRepo,
  audit: WebhookDeliveryAuditSink,
  input: {
    readonly org_id: string;
    readonly webhook_event_id: string;
    readonly webhook_endpoint_id: string;
    readonly attempt: number;
    readonly now: Date;
    readonly responseStatus?: number;
    readonly error?: "timeout" | "network_error";
  },
): Promise<WebhookDeliveryReceiptRecord> {
  const responseClass = classifyWebhookResponse(input);
  const plan = planWebhookAttemptResult({
    attempt: input.attempt,
    responseClass,
    now: input.now,
  });
  const receipt = await repo.recordAttempt({
    webhook_event_id: input.webhook_event_id,
    webhook_endpoint_id: input.webhook_endpoint_id,
    attempt: input.attempt,
    status: plan.status,
    response_class: plan.response_class,
    ...(input.responseStatus !== undefined ? { response_status: input.responseStatus } : {}),
    next_attempt_at: plan.next_attempt_at,
    terminal_reason: plan.terminal_reason,
  });
  await audit.emit({
    type: auditEventTypeForReceipt(receipt.status),
    org_id: input.org_id,
    webhook_event_id: input.webhook_event_id,
    webhook_endpoint_id: input.webhook_endpoint_id,
    delivery_receipt_id: receipt.delivery_receipt_id,
  });
  return receipt;
}

export function planWebhookAttemptResult(input: {
  readonly attempt: number;
  readonly responseClass: WebhookResponseClass;
  readonly now: Date;
  readonly maxAttempts?: number;
}): WebhookAttemptResult {
  if (input.responseClass === "success") {
    return {
      status: "delivered",
      response_class: "success",
      next_attempt_at: null,
      terminal_reason: null,
    };
  }

  if (input.responseClass === "client_error") {
    return {
      status: "terminal_failure",
      response_class: input.responseClass,
      next_attempt_at: null,
      terminal_reason: "client_error",
    };
  }

  const maxAttempts = input.maxAttempts ?? 8;
  if (input.attempt >= maxAttempts) {
    return {
      status: "terminal_failure",
      response_class: input.responseClass,
      next_attempt_at: null,
      terminal_reason: "attempt_limit_exceeded",
    };
  }

  return {
    status: "retry_scheduled",
    response_class: input.responseClass,
    next_attempt_at: new Date(input.now.getTime() + boundedBackoffMs(input.attempt)),
    terminal_reason: null,
  };
}

export function acknowledgeWebhookDelivery(
  currentStatus: "pending" | "delivered" | "retry_scheduled" | "terminal_failure" | "suppressed",
  now = new Date(),
): WebhookAcknowledgementResult {
  return {
    status: "delivered",
    duplicate: currentStatus === "delivered",
    acknowledged_at: now,
  };
}

export function boundedBackoffMs(attempt: number): number {
  const base = 30_000;
  const max = 60 * 60 * 1000;
  return Math.min(max, base * 2 ** Math.max(0, attempt - 1));
}

function stablePayloadHash(payload: WebhookDeliveryPayload): string {
  return `sha256:${Buffer.from(JSON.stringify(payload)).toString("base64url")}`;
}

function auditEventTypeForReceipt(
  status: WebhookDeliveryStatus,
): Parameters<WebhookDeliveryAuditSink["emit"]>[0]["type"] {
  switch (status) {
    case "delivered":
      return "employer_api.webhook.delivery_delivered";
    case "retry_scheduled":
      return "employer_api.webhook.delivery_retry_scheduled";
    case "terminal_failure":
      return "employer_api.webhook.delivery_terminal_failure";
    case "suppressed":
      return "employer_api.webhook.delivery_suppressed";
  }
}
