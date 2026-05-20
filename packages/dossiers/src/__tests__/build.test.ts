import { buildDossier } from "../build.js";
import { signingContentHash } from "../canonicalize.js";
import { InMemoryDossierRepository } from "../repo.js";
import { dossierInput } from "./fixtures.js";

describe("deterministic dossier build", () => {
  it("builds stable dossier content from identical evidence", async () => {
    const first = await buildDossier({
      repository: new InMemoryDossierRepository(),
      dossier: dossierInput({ match_id: "00000000-0000-7000-8000-000000000111" }),
    });
    const second = await buildDossier({
      repository: new InMemoryDossierRepository(),
      dossier: dossierInput({
        match_id: "00000000-0000-7000-8000-000000000111",
      }),
    });
    const normalize = (dossier: typeof first) => ({
      ...dossier,
      dossier_id: "stable",
      content_hash: "stable",
      created_at: new Date("2026-05-20T00:00:00Z"),
      projection_refs: {
        seeker: "stable",
        employer: "stable",
        auditor: "stable",
        a2a_receiver: "stable",
      },
    });
    expect(signingContentHash(normalize(first))).toBe(signingContentHash(normalize(second)));
  });

  it("validates rubric totals", async () => {
    await expect(
      buildDossier({
        repository: new InMemoryDossierRepository(),
        dossier: dossierInput({
          rubric_breakdowns: [
            {
              side: "seeker",
              rubric_id: "bad",
              rubric_version: "1",
              dimensions: [{ dimension_id: "fit", score: 1, weight: 1, weighted_score: 1 }],
              total: 2,
            },
          ],
        }),
      }),
    ).rejects.toThrow(/rubric total mismatch|missing employer/);
  });
});
