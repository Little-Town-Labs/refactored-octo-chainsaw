import { handleAggregateInsight } from "../aggregate-insights.js";
import { activeTicket, createRepos, fixedNow } from "./fixtures.js";

describe("aggregate insights", () => {
  it.each(["telegram", "email", "web-chat"] as const)(
    "sends approved aggregate reports on %s without dashboard data",
    (channel) => {
      const repos = createRepos();
      repos.saveTicket(activeTicket());

      const result = handleAggregateInsight(
        {
          seekerId: "seeker-1",
          channel,
          windowStart: fixedNow,
          windowEnd: new Date("2026-05-25T13:00:00.000Z"),
          aggregateCounts: { considered: 3 },
          aggregateScores: { median: 0.7 },
          dataSourceRefs: ["aggregate:1"],
          thresholdCheckIn: "Adjust threshold?",
        },
        repos,
      );

      expect(result.reasonCode).toBe("aggregate_insight_sent");
      expect(result.prompts[0]?.disclosureClass).toBe("aggregate-approved");
      expect(result.prompts[0]?.text).not.toMatch(/dashboard|ticket list|raw employer/i);
    },
  );

  it("blocks paused and duplicate scheduled reports", () => {
    const repos = createRepos();
    repos.saveTicket({ ...activeTicket(), state: "paused" });
    const input = {
      seekerId: "seeker-1",
      channel: "email" as const,
      windowStart: fixedNow,
      windowEnd: new Date("2026-05-25T13:00:00.000Z"),
      aggregateCounts: {},
      aggregateScores: {},
      dataSourceRefs: ["aggregate:1"],
    };

    expect(handleAggregateInsight(input, repos).decision).toBe("blocked");
    repos.saveTicket(activeTicket());
    expect(
      handleAggregateInsight({ ...input, windowStart: new Date("2026-05-26T12:00:00.000Z") }, repos)
        .decision,
    ).toBe("sent");
    expect(
      handleAggregateInsight({ ...input, windowStart: new Date("2026-05-26T12:00:00.000Z") }, repos)
        .decision,
    ).toBe("duplicate");
  });
});
