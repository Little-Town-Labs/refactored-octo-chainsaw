import {
  A2A_AGENT_CARDS,
  A2A_CARD_IDS,
  a2aCardHref,
  buildA2aCardIndex,
  getA2aCard,
} from "../a2a-cards";

describe("F21 A2A card contracts", () => {
  it("publishes exactly the v0 candidate card set", () => {
    expect(A2A_AGENT_CARDS.map((card) => card.id)).toEqual([...A2A_CARD_IDS]);
    expect(A2A_AGENT_CARDS).toHaveLength(5);
  });

  it("builds stable well-known hrefs for every card", () => {
    const index = buildA2aCardIndex();

    expect(index.version).toBe("v1");
    expect(index.cards).toEqual(
      A2A_AGENT_CARDS.map((card) => ({
        id: card.id,
        href: `/.well-known/a2a/${card.id}.json`,
        availability: card.availability,
        runtime_status: card.runtime_status,
      })),
    );

    for (const card of A2A_AGENT_CARDS) {
      expect(a2aCardHref(card.id)).toBe(`/.well-known/a2a/${card.id}.json`);
    }
  });

  it("marks every card as future interop with deferred runtime behavior", () => {
    for (const card of A2A_AGENT_CARDS) {
      expect(card.availability).toBe("future-interop");
      expect(card.runtime_status).toBe("handler-deferred");
      expect(card.unsupported_actions).toEqual(
        expect.arrayContaining([
          "seeker_dashboard",
          "ticket_list",
          "analytics_view",
          "recommended_jobs",
          "hidden_run_state",
        ]),
      );
      expect(card.docs).toEqual(expect.arrayContaining(["/agents.md", "/llms.txt"]));
    }
  });

  it("returns null for unknown cards", () => {
    expect(getA2aCard("unknown")).toBeNull();
  });
});
