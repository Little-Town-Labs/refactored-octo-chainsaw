import { LANDING_CONTENT, landingSearchText } from "../landing-content";
import { assertNoProhibitedTerms } from "../no-dashboard-guard";

describe("F21 landing content", () => {
  it("positions Spyglass as conversation-first account setup", () => {
    expect(LANDING_CONTENT.title).toBe("Spyglass");
    expect(LANDING_CONTENT.summary).toContain("conversation");
    expect(LANDING_CONTENT.primaryAction.href).toBe("/sign-up");
    expect(LANDING_CONTENT.secondaryAction.href).toBe("/sign-in");
    expect(LANDING_CONTENT.profileAction.href).toBe("/profile");
  });

  it("describes supported seeker channels", () => {
    expect(LANDING_CONTENT.channelCards.map((card) => card.title)).toEqual([
      "Telegram",
      "Email",
      "Web chat",
    ]);
  });

  it("links public docs and all A2A cards", () => {
    expect(LANDING_CONTENT.agentLinks.map((link) => link.href)).toEqual([
      "/agents.md",
      "/llms.txt",
      "/.well-known/a2a/index.json",
    ]);
    expect(LANDING_CONTENT.a2aCards).toHaveLength(5);
  });

  it("keeps prohibited product paths out of landing links", () => {
    const hrefText = [
      LANDING_CONTENT.primaryAction.href,
      LANDING_CONTENT.secondaryAction.href,
      LANDING_CONTENT.profileAction.href,
      ...LANDING_CONTENT.agentLinks.map((link) => link.href),
      ...LANDING_CONTENT.a2aCards.map((card) => card.href),
    ].join(" ");

    expect(() => assertNoProhibitedTerms(hrefText)).not.toThrow();
    expect(landingSearchText()).toContain("No dashboard");
  });
});
