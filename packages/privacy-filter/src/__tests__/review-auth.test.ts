import { InMemoryPrivacyRepository } from "../repo.js";
import { readPrivacyReviewBundle } from "../review.js";
import { unscoped } from "./fixtures.js";

describe("privacy review authorization", () => {
  it("denies unscoped review reads by default", async () => {
    await expect(
      readPrivacyReviewBundle({
        repository: new InMemoryPrivacyRepository(),
        principal: unscoped(),
      }),
    ).rejects.toThrow(/missing privacy-filter scope/);
  });
});
