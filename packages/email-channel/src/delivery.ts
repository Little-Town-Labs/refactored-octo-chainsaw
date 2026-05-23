import {
  classifyProviderResult,
  deliveryOutcome,
  type DeliveryOutcome,
} from "@spyglass/channels-core";

import type { BoundedEmailEvent, EmailProviderResult } from "./types.js";

export const mapEmailDeliveryResult = (
  result: EmailProviderResult,
  now: () => Date = () => new Date(),
): DeliveryOutcome => {
  switch (result.kind) {
    case "accepted":
      return classifyProviderResult({ kind: "accepted", ...nativeRefOptions(result.native_ref) });
    case "delivered":
      return classifyProviderResult({ kind: "delivered", ...nativeRefOptions(result.native_ref) });
    case "deferred":
      return deliveryOutcome("retryable_failure", "delivery_provider_unavailable", {
        ...nativeRefOptions(result.native_ref),
        provider_metadata: boundedResultMetadata(result),
      });
    case "bounce":
    case "complaint":
    case "suppression":
      return deliveryOutcome("terminal_failure", "provider_rejected", {
        ...nativeRefOptions(result.native_ref),
        provider_metadata: boundedResultMetadata(result),
      });
    case "throttled":
      return deliveryOutcome("provider_rate_limited", "provider_throttled", {
        retry_after: result.retry_after ?? new Date(now().getTime() + 60_000),
        ...nativeRefOptions(result.native_ref),
        provider_metadata: boundedResultMetadata(result),
      });
    case "retryable_failure":
      return deliveryOutcome("retryable_failure", "delivery_provider_unavailable", {
        ...nativeRefOptions(result.native_ref),
        provider_metadata: boundedResultMetadata(result),
      });
    case "terminal_failure":
      return deliveryOutcome("terminal_failure", "provider_rejected", {
        ...nativeRefOptions(result.native_ref),
        provider_metadata: boundedResultMetadata(result),
      });
  }
};

export const deliveryResultFromEmailEvent = (
  event: BoundedEmailEvent,
  now: () => Date = () => new Date(),
): DeliveryOutcome | undefined => {
  switch (event.event_kind) {
    case "delivery":
      return mapEmailDeliveryResult(
        { kind: "delivered", ...nativeRefOptions(event.native_ref) },
        now,
      );
    case "deferred":
      return mapEmailDeliveryResult(
        { kind: "deferred", ...nativeRefOptions(event.native_ref) },
        now,
      );
    case "bounce":
      return mapEmailDeliveryResult({ kind: "bounce", ...nativeRefOptions(event.native_ref) }, now);
    case "complaint":
      return mapEmailDeliveryResult(
        { kind: "complaint", ...nativeRefOptions(event.native_ref) },
        now,
      );
    case "suppression":
      return mapEmailDeliveryResult(
        { kind: "suppression", ...nativeRefOptions(event.native_ref) },
        now,
      );
    default:
      return undefined;
  }
};

const boundedResultMetadata = (result: EmailProviderResult): Record<string, unknown> => ({
  provider_kind: result.kind,
  ...("error_code" in result && result.error_code ? { error_code: result.error_code } : {}),
  ...("description" in result && result.description
    ? { description: result.description.slice(0, 256) }
    : {}),
  ...("provider_metadata" in result && result.provider_metadata ? result.provider_metadata : {}),
});

const nativeRefOptions = (native_ref: string | undefined): { readonly native_ref?: string } =>
  native_ref ? { native_ref } : {};
