import { buildDossier } from "../build.js";
import { InMemoryDossierRepository } from "../repo.js";
import { dossierInput } from "./fixtures.js";

describe("dossier projections", () => {
  it("stores all four audience projections", async () => {
    const repository = new InMemoryDossierRepository();
    const dossier = await buildDossier({ repository, dossier: dossierInput() });
    const projections = await repository.listProjections(dossier.dossier_id);
    expect(projections.map((projection) => projection.audience).sort()).toEqual([
      "a2a_receiver",
      "auditor",
      "employer",
      "seeker",
    ]);
    expect(dossier.projection_refs.auditor).toBeTruthy();
  });
});
