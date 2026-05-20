import { publishContractVersion } from "../publish.js";
import { resolveContractForDispatch, type ContractDependencyChecker } from "../resolver.js";
import { contractMaterial, MemoryAgentContractRepository } from "./fixtures.js";

describe("resolveContractForDispatch dependency validation", () => {
  test.each([
    {
      name: "prompt template",
      checker: {
        checkPromptTemplate: async () => ({ kind: "prompt_template", status: "unavailable" }),
      },
      reason_code: "prompt_template_unresolvable",
    },
    {
      name: "rubric",
      checker: {
        checkRubric: async () => ({ kind: "rubric", status: "unavailable" }),
      },
      reason_code: "rubric_unresolvable",
    },
    {
      name: "rubric bias test",
      checker: {
        checkRubric: async () => ({ kind: "rubric", status: "missing_bias_test" }),
      },
      reason_code: "rubric_missing_bias_test",
    },
    {
      name: "tool surface",
      checker: {
        checkToolSurface: async () => ({ kind: "tool_surface", status: "unavailable" }),
      },
      reason_code: "tool_version_unavailable",
    },
    {
      name: "model",
      checker: {
        checkModel: async () => ({ kind: "model", status: "unavailable" }),
      },
      reason_code: "model_unavailable",
    },
  ] as const)("denies when $name dependency is unavailable", async (scenario) => {
    const repository = new MemoryAgentContractRepository();
    await publishContractVersion(repository, {
      ...contractMaterial(),
      author_principal_id: "11111111-1111-4111-8111-111111111111",
    });

    const resolution = await resolveContractForDispatch(
      repository,
      { contract_id: "seeker.standard", version: "1.0.0" },
      { dependencyChecker: scenario.checker },
    );

    expect(resolution).toMatchObject({
      decision: "deny",
      reason_code: scenario.reason_code,
    });
    expect(resolution.dependency_results).toHaveLength(1);
  });

  test("checks all dependency refs and allows when every dependency is available", async () => {
    const repository = new MemoryAgentContractRepository();
    await publishContractVersion(repository, {
      ...contractMaterial(),
      author_principal_id: "11111111-1111-4111-8111-111111111111",
    });
    const checker: ContractDependencyChecker = {
      checkPromptTemplate: async (ref) => ({ kind: "prompt_template", status: "available", ref }),
      checkRubric: async (ref) => ({ kind: "rubric", status: "available", ref }),
      checkToolSurface: async (ref) => ({ kind: "tool_surface", status: "available", ref }),
      checkModel: async (ref) => ({ kind: "model", status: "available", ref }),
    };

    const resolution = await resolveContractForDispatch(
      repository,
      { contract_id: "seeker.standard", version: "1.0.0" },
      { dependencyChecker: checker },
    );

    expect(resolution).toMatchObject({
      decision: "allow",
      reason_code: "contract_resolved",
    });
    expect(resolution.dependency_results.map((result) => result.kind)).toEqual([
      "prompt_template",
      "rubric",
      "tool_surface",
      "model",
    ]);
  });

  test("returns every runtime ceiling clamp and leaves stored material unchanged", async () => {
    const repository = new MemoryAgentContractRepository();
    await publishContractVersion(repository, {
      ...contractMaterial(),
      author_principal_id: "11111111-1111-4111-8111-111111111111",
    });

    const resolution = await resolveContractForDispatch(
      repository,
      { contract_id: "seeker.standard", version: "1.0.0" },
      {
        runtimeCeilings: {
          max_rounds: 3,
          timeout_ms: 10000,
          max_tool_calls_per_turn: 2,
        },
      },
    );

    expect(resolution.effective_runtime_settings).toEqual({
      max_rounds: 3,
      timeout_ms: 10000,
      max_tool_calls_per_turn: 2,
    });
    expect(resolution.runtime_clamps).toEqual([
      { field: "max_rounds", requested: 4, effective: 3 },
      { field: "timeout_ms", requested: 30000, effective: 10000 },
      { field: "max_tool_calls_per_turn", requested: 4, effective: 2 },
    ]);
    expect(resolution.contract?.runtime_settings).toEqual({
      max_rounds: 4,
      timeout_ms: 30000,
      max_tool_calls_per_turn: 4,
    });
  });
});
