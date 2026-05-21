import { FakeGatewayAdapter } from "../gateway.js";
import { invokeModel } from "../invocation.js";
import { publishRuntimeManifest } from "../manifest.js";
import { publishModelProfileVersion } from "../model-registry.js";
import { publishPromptVersion } from "../prompt-registry.js";
import { MemoryAiRepository } from "../repo.js";
import {
  agent,
  AUDIT_ID,
  manifestFixture,
  modelFixture,
  promptFixture,
  sentinelText,
} from "./fixtures.js";

describe("invocation audit evidence", () => {
  test("records audit refs, hashes, and usage evidence", async () => {
    const repo = new MemoryAiRepository();
    await publishPromptVersion(repo, promptFixture());
    await publishModelProfileVersion(repo, modelFixture());
    await publishRuntimeManifest(repo, manifestFixture());

    const result = await invokeModel(repo, new FakeGatewayAdapter(), {
      caller: agent,
      caller_scope: "ai:invoke",
      run_ref: "run-audit",
      purpose: "seeker_advocate_turn",
      prompt_ref: { prompt_id: "seeker-advocate", version: "1.0.0" },
      model_ref: { model_profile_id: "advocate-reasoning", version: "1.0.0" },
      manifest_ref: { manifest_id: "f12-runtime", version: "1.0.0" },
      variables: { candidate_context: sentinelText() },
      audit_event_id: AUDIT_ID,
    });

    expect(result.record.audit_event_id).toBe(AUDIT_ID);
    expect(result.record.request_hash).toMatch(/^sha256:/);
    expect(result.record.response_hash).toMatch(/^sha256:/);
    expect(result.record.cost_evidence?.actual_cost).not.toBeNull();
  });
});
