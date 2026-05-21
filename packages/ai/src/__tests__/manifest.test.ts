import { publishRuntimeManifest, verifyManifest } from "../manifest.js";
import { publishModelProfileVersion } from "../model-registry.js";
import { publishPromptVersion } from "../prompt-registry.js";
import { MemoryAiRepository } from "../repo.js";
import { manifestFixture, modelFixture, promptFixture } from "./fixtures.js";

describe("runtime manifest", () => {
  test("publishes and verifies active no-hot-reload manifest", async () => {
    const repo = new MemoryAiRepository();
    await publishPromptVersion(repo, promptFixture());
    await publishModelProfileVersion(repo, modelFixture());
    const manifest = await publishRuntimeManifest(repo, manifestFixture());

    expect(verifyManifest(manifest)).toBeNull();
    expect(manifest.no_hot_reload).toBe(true);
  });

  test("refuses active manifest with unpublished prompt or model refs", async () => {
    await expect(
      publishRuntimeManifest(new MemoryAiRepository(), manifestFixture()),
    ).rejects.toHaveProperty("reason_code", "prompt_not_published");
  });

  test("refuses invalid manifest signature/hash", async () => {
    const refusal = verifyManifest(manifestFixture({ content_hash: "sha256:bad" }));
    expect(refusal?.reason_code).toBe("manifest_signature_invalid");
  });
});
