import { FakeGatewayAdapter } from "../gateway.js";
import { invokeModel } from "../invocation.js";
import { publishRuntimeManifest } from "../manifest.js";
import { publishModelProfileVersion } from "../model-registry.js";
import { publishPromptVersion } from "../prompt-registry.js";
import { MemoryAiRepository } from "../repo.js";
import { agent, manifestFixture, modelFixture, promptFixture, sentinelText } from "./fixtures.js";

describe("no hot reload posture", () => {
  test("existing invocation records retain dispatch-time refs after newer versions publish", async () => {
    const repo = new MemoryAiRepository();
    await publishPromptVersion(repo, promptFixture());
    await publishModelProfileVersion(repo, modelFixture());
    await publishRuntimeManifest(repo, manifestFixture());

    const result = await invokeModel(repo, new FakeGatewayAdapter(), {
      caller: agent,
      caller_scope: "ai:invoke",
      run_ref: "run-freeze",
      purpose: "seeker_advocate_turn",
      prompt_ref: { prompt_id: "seeker-advocate", version: "1.0.0" },
      model_ref: { model_profile_id: "advocate-reasoning", version: "1.0.0" },
      manifest_ref: { manifest_id: "f12-runtime", version: "1.0.0" },
      variables: { candidate_context: sentinelText() },
    });
    await publishPromptVersion(repo, promptFixture({ version: "1.1.0" }));
    await publishModelProfileVersion(repo, modelFixture({ version: "1.1.0" }));

    expect(result.record.prompt_ref.version).toBe("1.0.0");
    expect(result.record.model_ref.version).toBe("1.0.0");
    expect(result.record.manifest_ref.version).toBe("1.0.0");
  });
});
