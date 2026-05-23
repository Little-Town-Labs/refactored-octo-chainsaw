import {
  createTelegramAdapter,
  mapTelegramDeliveryResult,
  renderTelegramOutbound,
} from "../src/index.js";
import {
  approvedOutboundMessage,
  callbackUpdate,
  disabledLink,
  optionsWithLinks,
  pendingLink,
  richOutboundMessage,
  telegramMessageUpdate,
  verifiedLink,
} from "../src/__tests__/fixtures.js";

const adapter = createTelegramAdapter(optionsWithLinks(verifiedLink, pendingLink, disabledLink));

const verified = adapter.normalizeInbound(telegramMessageUpdate(700));
const pending = adapter.normalizeInbound(telegramMessageUpdate(701, 43, 4343, "123456"));
const unknown = adapter.normalizeInbound(telegramMessageUpdate(702, 99, 9999));
const duplicateFirst = adapter.normalizeInbound(callbackUpdate(703));
const duplicateSecond = adapter.normalizeInbound(callbackUpdate(703));
const rendered = renderTelegramOutbound(approvedOutboundMessage());
const richRendered = renderTelegramOutbound(richOutboundMessage());
const delivered = mapTelegramDeliveryResult({ ok: true, message_id: 700 });
const throttled = mapTelegramDeliveryResult({
  ok: false,
  error_code: 429,
  retry_after_seconds: 30,
});
const unsupported = adapter.normalizeInbound(telegramMessageUpdate(704, 42, 4242, "show all jobs"));

const checks = [
  verified.ok,
  pending.ok,
  !unknown.ok && unknown.refusal.reason_code === "unauthenticated_channel_link",
  duplicateFirst.ok,
  !duplicateSecond.ok && duplicateSecond.refusal.reason_code === "duplicate_suppressed",
  rendered.ok,
  richRendered.ok && richRendered.native_payload.fallback_used === true,
  delivered.status === "delivered",
  throttled.status === "provider_rate_limited",
  unsupported.ok && unsupported.message.intent.supported === false,
];

if (checks.some((check) => !check)) {
  throw new Error(`F17 staged dev run failed: ${JSON.stringify(checks)}`);
}

console.log(
  JSON.stringify(
    {
      feature: "F17 Telegram channel adapter",
      checks: checks.length,
      verified_message: verified.ok ? verified.message.message_id : null,
      pending_message: pending.ok ? pending.message.message_id : null,
      delivery_statuses: [delivered.status, throttled.status],
    },
    null,
    2,
  ),
);
