import { FakeGatewayAdapter } from "../gateway.js";
import { invokeModel } from "../invocation.js";
import { publishRuntimeManifest } from "../manifest.js";
import { publishModelProfileVersion } from "../model-registry.js";
import { publishPromptVersion } from "../prompt-registry.js";
import { MemoryAiRepository } from "../repo.js";
import { agent, manifestFixture, modelFixture, promptFixture, sentinelText } from "./fixtures.js";

describe("governed model invocation", () => {
  test("accepts invocation with frozen prompt/model/manifest refs", async () => {
    const repo = await seededRepo();
    const result = await invokeModel(repo, new FakeGatewayAdapter(), {
      caller: agent,
      caller_scope: "ai:invoke",
      run_ref: "run-1",
      purpose: "seeker_advocate_turn",
      prompt_ref: { prompt_id: "seeker-advocate", version: "1.0.0" },
      model_ref: { model_profile_id: "advocate-reasoning", version: "1.0.0" },
      manifest_ref: { manifest_id: "f12-runtime", version: "1.0.0" },
      variables: { candidate_context: sentinelText() },
    });

    expect(result.ok).toBe(true);
    expect(result.record.status).toBe("completed");
    expect(result.record.prompt_ref.version).toBe("1.0.0");
    expect(result.record.model_ref.version).toBe("1.0.0");
  });

  test("refuses missing required refs", async () => {
    const repo = new MemoryAiRepository();
    const result = await invokeModel(repo, new FakeGatewayAdapter(), {
      caller: agent,
      caller_scope: "ai:invoke",
      run_ref: "",
      purpose: "seeker_advocate_turn",
      prompt_ref: { prompt_id: "", version: "1.0.0" },
      model_ref: { model_profile_id: "advocate-reasoning", version: "1.0.0" },
      manifest_ref: { manifest_id: "f12-runtime", version: "1.0.0" },
      variables: {},
    });

    expect(result.ok).toBe(false);
    expect(result.record.reason_code).toBe("missing_required_ref");
  });

  test("refuses a caller scope excluded by the runtime manifest", async () => {
    const repo = await seededRepo({ caller_scopes: ["ai:review"] });

    const result = await invokeModel(repo, new FakeGatewayAdapter(), invocationInput());

    expect(result.ok).toBe(false);
    expect(result.record.reason_code).toBe("unauthorized_caller");
  });

  test("refuses a caller scope excluded by the model profile", async () => {
    const repo = await seededRepo({ model_allowed_scopes: ["ai:review"] });

    const result = await invokeModel(repo, new FakeGatewayAdapter(), invocationInput());

    expect(result.ok).toBe(false);
    expect(result.record.reason_code).toBe("unauthorized_caller");
  });

  test("persists a terminal failed record when the gateway rejects", async () => {
    const repo = await seededRepo();
    const gateway = {
      invoke: async () => {
        throw new Error("provider unavailable");
      },
    };

    await expect(invokeModel(repo, gateway, invocationInput())).rejects.toThrow(
      "provider unavailable",
    );

    const [record] = await repo.listInvocationRecords();
    expect(record).toMatchObject({
      status: "failed",
      decision: "allowed",
      reason_code: "gateway_unavailable",
      response_hash: null,
      usage_metadata: null,
    });
    expect(record?.completed_at).toBeInstanceOf(Date);
  });
});

async function seededRepo(
  options: {
    readonly caller_scopes?: readonly string[];
    readonly model_allowed_scopes?: readonly string[];
  } = {},
): Promise<MemoryAiRepository> {
  const repo = new MemoryAiRepository();
  await publishPromptVersion(repo, promptFixture());
  await publishModelProfileVersion(
    repo,
    modelFixture({ allowed_scopes: options.model_allowed_scopes ?? ["ai:invoke"] }),
  );
  await publishRuntimeManifest(
    repo,
    manifestFixture({ caller_scopes: options.caller_scopes ?? ["ai:invoke"] }),
  );
  return repo;
}

function invocationInput() {
  return {
    caller: agent,
    caller_scope: "ai:invoke",
    run_ref: "run-1",
    purpose: "seeker_advocate_turn",
    prompt_ref: { prompt_id: "seeker-advocate", version: "1.0.0" },
    model_ref: { model_profile_id: "advocate-reasoning", version: "1.0.0" },
    manifest_ref: { manifest_id: "f12-runtime", version: "1.0.0" },
    variables: { candidate_context: sentinelText() },
  };
}
