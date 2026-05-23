import {
  ALLOWED_SEEKER_INTENTS,
  UNSUPPORTED_SEEKER_INTENTS,
  assertNoUnsupportedIntent,
  classifySeekerIntent,
  unsupportedDashboardMessage,
  unsupportedIntent,
} from "../index.js";

describe("seeker channel intents", () => {
  it("recognizes all allowed seeker conversational intents", () => {
    for (const intent of ALLOWED_SEEKER_INTENTS) {
      expect(classifySeekerIntent(intent)).toEqual({ family: intent, supported: true });
    }
  });

  it("recognizes unsupported dashboard and direct-negotiation intents", () => {
    for (const intent of UNSUPPORTED_SEEKER_INTENTS) {
      expect(classifySeekerIntent(intent)).toEqual({ family: intent, supported: false });
      expect(() => assertNoUnsupportedIntent(intent)).toThrow("Unsupported");
    }
  });

  it("maps unsupported dashboard requests to unsupported_intent refusals", () => {
    const message = unsupportedDashboardMessage();

    expect(message.intent.supported).toBe(false);
    expect(unsupportedIntent()).toMatchObject({
      status: "unsupported",
      reason_code: "unsupported_intent",
      audit_required: true,
    });
  });
});
