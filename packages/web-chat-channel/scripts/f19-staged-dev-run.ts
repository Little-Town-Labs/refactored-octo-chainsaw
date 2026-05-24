import { runAdapterConformance } from "@spyglass/channels-core";

import {
  createWebChatAdapter,
  mapWebChatDeliveryStatus,
  renderWebChatOutbound,
  validateWebChatAccessibility,
} from "../src/index.js";
import {
  approvedOutboundMessage,
  inboundWebChatEvent,
  optionsWithLinks,
  pendingLink,
  pendingWebChatEvent,
  richOutboundMessage,
  verifiedLink,
} from "../src/__tests__/fixtures.js";

const adapter = createWebChatAdapter(optionsWithLinks([verifiedLink, pendingLink]));

const authenticated = adapter.normalizeInbound(inboundWebChatEvent("dev-auth"));
const pending = adapter.normalizeInbound(pendingWebChatEvent());
const duplicateFirst = adapter.normalizeInbound(inboundWebChatEvent("dev-dupe"));
const duplicateSecond = adapter.normalizeInbound(inboundWebChatEvent("dev-dupe"));
const unauthenticated = adapter.normalizeInbound({
  ...inboundWebChatEvent("dev-unauth"),
  session: undefined,
});
const rendered = renderWebChatOutbound(richOutboundMessage());
const accessibility = rendered.ok
  ? validateWebChatAccessibility(rendered.native_payload)
  : { ok: false, checks: [] };
const delivery = mapWebChatDeliveryStatus({ status: "acknowledged", render_id: "render-dev" });
const unsupported = adapter.normalizeInbound(
  inboundWebChatEvent("dev-unsupported", "show analytics"),
);
const conformance = runAdapterConformance(
  adapter,
  inboundWebChatEvent("dev-conf"),
  approvedOutboundMessage(),
);

const evidence = {
  authenticated_normalized: authenticated.ok,
  pending_link_normalized: pending.ok,
  duplicate_suppressed: !duplicateFirst.ok
    ? false
    : !duplicateSecond.ok && duplicateSecond.duplicate === true,
  unauthenticated_refused: !unauthenticated.ok,
  rendered: rendered.ok,
  accessibility_validated: accessibility.ok,
  delivery_status: delivery.status,
  unsupported_refused: !unsupported.ok,
  conformance_passed: conformance.passed,
};

console.log(JSON.stringify(evidence, null, 2));

if (!Object.values(evidence).every(Boolean)) {
  process.exitCode = 1;
}
