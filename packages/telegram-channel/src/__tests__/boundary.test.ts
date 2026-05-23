import { createChannelMessage } from "@spyglass/channels-core";

import { createTelegramAdapter, renderTelegramOutbound } from "../index.js";
import {
  approvedOutboundMessage,
  optionsWithLinks,
  telegramMessageUpdate,
  verifiedLink,
} from "./fixtures.js";

describe("telegram adapter boundaries", () => {
  it("classifies dashboard and direct-negotiation intents as unsupported", () => {
    const adapter = createTelegramAdapter(optionsWithLinks(verifiedLink));
    const result = adapter.normalizeInbound(telegramMessageUpdate(601, 42, 4242, "show all jobs"));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.message.intent.supported).toBe(false);
      expect(result.message.intent.family).toBe("browse_all_jobs");
    }
  });

  it("does not expose prohibited data surfaces through outbound rendering", () => {
    const message = createChannelMessage({
      ...approvedOutboundMessage(),
      idempotency_key: "outbound:prohibited",
      metadata: {
        raw_counterparty_record: { salary: "hidden" },
        canonical_transcript: "not for adapter",
        hidden_parley_state: { scratch: true },
        unfiltered_dossier: { private: true },
      },
    });

    const result = renderTelegramOutbound(message);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.stringify(result.native_payload)).not.toContain("hidden");
      expect(JSON.stringify(result.native_payload)).not.toContain("transcript");
      expect(JSON.stringify(result.native_payload)).not.toContain("parley");
      expect(JSON.stringify(result.native_payload)).not.toContain("dossier");
    }
  });
});
