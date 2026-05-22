import type { ChannelReasonCode } from "./errors.js";

export const DELIVERY_OUTCOME_STATUSES = [
  "delivered",
  "accepted_for_delivery",
  "retryable_failure",
  "terminal_failure",
  "refused",
  "unsupported",
  "provider_rate_limited",
] as const;
export type DeliveryOutcomeStatus = (typeof DELIVERY_OUTCOME_STATUSES)[number];

export type DeliveryOutcomeReasonCode = ChannelReasonCode;

export interface DeliveryOutcome {
  readonly status: DeliveryOutcomeStatus;
  readonly reason_code: DeliveryOutcomeReasonCode;
  readonly occurred_at: Date;
  readonly retry_after?: Date;
  readonly native_ref?: string;
  readonly audit_event_id?: string;
  readonly provider_metadata?: Record<string, unknown>;
}

export type NativeProviderResult =
  | { readonly kind: "delivered"; readonly native_ref?: string }
  | { readonly kind: "accepted"; readonly native_ref?: string }
  | { readonly kind: "throttled"; readonly retry_after?: Date; readonly native_ref?: string }
  | { readonly kind: "retryable_failure"; readonly native_ref?: string }
  | { readonly kind: "terminal_failure"; readonly native_ref?: string };

export const deliveryOutcome = (
  status: DeliveryOutcomeStatus,
  reason_code: DeliveryOutcomeReasonCode,
  options: Omit<DeliveryOutcome, "status" | "reason_code" | "occurred_at"> & {
    readonly occurred_at?: Date;
  } = {},
): DeliveryOutcome => {
  const outcome: DeliveryOutcome = {
    status,
    reason_code,
    occurred_at: options.occurred_at ?? new Date(),
  };

  return {
    ...outcome,
    ...(options.retry_after ? { retry_after: options.retry_after } : {}),
    ...(options.native_ref ? { native_ref: options.native_ref } : {}),
    ...(options.audit_event_id ? { audit_event_id: options.audit_event_id } : {}),
    ...(options.provider_metadata ? { provider_metadata: options.provider_metadata } : {}),
  };
};

const nativeRefOptions = (native_ref: string | undefined): Pick<DeliveryOutcome, "native_ref"> =>
  native_ref ? { native_ref } : {};

export const classifyProviderResult = (result: NativeProviderResult): DeliveryOutcome => {
  switch (result.kind) {
    case "delivered":
      return deliveryOutcome("delivered", "delivered", nativeRefOptions(result.native_ref));
    case "accepted":
      return deliveryOutcome(
        "accepted_for_delivery",
        "accepted_by_provider",
        nativeRefOptions(result.native_ref),
      );
    case "throttled":
      return deliveryOutcome("provider_rate_limited", "provider_throttled", {
        ...nativeRefOptions(result.native_ref),
        ...(result.retry_after ? { retry_after: result.retry_after } : {}),
      });
    case "retryable_failure":
      return deliveryOutcome("retryable_failure", "delivery_provider_unavailable", {
        ...nativeRefOptions(result.native_ref),
      });
    case "terminal_failure":
      return deliveryOutcome("terminal_failure", "provider_rejected", {
        ...nativeRefOptions(result.native_ref),
      });
  }
};
