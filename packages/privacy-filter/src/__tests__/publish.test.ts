import { InMemoryPrivacyRepository } from "../repo.js";
import { deprecatePrivacyRuleset, publishPrivacyRuleset } from "../publish.js";
import { operator, seedRuleset, unscoped } from "./fixtures.js";

describe("privacy ruleset publication", () => {
  it("publishes immutable ruleset refs and rejects overwrite attempts", async () => {
    const repository = new InMemoryPrivacyRepository();
    const published = await publishPrivacyRuleset({
      repository,
      principal: operator(),
      ruleset: seedRuleset(),
    });

    expect(published.status).toBe("published");
    expect(published.content_hash).toMatch(/^sha256:/);
    await expect(
      publishPrivacyRuleset({ repository, principal: operator(), ruleset: seedRuleset() }),
    ).rejects.toThrow(/already exists/);
  });

  it("requires publish and deprecate scopes", async () => {
    const repository = new InMemoryPrivacyRepository();
    await expect(
      publishPrivacyRuleset({ repository, principal: unscoped(), ruleset: seedRuleset() }),
    ).rejects.toThrow(/missing privacy-filter scope/);

    const published = await publishPrivacyRuleset({
      repository,
      principal: operator(),
      ruleset: seedRuleset(),
    });
    await expect(
      deprecatePrivacyRuleset({
        repository,
        principal: unscoped(),
        ref: { ruleset_id: published.ruleset_id, version: published.version },
      }),
    ).rejects.toThrow(/missing privacy-filter scope/);
  });
});
