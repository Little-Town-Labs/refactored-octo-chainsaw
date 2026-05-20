import { publishToolDescriptor, publishToolSurface, deprecateToolSurface } from "../publish.js";
import { resolveToolSurfaceForDispatch } from "../resolver.js";

import {
  descriptorMaterial,
  MemoryCanonicalAuditStore,
  MemoryToolRepository,
  operator,
  registryWithLookupAdapter,
  surfaceMaterial,
} from "./fixtures.js";

describe("tool surface resolver", () => {
  it("resolves a published pinned surface to advertised descriptors", async () => {
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

    const result = await resolveToolSurfaceForDispatch(repo, registryWithLookupAdapter(), {
      runId: "run-1",
      side: "seeker",
      contractRef: { id: "contract", version: "1.0.0" },
      surfaceRef: { id: "seeker-tools", version: "1.0.0" },
    });

    expect(result.decision).toBe("allow");
    expect(result.advertisement?.descriptors).toHaveLength(1);
  });

  it("denies missing, deprecated, and adapter-unavailable surfaces", async () => {
    const repo = new MemoryToolRepository();
    const audit = new MemoryCanonicalAuditStore();
    const missing = await resolveToolSurfaceForDispatch(repo, registryWithLookupAdapter(), {
      runId: "run-1",
      side: "seeker",
      contractRef: { id: "contract", version: "1.0.0" },
      surfaceRef: { id: "missing", version: "1.0.0" },
    });
    expect(missing.reason_code).toBe("tool_surface_missing");

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
    const unavailable = await resolveToolSurfaceForDispatch(repo, registryWithLookupAdapter(), {
      runId: "run-1",
      side: "seeker",
      contractRef: { id: "contract", version: "1.0.0" },
      surfaceRef: { id: "seeker-tools", version: "1.0.0" },
    });
    expect(unavailable.decision).toBe("allow");

    await deprecateToolSurface(repo, audit, {
      surfaceId: "seeker-tools",
      version: "1.0.0",
      operator: operator(),
      reasonCode: "compliance_deprecation",
      correlationId: "corr-deprecate",
      deprecatedAt: new Date("2026-05-20T14:00:00.000Z"),
    });
    const deprecated = await resolveToolSurfaceForDispatch(repo, registryWithLookupAdapter(), {
      runId: "run-1",
      side: "seeker",
      contractRef: { id: "contract", version: "1.0.0" },
      surfaceRef: { id: "seeker-tools", version: "1.0.0" },
      now: new Date("2026-05-20T14:00:01.000Z"),
    });
    expect(deprecated.reason_code).toBe("tool_surface_unpublished");
  });
});
