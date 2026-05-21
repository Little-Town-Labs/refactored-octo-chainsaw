import { publishRuntimeManifest } from "../manifest.js";
import { publishModelProfileVersion } from "../model-registry.js";
import { publishPromptVersion } from "../prompt-registry.js";
import { MemoryAiRepository } from "../repo.js";
import { reviewAiRuntimeEvidence } from "../review.js";
import { agent, manifestFixture, modelFixture, operator, promptFixture } from "./fixtures.js";

describe("AI runtime review", () => {
  test("scoped reviewer reconstructs prompt/model/manifest evidence", async () => {
    const repo = new MemoryAiRepository();
    await publishPromptVersion(repo, promptFixture());
    await publishModelProfileVersion(repo, modelFixture());
    await publishRuntimeManifest(repo, manifestFixture());

    const result = await reviewAiRuntimeEvidence(repo, operator);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.prompts).toHaveLength(1);
      expect(result.models).toHaveLength(1);
      expect(result.manifests).toHaveLength(1);
    }
  });

  test("unscoped reviewer fails closed", async () => {
    const result = await reviewAiRuntimeEvidence(new MemoryAiRepository(), agent);
    expect(result.ok).toBe(false);
  });
});
