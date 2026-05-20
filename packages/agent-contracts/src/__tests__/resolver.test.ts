import { publishContractVersion } from "../publish.js";
import { resolveContractForDispatch } from "../resolver.js";
import { contractMaterial, MemoryAgentContractRepository } from "./fixtures.js";

describe("resolveContractForDispatch", () => {
  test("allows an existing non-deprecated contract version", async () => {
    const repository = new MemoryAgentContractRepository();
    await publishContractVersion(repository, {
      ...contractMaterial(),
      author_principal_id: "11111111-1111-4111-8111-111111111111",
    });

    const resolution = await resolveContractForDispatch(repository, {
      contract_id: "seeker.standard",
      version: "1.0.0",
    });

    expect(resolution).toMatchObject({
      decision: "allow",
      reason_code: "contract_resolved",
      contract_ref: { contract_id: "seeker.standard", version: "1.0.0" },
    });
  });

  test("denies missing contract references", async () => {
    const repository = new MemoryAgentContractRepository();

    const resolution = await resolveContractForDispatch(repository, {
      contract_id: "missing",
      version: "1.0.0",
    });

    expect(resolution).toMatchObject({
      decision: "deny",
      reason_code: "missing_contract",
      contract: null,
    });
  });

  test("denies contracts deprecated for new dispatch", async () => {
    const repository = new MemoryAgentContractRepository();
    const version = await publishContractVersion(repository, {
      ...contractMaterial(),
      author_principal_id: "11111111-1111-4111-8111-111111111111",
    });
    await repository.updateContractDeprecatedAfter({
      contractVersionId: version.agent_contract_version_id,
      deprecatedAfter: new Date("2026-05-19T00:00:00.000Z"),
    });

    const resolution = await resolveContractForDispatch(
      repository,
      { contract_id: "seeker.standard", version: "1.0.0" },
      { now: new Date("2026-05-20T00:00:00.000Z") },
    );

    expect(resolution).toMatchObject({
      decision: "deny",
      reason_code: "contract_deprecated",
    });
  });

  test("clamps runtime settings without mutating stored contract material", async () => {
    const repository = new MemoryAgentContractRepository();
    await publishContractVersion(repository, {
      ...contractMaterial(),
      author_principal_id: "11111111-1111-4111-8111-111111111111",
    });

    const resolution = await resolveContractForDispatch(
      repository,
      { contract_id: "seeker.standard", version: "1.0.0" },
      { runtimeCeilings: { max_rounds: 3 } },
    );

    expect(resolution.effective_runtime_settings.max_rounds).toBe(3);
    expect(resolution.runtime_clamps).toEqual([
      { field: "max_rounds", requested: 4, effective: 3 },
    ]);
    expect(resolution.contract?.runtime_settings.max_rounds).toBe(4);
  });
});
