import { buildAuditEvent } from "../audit.js";

describe("audit builders", () => {
  it("builds stable audit evidence with reason codes", () => {
    const event = buildAuditEvent({
      eventType: "onboarding",
      principalId: "seeker-1",
      channel: "telegram",
      decision: "accepted",
      reasonCode: "onboarding_active",
      occurredAt: new Date("2026-05-25T12:00:00.000Z"),
    });

    expect(event.auditEventId).toContain("seeker_flow:onboarding:seeker-1");
    expect(event.reasonCode).toBe("onboarding_active");
    expect(event.channel).toBe("telegram");
  });
});
