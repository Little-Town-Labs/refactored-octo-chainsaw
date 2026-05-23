import {
  deliveryOutcome,
  type ChannelAdapter,
  type ChannelMessage,
  type DeliveryOutcome,
} from "@spyglass/channels-core";

import { webChatAuditEvent } from "./audit.js";
import { webChatChannelCapability } from "./capabilities.js";
import { mapWebChatDeliveryStatus } from "./delivery.js";
import { normalizeWebChatInbound } from "./normalize.js";
import { renderWebChatOutbound } from "./render.js";
import type {
  WebChatAdapterOptions,
  WebChatClientEvent,
  WebChatRenderResult,
  WebChatStatusEvent,
} from "./types.js";

export type WebChatChannelAdapter = ChannelAdapter<WebChatClientEvent, WebChatStatusEvent>;

export const createWebChatAdapter = (options: WebChatAdapterOptions): WebChatChannelAdapter => ({
  capability: webChatChannelCapability,
  normalizeInbound(event: WebChatClientEvent) {
    return normalizeWebChatInbound(event, options);
  },
  renderOutbound(message: ChannelMessage): WebChatRenderResult {
    return renderWebChatOutbound(message, options.max_text_chars, options.max_actions);
  },
  acknowledgeInbound(message: ChannelMessage): DeliveryOutcome {
    const audit = webChatAuditEvent({
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
  reportDelivery(result: WebChatStatusEvent): DeliveryOutcome {
    return mapWebChatDeliveryStatus(result, options.now);
  },
});
