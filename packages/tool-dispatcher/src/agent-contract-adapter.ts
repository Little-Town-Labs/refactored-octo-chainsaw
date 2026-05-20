import type { VersionedRef } from "@spyglass/agent-contracts";

import type { ToolAdapterRegistry } from "./adapter-registry.js";
import type { ToolRepository } from "./repo.js";
import { resolveToolSurfaceForDispatch } from "./resolver.js";

export function createToolSurfaceDependencyChecker(
  repository: ToolRepository,
  adapters: ToolAdapterRegistry,
): (ref: VersionedRef) => Promise<{
  readonly kind: "tool_surface";
  readonly status: "available" | "unavailable";
  readonly ref: VersionedRef;
}> {
  return async (ref) => {
    const result = await resolveToolSurfaceForDispatch(repository, adapters, {
      runId: "dependency-check",
      side: "seeker",
      contractRef: { id: "dependency-check", version: "0" },
      surfaceRef: ref,
    });
    return {
      kind: "tool_surface",
      status: result.decision === "allow" ? "available" : "unavailable",
      ref,
    };
  };
}
