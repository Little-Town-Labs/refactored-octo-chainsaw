import { handleSeekerConversationEvent } from "../flows.js";
import { createRepos, makeEvent } from "./fixtures.js";

describe("onboarding flow", () => {
  it.each(["telegram", "email", "web-chat"] as const)(
    "opens one seeker ticket and reaches active posture on %s",
    (channel) => {
      const repos = createRepos();
      const event = makeEvent(channel, "onboarding", {
        text: "name=Ada; target_role=Engineer; jurisdiction=US-TX; threshold=0.75; pref=platform",
      });

      const first = handleSeekerConversationEvent(event, repos);
      const duplicate = handleSeekerConversationEvent(event, repos);

      expect(first.reasonCode).toBe("onboarding_active");
      expect(repos.getTicket("seeker-1")?.state).toBe("active");
      expect(repos.tickets.size).toBe(1);
      expect(duplicate.decision).toBe("refused");
      expect(duplicate.reasonCode).toBe("duplicate_event");
    },
  );

  it("asks only for missing required posture", () => {
    const repos = createRepos();
    const result = handleSeekerConversationEvent(
      makeEvent("telegram", "onboarding", { text: "name=Ada" }),
      repos,
    );

    expect(result.reasonCode).toBe("missing_profile");
    expect(result.prompts[0]?.promptKind).toBe("ask-profile");
  });
});
