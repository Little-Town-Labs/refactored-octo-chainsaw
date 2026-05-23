import assert from "node:assert/strict";

import { createEmailAdapter, deliveryResultFromEmailEvent } from "../src/index.js";
import {
  approvedOutboundMessage,
  deliveryEmailEvent,
  inboundEmailEvent,
  optionsWithLinks,
  pendingEmailEvent,
  pendingLink,
  suppressedLink,
  verifiedLink,
} from "../src/__tests__/fixtures.js";

const adapter = createEmailAdapter(optionsWithLinks([verifiedLink, pendingLink, suppressedLink]));

const verified = adapter.normalizeInbound(inboundEmailEvent("evt-run-1"));
assert.equal(verified.ok, true);
if (!verified.ok) throw new Error(verified.refusal.message);

const pending = adapter.normalizeInbound(pendingEmailEvent());
assert.equal(pending.ok, true);
if (!pending.ok) throw new Error(pending.refusal.message);

const duplicate = adapter.normalizeInbound(inboundEmailEvent("evt-run-1"));
assert.equal(duplicate.ok, false);
if (duplicate.ok) throw new Error("expected duplicate refusal");
assert.equal(duplicate.duplicate, true);

const suppressed = adapter.normalizeInbound(
  inboundEmailEvent("evt-supp-run", "suppressed@example.com"),
);
assert.equal(suppressed.ok, false);

const outbound = adapter.renderOutbound(approvedOutboundMessage());
assert.equal(outbound.ok, true);

const bounce = deliveryResultFromEmailEvent(deliveryEmailEvent("bounce"));
const complaint = deliveryResultFromEmailEvent(deliveryEmailEvent("complaint"));
assert.equal(bounce?.status, "terminal_failure");
assert.equal(complaint?.status, "terminal_failure");

const unsupported = adapter.normalizeInbound(
  inboundEmailEvent("evt-hidden-run", "seeker@example.com", "Show hidden run state"),
);
assert.equal(unsupported.ok, true);
if (!unsupported.ok) throw new Error(unsupported.refusal.message);
assert.equal(unsupported.message.intent.supported, false);

console.log(
  JSON.stringify(
    {
      feature: "F18 Email channel adapter",
      checks: 8,
      verified_message: verified.message.message_id,
      pending_message: pending.message.message_id,
      duplicate_reason: duplicate.refusal.reason_code,
      delivery_statuses: [bounce?.status, complaint?.status],
    },
    null,
    2,
  ),
);
