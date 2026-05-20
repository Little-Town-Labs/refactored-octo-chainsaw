import { isTimingEligible, noticeTiming } from "../timing.js";

describe("notice timing evidence", () => {
  it("enforces earliest delivery timestamps for advance notice", () => {
    const timing = noticeTiming({
      basis: "advance_notice",
      produced_at: new Date("2026-05-20T00:00:00Z"),
      earliest_delivery_at: new Date("2026-06-03T00:00:00Z"),
      business_days_required: 10,
    });
    expect(isTimingEligible(timing, new Date("2026-06-02T23:59:59Z"))).toBe(false);
    expect(isTimingEligible(timing, new Date("2026-06-03T00:00:00Z"))).toBe(true);
  });
});
