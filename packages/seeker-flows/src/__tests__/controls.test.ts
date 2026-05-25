import { handleControl } from "../controls.js";
import { activeTicket, createRepos, makeEvent } from "./fixtures.js";

describe("controls", () => {
  it.each(["telegram", "email", "web-chat"] as const)(
    "authorizes pause/resume/withdraw controls on %s",
    (channel) => {
      const repos = createRepos();
      repos.saveTicket(activeTicket());

      const pause = handleControl(makeEvent(channel, "controls", { actionId: "pause" }), repos);
      expect(pause.reasonCode).toBe("control_pause");
      expect(repos.getTicket("seeker-1")?.state).toBe("paused");

      const resume = handleControl(makeEvent(channel, "controls", { actionId: "resume" }), repos);
      expect(resume.reasonCode).toBe("control_resume");
      expect(repos.getTicket("seeker-1")?.state).toBe("active");
    },
  );

  it("blocks terminal tickets", () => {
    const repos = createRepos();
    repos.saveTicket({ ...activeTicket(), state: "closed" });

    expect(
      handleControl(makeEvent("email", "controls", { actionId: "pause" }), repos).decision,
    ).toBe("blocked");
  });
});
