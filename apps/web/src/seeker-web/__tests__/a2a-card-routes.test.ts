import {
  cardIdFromRouteParam,
  createA2aCardResponse,
  createA2aIndexResponse,
} from "../a2a-card-routes";

async function readJson(response: Response): Promise<unknown> {
  return response.json() as Promise<unknown>;
}

describe("F21 A2A card routes", () => {
  it("serves the card index with all five stable card URLs", async () => {
    const response = createA2aIndexResponse();
    const body = (await readJson(response)) as { cards: Array<{ id: string; href: string }> };

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("cache-control")).toContain("max-age=300");
    expect(body.cards.map((card) => card.id)).toEqual([
      "seeker-intake",
      "employer-intake",
      "match-coordinator",
      "negotiation-participant",
      "dossier-reader",
    ]);
    expect(body.cards.map((card) => card.href)).toEqual([
      "/.well-known/a2a/seeker-intake.json",
      "/.well-known/a2a/employer-intake.json",
      "/.well-known/a2a/match-coordinator.json",
      "/.well-known/a2a/negotiation-participant.json",
      "/.well-known/a2a/dossier-reader.json",
    ]);
  });

  it("serves seeker-intake and dossier-reader cards", async () => {
    const seeker = (await readJson(createA2aCardResponse("seeker-intake.json"))) as {
      id: string;
      runtime_status: string;
    };
    const dossier = (await readJson(createA2aCardResponse("dossier-reader"))) as {
      id: string;
      unsupported_actions: string[];
    };

    expect(seeker).toMatchObject({ id: "seeker-intake", runtime_status: "handler-deferred" });
    expect(dossier.id).toBe("dossier-reader");
    expect(dossier.unsupported_actions).toEqual(expect.arrayContaining(["raw_dossier"]));
  });

  it("serves employer-intake, match-coordinator, and negotiation-participant cards", async () => {
    for (const id of ["employer-intake", "match-coordinator", "negotiation-participant"]) {
      const response = createA2aCardResponse(id);
      const body = (await readJson(response)) as { id: string; availability: string };

      expect(response.status).toBe(200);
      expect(body.id).toBe(id);
      expect(body.availability).toBe("future-interop");
    }
  });

  it("fails closed for unknown cards", async () => {
    const response = createA2aCardResponse("not-real.json");
    const body = (await readJson(response)) as { error: string };

    expect(response.status).toBe(404);
    expect(body.error).toBe("unknown_a2a_card");
  });

  it("normalizes dynamic route params with .json suffixes", () => {
    expect(cardIdFromRouteParam("seeker-intake.json")).toBe("seeker-intake");
    expect(cardIdFromRouteParam("seeker-intake")).toBe("seeker-intake");
  });
});
