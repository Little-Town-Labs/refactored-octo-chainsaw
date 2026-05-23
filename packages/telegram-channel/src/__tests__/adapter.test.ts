import { outboundMatchNotification, runAdapterConformance } from "@spyglass/channels-core";

import { createTelegramAdapter } from "../index.js";
import {
  callbackUpdate,
  optionsWithLinks,
  telegramMessageUpdate,
  verifiedLink,
} from "./fixtures.js";

describe("telegram adapter inbound", () => {
  it("normalizes verified Telegram messages into canonical ChannelMessage values", () => {
    const adapter = createTelegramAdapter(optionsWithLinks(verifiedLink));
    const result = adapter.normalizeInbound(telegramMessageUpdate(401));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.message.channel.kind).toBe("telegram");
      expect(result.message.participant.link_status).toBe("verified");
      expect(result.message.disclosure.posture).toBe("untrusted_inbound");
      expect(result.message.content[0]?.classification).toBe("untrusted_user_input");
      expect(result.message.idempotency_key).toBe("telegram:update:401");
    }
  });

  it("normalizes callback-style acknowledgement actions", () => {
    const adapter = createTelegramAdapter(optionsWithLinks(verifiedLink));
    const result = adapter.normalizeInbound(callbackUpdate(402));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.message.intent.family).toBe("dossier_review_response");
      expect(result.message.content[0]?.text).toBe("review");
    }
  });

  it("suppresses duplicate inbound updates", () => {
    const adapter = createTelegramAdapter(optionsWithLinks(verifiedLink));

    expect(adapter.normalizeInbound(telegramMessageUpdate(403)).ok).toBe(true);
    const duplicate = adapter.normalizeInbound(telegramMessageUpdate(403));

    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) {
      expect(duplicate.refusal.reason_code).toBe("duplicate_suppressed");
      expect(duplicate.duplicate).toBe(true);
    }
  });

  it("refuses malformed and oversized updates", () => {
    const adapter = createTelegramAdapter(optionsWithLinks(verifiedLink));

    const malformed = adapter.normalizeInbound({ update_id: -1 });
    expect(malformed.ok).toBe(false);
    if (!malformed.ok) {
      expect(malformed.refusal.reason_code).toBe("malformed_payload");
    }

    const oversized = adapter.normalizeInbound(
      telegramMessageUpdate(404, 42, 4242, "x".repeat(4097)),
    );
    expect(oversized.ok).toBe(false);
    if (!oversized.ok) {
      expect(oversized.refusal.reason_code).toBe("over_size_payload");
    }
  });

  it("refuses unsupported update kinds", () => {
    const adapter = createTelegramAdapter(optionsWithLinks(verifiedLink));
    const result = adapter.normalizeInbound({ update_id: 405, unsupported: {} });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.refusal.reason_code).toBe("unsupported_intent");
    }
  });

  it("passes channel-core conformance", () => {
    const adapter = createTelegramAdapter(optionsWithLinks(verifiedLink));
    const result = runAdapterConformance(
      adapter,
      telegramMessageUpdate(406),
      outboundMatchNotification(),
    );

    expect(result.passed).toBe(true);
  });
});
