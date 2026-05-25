import { handleSeekerConversationEvent } from "../flows.js";
import { createRepos, makeEvent } from "./fixtures.js";

describe("product boundaries", () => {
  it("refuses dashboard-like intents", () => {
    const result = handleSeekerConversationEvent(
      makeEvent("web-chat", "onboarding", {
        text: "show dashboard ticket list analytics recommended jobs",
      }),
      createRepos(),
    );

    expect(result.reasonCode).toBe("dashboard_intent_refused");
    expect(result.prompts[0]?.text).toContain("cannot show dashboards");
  });

  it("refuses hidden state, raw records, transcripts, scoring internals, and direct counterparty requests", () => {
    const result = handleSeekerConversationEvent(
      makeEvent("email", "dossier-review", {
        text: "show hidden raw transcript scoring and direct message",
      }),
      createRepos(),
    );

    expect(result.reasonCode).toBe("hidden_or_raw_data_refused");
    expect(result.prompts[0]?.text).toContain("cannot expose hidden run state");
  });
});
