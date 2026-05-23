import {
  classifyProviderResult,
  deliveryOutcome,
  type DeliveryOutcome,
} from "@spyglass/channels-core";

import type { TelegramProviderResult } from "./types.js";

export const mapTelegramDeliveryResult = (
  result: TelegramProviderResult,
  now: () => Date = () => new Date(),
): DeliveryOutcome => {
  if (result.ok) {
    return classifyProviderResult({
      kind: "delivered",
      ...(result.message_id ? { native_ref: `telegram-message:${result.message_id}` } : {}),
    });
  }

  if (result.retry_after_seconds !== undefined || result.error_code === 429) {
    return deliveryOutcome("provider_rate_limited", "provider_throttled", {
      retry_after: new Date(now().getTime() + (result.retry_after_seconds ?? 60) * 1000),
      provider_metadata: boundedProviderMetadata(result),
      ...(result.native_ref ? { native_ref: result.native_ref } : {}),
    });
  }

  if (!result.error_code || result.error_code >= 500) {
    return deliveryOutcome("retryable_failure", "delivery_provider_unavailable", {
      provider_metadata: boundedProviderMetadata(result),
      ...(result.native_ref ? { native_ref: result.native_ref } : {}),
    });
  }

  return deliveryOutcome("terminal_failure", "provider_rejected", {
    provider_metadata: boundedProviderMetadata(result),
    ...(result.native_ref ? { native_ref: result.native_ref } : {}),
  });
};

const boundedProviderMetadata = (result: TelegramProviderResult): Record<string, unknown> => {
  if (result.ok) {
    return {};
  }
  return {
    error_code: result.error_code,
    description: result.description?.slice(0, 256),
  };
};
