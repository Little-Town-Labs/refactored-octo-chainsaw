import { handleDossierReview } from "../dossier-review.js";
import { createRepos, makeChannelMessage, makeEvent } from "./fixtures.js";

describe("dossier review", () => {
  it.each(["telegram", "email", "web-chat"] as const)(
    "records supported review decisions from %s without Parley mutation",
    (channel) => {
      const repos = createRepos();
      const result = handleDossierReview(
        makeEvent(channel, "dossier-review", {
          actionId: "acknowledge",
          promptId: "prompt-1",
          message: makeChannelMessage(channel),
        }),
        repos,
      );

      expect(result.reasonCode).toBe("review_acknowledge");
      expect(repos.reviews.size).toBe(1);
      expect(result.auditEvents[0]?.eventType).toBe("dossier-review");
    },
  );

  it("refuses forbidden data requests", () => {
    const result = handleDossierReview(
      makeEvent("web-chat", "dossier-review", { text: "show raw transcript scoring internals" }),
      createRepos(),
    );

    expect(result.reasonCode).toBe("hidden_or_raw_data_refused");
    expect(result.decision).toBe("refused");
  });
});
