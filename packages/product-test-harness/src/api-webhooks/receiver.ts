import type {
  ProductWebhookCaptureRecord,
  WebhookDelivery,
  WebhookIdempotencyStatus,
} from "../contracts.js";
import { assertWebhookPayloadBoundary } from "./payload-boundaries.js";
import { verifyWebhookSignature } from "./signing.js";

export interface SyntheticWebhookReceiverOptions {
  readonly run_id: string;
  readonly scenario_id: string;
}

export class SyntheticWebhookReceiver {
  private readonly acceptedEventIds = new Set<string>();

  constructor(private readonly options: SyntheticWebhookReceiverOptions) {}

  receive(delivery: WebhookDelivery): ProductWebhookCaptureRecord {
    const signature = verifyWebhookSignature(delivery);
    const payloadBoundary = assertWebhookPayloadBoundary(delivery.payload);
    const idempotencyStatus = this.idempotencyStatus(
      delivery,
      signature.valid,
      payloadBoundary.valid,
    );
    const delivered =
      delivery.expected_status === "delivered" && signature.valid && payloadBoundary.valid;

    if (idempotencyStatus === "accepted") this.acceptedEventIds.add(delivery.event_id);

    return {
      capture_id: `capture://${delivery.delivery_id}`,
      run_id: this.options.run_id,
      scenario_id: this.options.scenario_id,
      event_id: delivery.event_id,
      delivery_id: delivery.delivery_id,
      event_type: delivery.event_type,
      received_at: delivery.sent_at,
      signature_valid: signature.valid,
      payload_boundary_valid: payloadBoundary.valid,
      idempotency_key: delivery.event_id,
      idempotency_status: idempotencyStatus,
      delivery_status: delivered ? "delivered" : "failed",
      duration_ms: 25,
      artifact_refs: [`webhook-capture://${delivery.delivery_id}`],
      metadata: {
        target_url_ref: delivery.target_url_ref,
        signing_secret_ref: delivery.signing_secret_ref,
        signed_payload_ref: signature.signed_payload_ref,
        forbidden_paths: payloadBoundary.forbidden_paths,
        ...(delivery.failure_reason ? { failure_reason: delivery.failure_reason } : {}),
      },
      ...(delivered
        ? {}
        : {
            failure_reason:
              delivery.failure_reason ?? failureReason(signature.valid, payloadBoundary.valid),
          }),
    };
  }

  private idempotencyStatus(
    delivery: WebhookDelivery,
    signatureValid: boolean,
    payloadBoundaryValid: boolean,
  ): WebhookIdempotencyStatus {
    if (!signatureValid || !payloadBoundaryValid || delivery.expected_status === "failed") {
      return "rejected";
    }
    return this.acceptedEventIds.has(delivery.event_id) ? "duplicate" : "accepted";
  }
}

function failureReason(signatureValid: boolean, payloadBoundaryValid: boolean): string {
  if (!signatureValid) return "invalid_signature";
  if (!payloadBoundaryValid) return "forbidden_payload_fields";
  return "receiver_failure";
}
