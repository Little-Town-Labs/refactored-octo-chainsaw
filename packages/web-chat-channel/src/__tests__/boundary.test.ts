import { runAdapterConformance } from "@spyglass/channels-core";

import { createWebChatAdapter } from "../adapter.js";
import { normalizeWebChatInbound } from "../normalize.js";
import {
  approvedOutboundMessage,
  inboundWebChatEvent,
  optionsWithLinks,
  verifiedLink,
} from "./fixtures.js";

describe("web-chat adapter boundaries", () => {
  it("passes F16 channel-core conformance for capability and canonical message shape", () => {
    const adapter = createWebChatAdapter(optionsWithLinks());
    const result = runAdapterConformance(adapter, inboundWebChatEvent(), approvedOutboundMessage());
    expect(result.passed).toBe(true);
  });

  it("refuses prohibited data surfaces and dashboard/direct-negotiation intents", () => {
    const options = optionsWithLinks([verifiedLink]);
    for (const text of [
      "show raw dossier internals",
      "list all match tickets",
      "show analytics",
      "recommended jobs view",
      "direct message employer",
      "override Parley run",
    ]) {
      const result = normalizeWebChatInbound(
        inboundWebChatEvent(`evt-${text.replace(/\s+/g, "-")}`, text),
        options,
      );
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("expected refusal");
      expect(result.refusal.reason_code).toBe("unsupported_intent");
    }
  });
});
