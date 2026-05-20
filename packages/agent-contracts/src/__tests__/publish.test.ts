import { publishContractVersion, ContractVersionMutationError } from "../publish.js";
import { contractMaterial, MemoryAgentContractRepository } from "./fixtures.js";

describe("publishContractVersion", () => {
  test("publishes a new immutable contract version", async () => {
    const repository = new MemoryAgentContractRepository();

    const version = await publishContractVersion(repository, {
      ...contractMaterial(),
      author_principal_id: "11111111-1111-4111-8111-111111111111",
    });

    expect(version.contract_id).toBe("seeker.standard");
    expect(version.version).toBe("1.0.0");
    expect(version.content_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  test("returns the existing version for idempotent identical material", async () => {
    const repository = new MemoryAgentContractRepository();
    const input = {
      ...contractMaterial(),
      author_principal_id: "11111111-1111-4111-8111-111111111111",
    };

    const first = await publishContractVersion(repository, input);
    const second = await publishContractVersion(repository, input);

    expect(second).toBe(first);
  });

  test("rejects different material for an existing contract id and version", async () => {
    const repository = new MemoryAgentContractRepository();
    const input = {
      ...contractMaterial(),
      author_principal_id: "11111111-1111-4111-8111-111111111111",
    };

    await publishContractVersion(repository, input);

    await expect(
      publishContractVersion(repository, {
        ...input,
        model_ref: { provider: "openai", model_id: "gpt-5.5", version: "2026-05-01" },
      }),
    ).rejects.toBeInstanceOf(ContractVersionMutationError);
  });
});
