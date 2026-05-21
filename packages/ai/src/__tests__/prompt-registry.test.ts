import { MemoryAiRepository } from "../repo.js";
import { PromptVersionMutationError, publishPromptVersion } from "../prompt-registry.js";
import { promptFixture } from "./fixtures.js";

describe("prompt registry", () => {
  test("publishes immutable prompt versions idempotently", async () => {
    const repo = new MemoryAiRepository();
    const prompt = promptFixture();

    const first = await publishPromptVersion(repo, prompt);
    const second = await publishPromptVersion(repo, prompt);

    expect(second).toBe(first);
    expect(first.status).toBe("published");
  });

  test("rejects mutation of an existing prompt version", async () => {
    const repo = new MemoryAiRepository();
    await publishPromptVersion(repo, promptFixture());

    await expect(
      publishPromptVersion(repo, promptFixture({ template: "changed {{candidate_context}}" })),
    ).rejects.toBeInstanceOf(PromptVersionMutationError);
  });

  test("rejects rubric scoring policy embedded in prompt text", async () => {
    const repo = new MemoryAiRepository();
    await expect(
      publishPromptVersion(repo, promptFixture({ template: "Use rubric weight 0.8" })),
    ).rejects.toHaveProperty("reason_code", "rubric_policy_in_prompt");
  });
});
