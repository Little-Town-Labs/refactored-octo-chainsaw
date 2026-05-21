import { FakeGatewayAdapter } from "../gateway.js";
import { invokeModel } from "../invocation.js";
import { publishRuntimeManifest } from "../manifest.js";
import { publishModelProfileVersion } from "../model-registry.js";
import { publishPromptVersion } from "../prompt-registry.js";
import { MemoryAiRepository } from "../repo.js";
import { agent, manifestFixture, modelFixture, promptFixture, sentinelText } from "./fixtures.js";

describe("usage metadata risk evidence", () => {
  test("marks invocation usage incomplete when gateway omits usage metadata", async () => {
    const repo = new MemoryAiRepository();
    await publishPromptVersion(repo, promptFixture());
    await publishModelProfileVersion(repo, modelFixture());
    await publishRuntimeManifest(repo, manifestFixture());

    const result = await invokeModel(repo, new FakeGatewayAdapter({ omitUsage: true }), {
      caller: agent,
      caller_scope: "ai:invoke",
      run_ref: "run-usage",
      purpose: "seeker_advocate_turn",
      prompt_ref: { prompt_id: "seeker-advocate", version: "1.0.0" },
      model_ref: { model_profile_id: "advocate-reasoning", version: "1.0.0" },
      manifest_ref: { manifest_id: "f12-runtime", version: "1.0.0" },
      variables: { candidate_context: sentinelText() },
    });

    expect(result.record.status).toBe("usage_incomplete");
    expect(result.record.reason_code).toBe("usage_metadata_missing");
  });
});
