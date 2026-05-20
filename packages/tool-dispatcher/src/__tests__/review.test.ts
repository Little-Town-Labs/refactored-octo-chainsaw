import { publishToolDescriptor, publishToolSurface } from "../publish.js";
import { readToolSurfaces } from "../review.js";

import {
  descriptorMaterial,
  MemoryCanonicalAuditStore,
  MemoryToolRepository,
  operator,
  surfaceMaterial,
} from "./fixtures.js";

describe("tool review reads", () => {
  it("returns scoped catalog metadata", async () => {
    const repo = new MemoryToolRepository();
    const audit = new MemoryCanonicalAuditStore();
    await publishToolDescriptor(repo, audit, {
      ...descriptorMaterial(),
      operator: operator(),
      reasonCode: "initial_launch",
      correlationId: "corr-descriptor",
    });
    await publishToolSurface(repo, audit, {
      ...surfaceMaterial(),
      operator: operator(),
      reasonCode: "initial_launch",
      correlationId: "corr-surface",
    });

    const rows = await readToolSurfaces(repo, { principal: operator(), surfaceId: "seeker-tools" });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.descriptor_refs[0]?.name).toBe("lookup_profile");
  });
});
