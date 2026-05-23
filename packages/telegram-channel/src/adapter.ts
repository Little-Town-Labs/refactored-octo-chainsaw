import {
  deliveryOutcome,
  type ChannelAdapter,
  type ChannelMessage,
  type DeliveryOutcome,
} from "@spyglass/channels-core";

import { telegramAuditEvent } from "./audit.js";
import { telegramChannelCapability } from "./capabilities.js";
import { mapTelegramDeliveryResult } from "./delivery.js";
import { normalizeTelegramInbound } from "./normalize.js";
import { renderTelegramOutbound } from "./render.js";
import type {
  TelegramAdapterOptions,
  TelegramNativeUpdate,
  TelegramProviderResult,
  TelegramRenderResult,
} from "./types.js";

export type TelegramChannelAdapter = ChannelAdapter<TelegramNativeUpdate, TelegramProviderResult>;

export const createTelegramAdapter = (options: TelegramAdapterOptions): TelegramChannelAdapter => ({
  capability: telegramChannelCapability,
  normalizeInbound(event: TelegramNativeUpdate) {
    return normalizeTelegramInbound(event, options);
  },
  renderOutbound(message: ChannelMessage): TelegramRenderResult {
    return renderTelegramOutbound(message, options.max_text_chars);
  },
  acknowledgeInbound(message: ChannelMessage): DeliveryOutcome {
    const audit = telegramAuditEvent({
      event_type: "channel.delivery_recorded",
      correlation_id: message.audit.correlation_id,
      message,
      reason_code: "accepted_by_provider",
      ...(message.thread.native_thread_ref ? { native_ref: message.thread.native_thread_ref } : {}),
    });
    return deliveryOutcome("accepted_for_delivery", "accepted_by_provider", {
      audit_event_id: audit.event_id,
      ...(message.thread.native_thread_ref ? { native_ref: message.thread.native_thread_ref } : {}),
    });
  },
  reportDelivery(result: TelegramProviderResult): DeliveryOutcome {
    return mapTelegramDeliveryResult(result, options.now);
  },
});
