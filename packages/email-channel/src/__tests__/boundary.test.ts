import { emailChannelCapability } from "../capabilities.js";
import { createEmailAdapter } from "../adapter.js";
import {
  approvedOutboundMessage,
  inboundEmailEvent,
  optionsWithLinks,
  verifiedLink,
} from "./fixtures.js";

describe("email adapter boundaries", () => {
  it("declares F16-compatible email capability metadata", () => {
    expect(emailChannelCapability.channel_kind).toBe("email");
    expect(emailChannelCapability.supports_threads).toBe(true);
    expect(emailChannelCapability.content_parts).toContain("attachment_ref");
  });

  it("does not expose prohibited raw data through public rendering payloads", () => {
    const adapter = createEmailAdapter(optionsWithLinks([verifiedLink]));
    const result = adapter.renderOutbound(approvedOutboundMessage());

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.refusal.message);
    const serialized = JSON.stringify(result.native_payload);
    expect(serialized).not.toMatch(/counterparty|transcript|parley|score|dossier|secret/i);
  });

  it("keeps product actions classified, not executed", () => {
    const adapter = createEmailAdapter(optionsWithLinks([verifiedLink]));
    const result = adapter.normalizeInbound(
      inboundEmailEvent("evt-direct", "seeker@example.com", "Direct message the employer"),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.refusal.message);
    expect(result.message.intent.family).toBe("direct_counterparty_message");
    expect(result.message.intent.supported).toBe(false);
  });
});
