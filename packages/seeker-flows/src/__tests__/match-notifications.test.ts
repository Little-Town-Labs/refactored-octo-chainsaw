import { handleMatchNotification } from "../match-notifications.js";
import { activeTicket, createRepos, matchEvent } from "./fixtures.js";

describe("match notifications", () => {
  it.each(["telegram", "email", "web-chat"] as const)(
    "sends only approved projection-backed notifications for %s fixtures",
    (channel) => {
      const repos = createRepos();
      repos.saveTicket(activeTicket());

      const result = handleMatchNotification(matchEvent({ channel }), repos);

      expect(result.reasonCode).toBe("match_notification_sent");
      expect(result.prompts[0]?.channel).toBe(channel);
      expect(result.prompts[0]?.text).toContain("approved summary");
    },
  );

  it.each([{ approvedProjectionRef: undefined }, { stale: true }, { jurisdictionBlocked: true }])(
    "fails closed for invalid event %#",
    (override) => {
      const repos = createRepos();
      repos.saveTicket(activeTicket());

      const result = handleMatchNotification(matchEvent(override), repos);

      expect(result.decision).toBe("blocked");
      expect(result.prompts).toHaveLength(0);
    },
  );

  it("suppresses duplicate match notifications", () => {
    const repos = createRepos();
    repos.saveTicket(activeTicket());

    expect(handleMatchNotification(matchEvent(), repos).decision).toBe("sent");
    expect(handleMatchNotification(matchEvent(), repos).decision).toBe("duplicate");
  });
});
