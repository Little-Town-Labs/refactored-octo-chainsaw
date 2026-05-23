import { createTelegramAdapter } from "../index.js";
import {
  disabledLink,
  optionsWithLinks,
  pendingLink,
  telegramMessageUpdate,
  verifiedLink,
} from "./fixtures.js";

describe("telegram channel links", () => {
  it("normalizes pending-link verification messages without verified participant identity", () => {
    const adapter = createTelegramAdapter(optionsWithLinks(pendingLink));
    const result = adapter.normalizeInbound(telegramMessageUpdate(301, 43, 4343, "123456"));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.message.participant.link_status).toBe("pending_verification");
      expect(result.message.thread.state).toBe("awaiting_verification");
      expect(result.message.participant.principal_id).toBeUndefined();
    }
  });

  it("refuses unknown senders", () => {
    const adapter = createTelegramAdapter(optionsWithLinks(verifiedLink));
    const result = adapter.normalizeInbound(telegramMessageUpdate(302, 99, 9999));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.refusal.reason_code).toBe("unauthenticated_channel_link");
    }
  });

  it("refuses disabled senders", () => {
    const adapter = createTelegramAdapter(optionsWithLinks(disabledLink));
    const result = adapter.normalizeInbound(telegramMessageUpdate(303, 44, 4444));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.refusal.reason_code).toBe("unauthorized_participant");
    }
  });
});
