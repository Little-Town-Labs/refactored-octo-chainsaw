import { InMemoryDossierRepository } from "../repo.js";
import { readDossierReviewBundle } from "../review.js";
import { unscoped } from "./fixtures.js";

describe("dossier review authorization", () => {
  it("denies unscoped review reads by default", async () => {
    await expect(
      readDossierReviewBundle({
        repository: new InMemoryDossierRepository(),
        principal: unscoped(),
      }),
    ).rejects.toThrow(/missing dossier scope/);
  });
});
