import { validateCapability, type ChannelAdapterCapability } from "./capabilities.js";
import type { DeliveryOutcome } from "./delivery.js";
import type { ChannelRefusal } from "./errors.js";
import type { ChannelMessage, JsonObject } from "./message.js";

export type NormalizeResult =
  | { readonly ok: true; readonly message: ChannelMessage }
  | { readonly ok: false; readonly refusal: ChannelRefusal };

export type RenderResult =
  | { readonly ok: true; readonly native_payload: JsonObject; readonly message: ChannelMessage }
  | { readonly ok: false; readonly refusal: ChannelRefusal };

export interface ChannelAdapter<NativeInbound = JsonObject, NativeOutbound = JsonObject> {
  readonly capability: ChannelAdapterCapability;
  normalizeInbound(event: NativeInbound): NormalizeResult;
  renderOutbound(message: ChannelMessage): RenderResult | NativeOutbound;
  acknowledgeInbound(message: ChannelMessage): DeliveryOutcome;
  reportDelivery(result: NativeOutbound): DeliveryOutcome;
}

export const createFakeAdapter = (
  capability: ChannelAdapterCapability,
  message: ChannelMessage,
): ChannelAdapter => {
  const checkedCapability = validateCapability(capability);
  return {
    capability: checkedCapability,
    normalizeInbound: () => ({ ok: true, message }),
    renderOutbound: (outboundMessage) => ({
      ok: true,
      message: outboundMessage,
      native_payload: { channel: checkedCapability.channel_kind },
    }),
    acknowledgeInbound: () => ({
      status: "accepted_for_delivery",
      reason_code: "accepted_by_provider",
      occurred_at: new Date(),
    }),
    reportDelivery: () => ({
      status: "delivered",
      reason_code: "delivered",
      occurred_at: new Date(),
    }),
  };
};
