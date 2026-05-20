import { buildDossier } from "../build.js";
import { InMemoryDossierRepository } from "../repo.js";
import { dossierInput, projections } from "./fixtures.js";

describe("projection gate", () => {
  it("fails closed for conclusive dossiers missing a required projection", async () => {
    await expect(
      buildDossier({
        repository: new InMemoryDossierRepository(),
        dossier: dossierInput({
          projections: projections().filter((projection) => projection.audience !== "a2a_receiver"),
        }),
      }),
    ).rejects.toThrow(/missing_projection/);
  });

  it("allows inconclusive dossiers with projection-missing flags", async () => {
    const dossier = await buildDossier({
      repository: new InMemoryDossierRepository(),
      dossier: dossierInput({
        status: "inconclusive",
        projections: projections().filter((projection) => projection.audience !== "a2a_receiver"),
        inconclusive_flags: [
          {
            reason_code: "tool_failure",
            source_ref: "tool:1",
            resolution_hint: "Retry failed tool before final delivery.",
          },
        ],
      }),
    });
    expect(dossier.status).toBe("inconclusive");
    expect(
      dossier.inconclusive_flags.some((flag) => flag.reason_code === "projection_missing"),
    ).toBe(true);
  });
});
