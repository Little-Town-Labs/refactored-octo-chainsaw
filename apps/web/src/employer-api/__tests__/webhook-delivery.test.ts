import {
  acknowledgeWebhookDelivery,
  assertDossierDeliveryEligible,
  boundedBackoffMs,
  classifyWebhookResponse,
  createWebhookEvent,
  planWebhookAttemptResult,
  recordWebhookDeliveryAttempt,
  type WebhookDeliveryAuditSink,
  type WebhookDeliveryReceiptRecord,
  type WebhookDeliveryRepo,
  type WebhookEventRecord,
} from "../webhook-delivery";

class MemoryWebhookDeliveryRepo implements WebhookDeliveryRepo {
  readonly events: WebhookEventRecord[] = [];
  readonly receipts: WebhookDeliveryReceiptRecord[] = [];

  async createEvent(
    input: Parameters<WebhookDeliveryRepo["createEvent"]>[0],
  ): Promise<WebhookEventRecord> {
    const event: WebhookEventRecord = {
      ...input,
      webhook_event_id: `event_${this.events.length + 1}`,
      created_at: new Date("2026-05-25T12:00:00Z"),
    };
    this.events.push(event);
    return event;
  }

  async recordAttempt(
    input: Parameters<WebhookDeliveryRepo["recordAttempt"]>[0],
  ): Promise<WebhookDeliveryReceiptRecord> {
    const receipt: WebhookDeliveryReceiptRecord = {
      ...input,
      delivery_receipt_id: `receipt_${this.receipts.length + 1}`,
    };
    this.receipts.push(receipt);
    return receipt;
  }
}

describe("F23 webhook delivery", () => {
  it("classifies webhook responses and schedules bounded retries", () => {
    const now = new Date("2026-05-25T12:00:00Z");

    expect(classifyWebhookResponse({ responseStatus: 204 })).toBe("success");
    expect(classifyWebhookResponse({ responseStatus: 422 })).toBe("client_error");
    expect(classifyWebhookResponse({ responseStatus: 503 })).toBe("server_error");
    expect(classifyWebhookResponse({ error: "timeout" })).toBe("timeout");
    expect(planWebhookAttemptResult({ attempt: 1, responseClass: "success", now })).toMatchObject({
      status: "delivered",
      next_attempt_at: null,
    });
    expect(
      planWebhookAttemptResult({ attempt: 2, responseClass: "server_error", now }),
    ).toMatchObject({
      status: "retry_scheduled",
      response_class: "server_error",
    });
    expect(
      planWebhookAttemptResult({ attempt: 8, responseClass: "network_error", now }),
    ).toMatchObject({
      status: "terminal_failure",
      terminal_reason: "attempt_limit_exceeded",
    });
    expect(boundedBackoffMs(20)).toBe(60 * 60 * 1000);
  });

  it("records duplicate acknowledgements without scheduling extra delivery work", () => {
    const now = new Date("2026-05-25T12:00:00Z");

    expect(acknowledgeWebhookDelivery("pending", now)).toEqual({
      status: "delivered",
      duplicate: false,
      acknowledged_at: now,
    });
    expect(acknowledgeWebhookDelivery("delivered", now)).toEqual({
      status: "delivered",
      duplicate: true,
      acknowledged_at: now,
    });
  });

  it("creates webhook events, records attempts, and emits canonical audit events", async () => {
    const repo = new MemoryWebhookDeliveryRepo();
    const events: Parameters<WebhookDeliveryAuditSink["emit"]>[0][] = [];
    const audit: WebhookDeliveryAuditSink = { emit: async (event) => void events.push(event) };

    const webhookEvent = await createWebhookEvent(repo, audit, {
      org_id: "00000000-0000-0000-0000-000000000010",
      event_type: "match.notification.created",
      schema_version: "2026-05-25",
      req_id: "req_1",
      match_id: "match_1",
    });
    const receipt = await recordWebhookDeliveryAttempt(repo, audit, {
      org_id: "00000000-0000-0000-0000-000000000010",
      webhook_event_id: webhookEvent.webhook_event_id,
      webhook_endpoint_id: "endpoint_1",
      attempt: 1,
      now: new Date("2026-05-25T12:00:00Z"),
      responseStatus: 503,
    });

    expect(webhookEvent.payload_hash).toMatch(/^sha256:/);
    expect(receipt).toMatchObject({
      status: "retry_scheduled",
      response_class: "server_error",
      response_status: 503,
    });
    expect(events.map((event) => event.type)).toEqual([
      "employer_api.webhook.event_created",
      "employer_api.webhook.delivery_retry_scheduled",
    ]);
  });

  it("fails closed for dossier delivery until signed projection is available", () => {
    expect(
      assertDossierDeliveryEligible({
        dossier_id: "dossier_1",
        signature_status: "invalid",
        employer_projection: { summary: "No" },
      }),
    ).toBeUndefined();
    expect(
      assertDossierDeliveryEligible({
        dossier_id: "dossier_1",
        signature_status: "valid",
        employer_projection: { summary: "Yes" },
      }),
    ).toEqual({ summary: "Yes" });
  });
});
