import { buildThresholdPosture } from "../thresholds.js";
import { makeEvent } from "./fixtures.js";

describe("thresholds", () => {
  it("accepts bounded threshold values and preferences", () => {
    const posture = buildThresholdPosture(
      makeEvent("telegram", "onboarding", { text: "threshold=0.82; pref=backend" }),
    );

    expect(posture?.thresholds.match).toBe(0.82);
    expect(posture?.preferences.role).toBe("backend");
  });

  it("rejects out-of-range threshold values", () => {
    expect(
      buildThresholdPosture(makeEvent("telegram", "onboarding", { text: "threshold=1.2" })),
    ).toBeUndefined();
  });
});
