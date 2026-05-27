import type {
  EmployerApiCredential,
  EmployerApiOperationResult,
  EmployerApiRequest,
  EmployerReqAction,
  ProductScenario,
  SafeMetadata,
  WebhookDelivery,
} from "../contracts.js";
import {
  PTH07_BASE_TIME,
  authorizeEmployerApiRequest,
  createEmployerApiCredential,
  missingScopeCredential,
} from "./credentials.js";
import { withSignedWebhookHeaders } from "./signing.js";

export type ApiWebhookGateId =
  | "authorized-req-lifecycle"
  | "missing-scope-denial"
  | "signed-webhook-delivery"
  | "duplicate-webhook-idempotency"
  | "webhook-failure-evidence"
  | "forbidden-payload-boundary";

export interface ApiWebhookGateConfig {
  readonly gate_id: ApiWebhookGateId;
  readonly scenario_id: string;
  readonly title: string;
  readonly operations: readonly EmployerApiRequest[];
  readonly deliveries: readonly WebhookDelivery[];
}

export const PTH07_SCENARIO_VERSION = "1.0.0";
const PTH07_SIGNING_KEY_MATERIAL = ["pth07", "synthetic", "signing", "key"].join("-");

export const DEFAULT_API_WEBHOOK_GATES: readonly ApiWebhookGateConfig[] = [
  authorizedReqLifecycleGate(),
  missingScopeDenialGate(),
  signedWebhookDeliveryGate(),
  duplicateWebhookIdempotencyGate(),
  webhookFailureEvidenceGate(),
  forbiddenPayloadBoundaryGate(),
];

export const API_WEBHOOK_GATE_IDS: readonly ApiWebhookGateId[] = [
  "authorized-req-lifecycle",
  "missing-scope-denial",
  "signed-webhook-delivery",
  "duplicate-webhook-idempotency",
  "webhook-failure-evidence",
  "forbidden-payload-boundary",
];

export function toApiWebhookProductScenario(config: ApiWebhookGateConfig): ProductScenario {
  return {
    scenario_id: config.scenario_id,
    version: PTH07_SCENARIO_VERSION,
    title: config.title,
    description: "Deterministic employer API and webhook gate scenario.",
    mode: "gate",
    owner: "product-test-harness",
    tags: ["PTH07", "employer-api", "webhook"],
    steps: [],
  };
}

export function evaluateEmployerApiOperation(
  request: EmployerApiRequest,
): EmployerApiOperationResult {
  const authorization = authorizeEmployerApiRequest(request);
  const authorized = authorization.authorized;
  return {
    operation_id: `operation://${request.request_id}`,
    request,
    status: authorized ? "authorized" : "denied",
    ...(authorized ? {} : { reason_code: authorization.reason }),
    emitted_event_refs: authorized ? [`webhook-event://${request.req_ref}/${request.action}`] : [],
    metadata: {
      credential_ref: request.credential?.credential_id ?? "missing",
      raw_secret_persisted: false,
    },
  };
}

function authorizedReqLifecycleGate(): ApiWebhookGateConfig {
  const credential = createEmployerApiCredential();
  return {
    gate_id: "authorized-req-lifecycle",
    scenario_id: "api-webhook.authorized-req-lifecycle",
    title: "Authorized employer req lifecycle",
    operations: [
      reqOperation("create", credential, { title: "Senior platform engineer" }),
      reqOperation("update", credential, { priority: "alpha" }),
      reqOperation("close", credential, { close_reason: "filled" }),
    ],
    deliveries: [
      lifecycleDelivery({
        event_id: "evt-pth07-req-created",
        delivery_id: "del-pth07-req-created",
        event_type: "employer.req.created",
      }),
      lifecycleDelivery({
        event_id: "evt-pth07-req-updated",
        delivery_id: "del-pth07-req-updated",
        event_type: "employer.req.updated",
      }),
      lifecycleDelivery({
        event_id: "evt-pth07-req-closed",
        delivery_id: "del-pth07-req-closed",
        event_type: "employer.req.closed",
      }),
    ],
  };
}

function missingScopeDenialGate(): ApiWebhookGateConfig {
  return {
    gate_id: "missing-scope-denial",
    scenario_id: "api-webhook.missing-scope-denial",
    title: "Missing-scope employer API denial",
    operations: [reqOperation("create", missingScopeCredential(), { title: "Denied req" })],
    deliveries: [],
  };
}

function signedWebhookDeliveryGate(): ApiWebhookGateConfig {
  return {
    gate_id: "signed-webhook-delivery",
    scenario_id: "api-webhook.signed-webhook-delivery",
    title: "Signed webhook delivery",
    operations: [],
    deliveries: [
      lifecycleDelivery({
        event_id: "evt-pth07-signed",
        delivery_id: "del-pth07-signed",
        event_type: "employer.req.created",
      }),
    ],
  };
}

function duplicateWebhookIdempotencyGate(): ApiWebhookGateConfig {
  return {
    gate_id: "duplicate-webhook-idempotency",
    scenario_id: "api-webhook.duplicate-webhook-idempotency",
    title: "Duplicate webhook idempotency",
    operations: [],
    deliveries: [
      lifecycleDelivery({
        event_id: "evt-pth07-duplicate",
        delivery_id: "del-pth07-duplicate-first",
        event_type: "employer.req.updated",
      }),
      lifecycleDelivery({
        event_id: "evt-pth07-duplicate",
        delivery_id: "del-pth07-duplicate-second",
        event_type: "employer.req.updated",
      }),
    ],
  };
}

function webhookFailureEvidenceGate(): ApiWebhookGateConfig {
  return {
    gate_id: "webhook-failure-evidence",
    scenario_id: "api-webhook.webhook-failure-evidence",
    title: "Webhook failure evidence",
    operations: [],
    deliveries: [
      lifecycleDelivery({
        event_id: "evt-pth07-failure",
        delivery_id: "del-pth07-failure",
        event_type: "employer.req.updated",
        expected_status: "failed",
        failure_reason: "receiver_unavailable",
      }),
    ],
  };
}

function forbiddenPayloadBoundaryGate(): ApiWebhookGateConfig {
  return {
    gate_id: "forbidden-payload-boundary",
    scenario_id: "api-webhook.forbidden-payload-boundary",
    title: "Forbidden webhook payload boundary",
    operations: [],
    deliveries: [
      lifecycleDelivery({
        event_id: "evt-pth07-forbidden",
        delivery_id: "del-pth07-forbidden",
        event_type: "employer.req.created",
        payload: {
          event_id: "evt-pth07-forbidden",
          req_ref: "req://alpha/pth07-primary",
          employer_ref: "employer://alpha/acme-health",
          seeker: {
            protected_class: "forbidden-synthetic-marker",
          },
        },
      }),
    ],
  };
}

function reqOperation(
  action: EmployerReqAction,
  credential: EmployerApiCredential,
  payload: SafeMetadata,
): EmployerApiRequest {
  return {
    request_id: `req-op-pth07-${action}`,
    action,
    req_ref: "req://alpha/pth07-primary",
    credential,
    required_scopes: ["req:write"],
    submitted_at: PTH07_BASE_TIME,
    payload,
  };
}

function lifecycleDelivery(input: {
  readonly event_id: string;
  readonly delivery_id: string;
  readonly event_type: string;
  readonly expected_status?: "delivered" | "failed";
  readonly failure_reason?: string;
  readonly payload?: SafeMetadata;
}): WebhookDelivery {
  return withSignedWebhookHeaders({
    event_id: input.event_id,
    delivery_id: input.delivery_id,
    event_type: input.event_type,
    target_url_ref: "webhook-endpoint://employer/pth07",
    sent_at: PTH07_BASE_TIME,
    payload:
      input.payload ??
      ({
        event_id: input.event_id,
        req_ref: "req://alpha/pth07-primary",
        employer_ref: "employer://alpha/acme-health",
        event_type: input.event_type,
        alpha_posture: "informational_only",
      } satisfies SafeMetadata),
    signing_secret_ref: "signing-key://redacted/pth07",
    signing_secret: PTH07_SIGNING_KEY_MATERIAL,
    expected_status: input.expected_status ?? "delivered",
    ...(input.failure_reason ? { failure_reason: input.failure_reason } : {}),
  });
}
