import { runF20StagedDevRun } from "../staged-dev-run.js";

describe("F20 staged dev run", () => {
  it("exercises all core F20 flow families", () => {
    const output = runF20StagedDevRun().join("\n");

    expect(output).toContain("f20:onboarding:telegram:onboarding_active");
    expect(output).toContain("f20:onboarding:email:onboarding_active");
    expect(output).toContain("f20:onboarding:web-chat:onboarding_active");
    expect(output).toContain("f20:match:match_notification_sent");
    expect(output).toContain("f20:review:review_acknowledge");
    expect(output).toContain("f20:control:control_pause");
    expect(output).toContain("f20:insight:aggregate_insight_sent");
    expect(output).toContain("f20:demographics:demographic_consented");
    expect(output).toContain("f20:refusal:dashboard_intent_refused");
  });
});
