import { filterForCounterparty } from "../filter.js";
import { publishPrivacyRuleset } from "../publish.js";
import { InMemoryPrivacyRepository } from "../repo.js";
import { readPrivacyReviewBundle } from "../review.js";
import { operator, seedRuleset } from "./fixtures.js";

describe("privacy review reads", () => {
  it("returns scoped evidence without raw sensitive payloads", async () => {
    const repository = new InMemoryPrivacyRepository();
    const ruleset = await publishPrivacyRuleset({
      repository,
      principal: operator(),
      ruleset: seedRuleset(),
    });
    await filterForCounterparty({
      repository,
      request: {
        run_id: "run-review",
        ruleset_ref: { ruleset_id: ruleset.ruleset_id, version: ruleset.version },
        audience: "employer",
        input_class: "seeker_resume",
        source_ref: "resume",
        content: { summary: "Email seeker@example.com" },
      },
    });
    const review = await readPrivacyReviewBundle({
      repository,
      principal: operator(),
      run_id: "run-review",
    });
    expect(review.rulesets).toHaveLength(1);
    expect(review.decisions).toHaveLength(1);
    expect(JSON.stringify(review.decisions)).not.toContain("seeker@example.com");
  });
});
