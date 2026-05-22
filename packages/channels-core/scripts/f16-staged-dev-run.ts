import {
  classifyProviderResult,
  createChannelAuditEvent,
  createFakeAdapter,
  outboundMatchNotification,
  richRealtimeChatCapability,
  runAdapterConformance,
  telegramInboundMessage,
  unsupportedDashboardMessage,
  unsupportedIntent,
} from "../src/index.js";

const inbound = telegramInboundMessage();
const outbound = outboundMatchNotification();
const adapter = createFakeAdapter(richRealtimeChatCapability, inbound);
const conformance = runAdapterConformance(adapter, {}, outbound);
const duplicate = createChannelAuditEvent({
  event_type: "channel.duplicate_suppressed",
  channel_kind: inbound.channel.kind,
  message_id: inbound.message_id,
  reason_code: "duplicate_suppressed",
  correlation_id: inbound.audit.correlation_id,
});
const delivery = classifyProviderResult({ kind: "throttled", retry_after: new Date() });
const unsupported = unsupportedDashboardMessage();

if (!conformance.passed) {
  throw new Error("F16 conformance check failed");
}
if (duplicate.reason_code !== "duplicate_suppressed") {
  throw new Error("F16 duplicate suppression evidence failed");
}
if (delivery.status !== "provider_rate_limited") {
  throw new Error("F16 delivery outcome classification failed");
}
if (unsupported.intent.supported || unsupportedIntent().reason_code !== "unsupported_intent") {
  throw new Error("F16 unsupported intent refusal failed");
}

console.log(
  JSON.stringify(
    {
      feature: "F16",
      normalized_message_id: inbound.message_id,
      outbound_projection_ref: outbound.disclosure.projection_ref,
      conformance_checks: conformance.checks,
      duplicate_event_id: duplicate.event_id,
      delivery_status: delivery.status,
      unsupported_intent: unsupported.intent.family,
    },
    null,
    2,
  ),
);
