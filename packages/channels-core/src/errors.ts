import type { DeliveryOutcomeReasonCode, DeliveryOutcomeStatus } from "./delivery.js";

export const CHANNEL_REASON_CODES = [
  "delivered",
  "accepted_by_provider",
  "unsupported_intent",
  "unauthenticated_channel_link",
  "unauthorized_participant",
  "malformed_payload",
  "over_size_payload",
  "privacy_projection_unavailable",
  "delivery_provider_unavailable",
  "provider_throttled",
  "provider_rejected",
  "duplicate_suppressed",
] as const;
export type ChannelReasonCode = (typeof CHANNEL_REASON_CODES)[number];

export interface ChannelRefusal {
  readonly status: Extract<DeliveryOutcomeStatus, "refused" | "unsupported">;
  readonly reason_code: ChannelReasonCode;
  readonly message: string;
  readonly audit_required: true;
}

export const refusal = (
  reason_code: ChannelReasonCode,
  message: string,
  status: Extract<DeliveryOutcomeStatus, "refused" | "unsupported"> = "refused",
): ChannelRefusal => ({
  status,
  reason_code,
  message,
  audit_required: true,
});

export const unauthenticatedLink = (): ChannelRefusal =>
  refusal("unauthenticated_channel_link", "Channel link is not verified");

export const unauthorizedParticipant = (): ChannelRefusal =>
  refusal("unauthorized_participant", "Participant is not authorized for this channel action");

export const malformedPayload = (): ChannelRefusal =>
  refusal("malformed_payload", "Native channel payload is malformed");

export const overSizePayload = (): ChannelRefusal =>
  refusal("over_size_payload", "Native channel payload exceeds channel-core limits");

export const missingPrivacyProjection = (): ChannelRefusal =>
  refusal("privacy_projection_unavailable", "Outbound message is missing approved projection");

export const unsupportedIntent = (): ChannelRefusal =>
  refusal(
    "unsupported_intent",
    "Intent is outside the seeker channel product scope",
    "unsupported",
  );

export const providerFailureReason = (
  retryable: boolean,
): Extract<DeliveryOutcomeReasonCode, "delivery_provider_unavailable" | "provider_rejected"> =>
  retryable ? "delivery_provider_unavailable" : "provider_rejected";
