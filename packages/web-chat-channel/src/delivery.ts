import { deliveryOutcome, type DeliveryOutcome } from "@spyglass/channels-core";

import type { WebChatStatusEvent } from "./types.js";

export const mapWebChatDeliveryStatus = (
  result: WebChatStatusEvent = {},
  now: () => Date = () => new Date(),
): DeliveryOutcome => {
  const occurred_at = now();
  const native_ref = result.native_ref ?? result.render_id ?? result.message_id;
  const retry_after = parseDate(result.retry_after);
  const provider_metadata = {
    web_chat_status: result.status ?? "rendered",
    ...(result.reason ? { reason: result.reason } : {}),
  };

  switch (result.status ?? "rendered") {
    case "rendered":
    case "displayed":
    case "acknowledged":
      return deliveryOutcome("delivered", "delivered", {
        occurred_at,
        ...(native_ref ? { native_ref } : {}),
        provider_metadata,
      });
    case "retryable_failure":
      return deliveryOutcome("retryable_failure", "delivery_provider_unavailable", {
        occurred_at,
        ...(native_ref ? { native_ref } : {}),
        ...(retry_after ? { retry_after } : {}),
        provider_metadata,
      });
    case "terminal_failure":
    case "expired":
    case "cancelled":
      return deliveryOutcome("terminal_failure", "provider_rejected", {
        occurred_at,
        ...(native_ref ? { native_ref } : {}),
        provider_metadata,
      });
    case "refused":
      return deliveryOutcome("refused", "unauthorized_participant", {
        occurred_at,
        ...(native_ref ? { native_ref } : {}),
        provider_metadata,
      });
    case "unsupported":
      return deliveryOutcome("unsupported", "unsupported_intent", {
        occurred_at,
        ...(native_ref ? { native_ref } : {}),
        provider_metadata,
      });
    case "duplicate":
      return deliveryOutcome("refused", "duplicate_suppressed", {
        occurred_at,
        ...(native_ref ? { native_ref } : {}),
        provider_metadata,
      });
  }
};

const parseDate = (value: string | Date | undefined): Date | undefined => {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};
