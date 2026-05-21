import { publishModelProfileVersion, ModelProfileMutationError } from "../model-registry.js";
import { MemoryAiRepository } from "../repo.js";
import { modelFixture } from "./fixtures.js";

describe("model registry", () => {
  test("publishes immutable model profile versions idempotently", async () => {
    const repo = new MemoryAiRepository();
    const model = modelFixture();

    const first = await publishModelProfileVersion(repo, model);
    const second = await publishModelProfileVersion(repo, model);

    expect(second).toBe(first);
    expect(first.provider).toBe("openai");
  });

  test("rejects mutation of an existing model profile version", async () => {
    const repo = new MemoryAiRepository();
    await publishModelProfileVersion(repo, modelFixture());

    await expect(
      publishModelProfileVersion(repo, modelFixture({ model: "different-model" })),
    ).rejects.toBeInstanceOf(ModelProfileMutationError);
  });
});
