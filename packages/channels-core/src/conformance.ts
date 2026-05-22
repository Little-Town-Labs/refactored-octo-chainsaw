import type { ChannelAdapter } from "./adapter.js";
import { validateCapability } from "./capabilities.js";
import type { ChannelMessage, JsonObject } from "./message.js";

export interface ConformanceResult {
  readonly adapter_name: string;
  readonly passed: boolean;
  readonly checks: readonly string[];
}

export const runAdapterConformance = (
  adapter: ChannelAdapter,
  inboundFixture: JsonObject,
  outboundFixture: ChannelMessage,
): ConformanceResult => {
  validateCapability(adapter.capability);
  const checks: string[] = ["capability"];

  const normalized = adapter.normalizeInbound(inboundFixture);
  if (!normalized.ok) {
    return { adapter_name: adapter.capability.adapter_name, passed: false, checks };
  }
  checks.push("normalizeInbound");

  const rendered = adapter.renderOutbound(outboundFixture);
  if (isRenderRefusal(rendered)) {
    return { adapter_name: adapter.capability.adapter_name, passed: false, checks };
  }
  checks.push("renderOutbound");

  adapter.acknowledgeInbound(normalized.message);
  checks.push("acknowledgeInbound");

  adapter.reportDelivery({});
  checks.push("reportDelivery");

  return { adapter_name: adapter.capability.adapter_name, passed: true, checks };
};

const isRenderRefusal = (value: unknown): boolean =>
  typeof value === "object" &&
  value !== null &&
  "ok" in value &&
  (value as { readonly ok?: boolean }).ok === false;
