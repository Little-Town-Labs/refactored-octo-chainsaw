import { publishToolDescriptor, publishToolSurface, ToolVersionMutationError } from "../publish.js";

import {
  descriptorMaterial,
  MemoryCanonicalAuditStore,
  MemoryToolRepository,
  operator,
  surfaceMaterial,
} from "./fixtures.js";

describe("tool surface publication", () => {
  it("publishes immutable descriptor and surface versions", async () => {
    const repo = new MemoryToolRepository();
    const audit = new MemoryCanonicalAuditStore();
    const descriptor = await publishToolDescriptor(repo, audit, {
      ...descriptorMaterial(),
      operator: operator(),
      reasonCode: "initial_launch",
      correlationId: "corr-descriptor",
    });
    const surface = await publishToolSurface(repo, audit, {
      ...surfaceMaterial(),
      operator: operator(),
      reasonCode: "initial_launch",
      correlationId: "corr-surface",
    });

    expect(descriptor.descriptor.status).toBe("published");
    expect(surface.surface.status).toBe("published");
    expect(repo.events).toHaveLength(2);
  });

  it("rejects mutation of an existing descriptor version", async () => {
    const repo = new MemoryToolRepository();
    const audit = new MemoryCanonicalAuditStore();
    await publishToolDescriptor(repo, audit, {
      ...descriptorMaterial(),
      operator: operator(),
      reasonCode: "initial_launch",
      correlationId: "corr-descriptor",
    });

    await expect(
      publishToolDescriptor(repo, audit, {
        ...descriptorMaterial(),
        description: "changed",
        operator: operator(),
        reasonCode: "schema_update",
        correlationId: "corr-descriptor-2",
      }),
    ).rejects.toBeInstanceOf(ToolVersionMutationError);
  });
});
