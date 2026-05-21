import { strict as assert } from "node:assert";

import {
  FakeGatewayAdapter,
  invokeModel,
  MemoryAiRepository,
  publishModelProfileVersion,
  publishPromptVersion,
  publishRuntimeManifest,
  reviewAiRuntimeEvidence,
} from "../src/index.js";
import {
  agent,
  manifestFixture,
  modelFixture,
  operator,
  promptFixture,
  sentinelText,
} from "../src/__tests__/fixtures.js";

const repository = new MemoryAiRepository();

const prompt = await publishPromptVersion(repository, promptFixture());
const model = await publishModelProfileVersion(repository, modelFixture());
const manifest = await publishRuntimeManifest(repository, manifestFixture());

const refusedMissing = await invokeModel(repository, new FakeGatewayAdapter(), {
  caller: agent,
  caller_scope: "ai:invoke",
  run_ref: "",
  purpose: "seeker_advocate_turn",
  prompt_ref: { prompt_id: "", version: "1.0.0" },
  model_ref: { model_profile_id: model.model_profile_id, version: model.version },
  manifest_ref: { manifest_id: manifest.manifest_id, version: manifest.version },
  variables: {},
});
assert.equal(refusedMissing.ok, false);
assert.equal(refusedMissing.record.reason_code, "missing_required_ref");

const accepted = await invokeModel(repository, new FakeGatewayAdapter(), {
  caller: agent,
  caller_scope: "ai:invoke",
  run_ref: "run-f12",
  purpose: "seeker_advocate_turn",
  prompt_ref: { prompt_id: prompt.prompt_id, version: prompt.version },
  model_ref: { model_profile_id: model.model_profile_id, version: model.version },
  manifest_ref: { manifest_id: manifest.manifest_id, version: manifest.version },
  variables: { candidate_context: sentinelText("F12 staged candidate context") },
});
assert.equal(accepted.ok, true);
assert.equal(accepted.record.status, "completed");

await publishPromptVersion(repository, promptFixture({ version: "1.1.0" }));
await publishModelProfileVersion(repository, modelFixture({ version: "1.1.0" }));
assert.equal(accepted.record.prompt_ref.version, "1.0.0");
assert.equal(accepted.record.model_ref.version, "1.0.0");

const review = await reviewAiRuntimeEvidence(repository, operator);
assert.equal(review.ok, true);

console.log(
  JSON.stringify(
    {
      prompt: `${prompt.prompt_id}@${prompt.version}`,
      model: `${model.model_profile_id}@${model.version}`,
      manifest: `${manifest.manifest_id}@${manifest.version}`,
      refused: refusedMissing.record.reason_code,
      accepted: accepted.record.status,
      request_hash: accepted.record.request_hash,
      response_hash: accepted.record.response_hash,
      frozen_prompt_ref: accepted.record.prompt_ref,
      frozen_model_ref: accepted.record.model_ref,
      review_prompts: review.ok ? review.prompts.length : 0,
    },
    null,
    2,
  ),
);
