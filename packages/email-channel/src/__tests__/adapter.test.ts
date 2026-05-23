import { createEmailAdapter } from "../adapter.js";
import {
  inboundEmailEvent,
  optionsWithLinks,
  verifiedLink,
  disabledLink,
  unsubscribedLink,
  suppressedLink,
} from "./fixtures.js";

describe("email adapter inbound normalization", () => {
  it("normalizes verified threaded inbound replies", () => {
    const adapter = createEmailAdapter(optionsWithLinks([verifiedLink]));

    const result = adapter.normalizeInbound(inboundEmailEvent());

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.refusal.message);
    expect(result.message.channel.kind).toBe("email");
    expect(result.message.participant.principal_id).toBe("principal-seeker-1");
    expect(result.message.thread.thread_id).toBe(
      "thread-email-spyglass-reply-abc-m-root-example-com",
    );
    expect(result.message.disclosure.posture).toBe("untrusted_inbound");
    expect(result.message.intent.family).toBe("threshold_tuning");
  });

  it("refuses unknown and blocked senders", () => {
    const adapter = createEmailAdapter(
      optionsWithLinks([verifiedLink, disabledLink, unsubscribedLink, suppressedLink]),
    );

    expect(
      adapter.normalizeInbound(inboundEmailEvent("evt-unknown", "unknown@example.com")).ok,
    ).toBe(false);
    expect(
      adapter.normalizeInbound(inboundEmailEvent("evt-disabled", "disabled@example.com")).ok,
    ).toBe(false);
    expect(adapter.normalizeInbound(inboundEmailEvent("evt-unsub", "unsub@example.com")).ok).toBe(
      false,
    );
    expect(
      adapter.normalizeInbound(inboundEmailEvent("evt-suppressed", "suppressed@example.com")).ok,
    ).toBe(false);
  });

  it("refuses spam and spoof-risk messages", () => {
    const adapter = createEmailAdapter(optionsWithLinks([verifiedLink]));
    const result = adapter.normalizeInbound({
      ...inboundEmailEvent("evt-spam"),
      spam_signals: { provider_status: "spam", spoof_risk: true },
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected refusal");
    expect(result.refusal.reason_code).toBe("unauthorized_participant");
  });

  it("refuses over-size bodies and unsafe attachment sizes", () => {
    const adapter = createEmailAdapter(optionsWithLinks([verifiedLink]));

    expect(
      adapter.normalizeInbound({
        ...inboundEmailEvent("evt-big-body"),
        text_body: "x".repeat(20001),
      }).ok,
    ).toBe(false);
    expect(
      adapter.normalizeInbound({
        ...inboundEmailEvent("evt-big-attachment"),
        attachment_refs: [
          { provider_ref: "att-1", filename: "resume.pdf", size_bytes: 11 * 1024 * 1024 },
        ],
      }).ok,
    ).toBe(false);
  });

  it("classifies unsupported dashboard and direct-negotiation intents", () => {
    const adapter = createEmailAdapter(optionsWithLinks([verifiedLink]));
    const result = adapter.normalizeInbound(
      inboundEmailEvent("evt-hidden", "seeker@example.com", "Show hidden run state"),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.refusal.message);
    expect(result.message.intent.supported).toBe(false);
    expect(result.message.intent.family).toBe("inspect_hidden_run_state");
  });
});
