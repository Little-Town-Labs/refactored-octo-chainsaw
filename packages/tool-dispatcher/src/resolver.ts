import type { ToolAdapterRegistry } from "./adapter-registry.js";
import type { ToolRepository } from "./repo.js";
import type {
  ToolAdvertisement,
  ToolDescriptorVersion,
  ToolDispatchReasonCode,
  ToolSurfaceRef,
  ToolSurfaceVersion,
} from "./types.js";

export interface ResolveToolSurfaceInput {
  readonly runId: string;
  readonly side: "seeker" | "employer";
  readonly contractRef: { readonly id: string; readonly version: string };
  readonly surfaceRef: ToolSurfaceRef;
  readonly now?: Date;
}

export interface ResolveToolSurfaceResult {
  readonly decision: "allow" | "deny";
  readonly reason_code: ToolDispatchReasonCode;
  readonly surface: ToolSurfaceVersion | null;
  readonly advertisement: ToolAdvertisement | null;
}

export async function resolveToolSurfaceForDispatch(
  repository: ToolRepository,
  adapters: ToolAdapterRegistry,
  input: ResolveToolSurfaceInput,
): Promise<ResolveToolSurfaceResult> {
  const now = input.now ?? new Date();
  const surface = await repository.getSurface(input.surfaceRef);
  if (!surface) return deny("tool_surface_missing", null);
  if (surface.status !== "published") return deny("tool_surface_unpublished", surface);
  if (surface.deprecated_at && surface.deprecated_at <= now)
    return deny("tool_surface_deprecated", surface);
  const descriptors: ToolDescriptorVersion[] = [];
  for (const ref of [...surface.descriptor_refs].sort(
    (a, b) => a.advertisement_order - b.advertisement_order,
  )) {
    const descriptor = await repository.getDescriptor(ref);
    if (!descriptor || descriptor.status !== "published")
      return deny("tool_surface_invalid", surface);
    if (ref.required && !adapters.has(descriptor.adapter_ref))
      return deny("tool_adapter_unavailable", surface);
    descriptors.push(descriptor);
  }
  return {
    decision: "allow",
    reason_code: "tool_dispatch_allowed",
    surface,
    advertisement: {
      run_id: input.runId,
      side: input.side,
      contract_ref: input.contractRef,
      surface_ref: input.surfaceRef,
      descriptors,
      resolved_at: now,
    },
  };

  function deny(
    reasonCode: ToolDispatchReasonCode,
    deniedSurface: ToolSurfaceVersion | null,
  ): ResolveToolSurfaceResult {
    return {
      decision: "deny",
      reason_code: reasonCode,
      surface: deniedSurface,
      advertisement: null,
    };
  }
}
