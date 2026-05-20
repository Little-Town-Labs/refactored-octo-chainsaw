import { buildDossier } from "../build.js";
import { InMemoryDossierRepository } from "../repo.js";
import { readDossierReviewBundle } from "../review.js";
import { createTestDossierSigningKey, signDossier } from "../signing.js";
import { verifyDossier } from "../verify.js";
import { dossierInput, operator } from "./fixtures.js";

describe("dossier review", () => {
  it("returns scoped dossier, projection, and verification evidence", async () => {
    const repository = new InMemoryDossierRepository();
    const key = createTestDossierSigningKey();
    const signed = await signDossier({
      repository,
      dossier: await buildDossier({ repository, dossier: dossierInput() }),
      key,
    });
    await verifyDossier({
      repository,
      dossier: signed,
      keys: { resolve: () => key.publicKey },
    });
    const review = await readDossierReviewBundle({
      repository,
      principal: operator(),
      dossier_id: signed.dossier_id,
    });
    expect(review.dossiers).toHaveLength(1);
    expect(review.projections).toHaveLength(4);
    expect(review.verification_events).toHaveLength(1);
    expect(JSON.stringify(review)).not.toContain("raw transcript");
  });
});
