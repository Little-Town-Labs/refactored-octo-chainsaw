import {
  deliveryOutcome,
  type ChannelAdapter,
  type ChannelMessage,
  type DeliveryOutcome,
} from "@spyglass/channels-core";

import { emailAuditEvent } from "./audit.js";
import { emailChannelCapability } from "./capabilities.js";
import { mapEmailDeliveryResult } from "./delivery.js";
import { normalizeEmailInbound } from "./normalize.js";
import { renderEmailOutbound } from "./render.js";
import type {
  EmailAdapterOptions,
  EmailProviderEvent,
  EmailProviderResult,
  EmailRenderResult,
} from "./types.js";

export type EmailChannelAdapter = ChannelAdapter<EmailProviderEvent, EmailProviderResult>;

export const createEmailAdapter = (options: EmailAdapterOptions): EmailChannelAdapter => ({
  capability: emailChannelCapability,
  normalizeInbound(event: EmailProviderEvent) {
    return normalizeEmailInbound(event, options);
  },
  renderOutbound(message: ChannelMessage): EmailRenderResult {
    return renderEmailOutbound(message, options.max_body_chars, options.max_subject_chars);
  },
  acknowledgeInbound(message: ChannelMessage): DeliveryOutcome {
    const audit = emailAuditEvent({
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
  reportDelivery(result: EmailProviderResult): DeliveryOutcome {
    return mapEmailDeliveryResult(result, options.now);
  },
});
