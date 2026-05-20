import type { JsonObject, VersionedToolRef } from "./types.js";
import { descriptorKey } from "./validation.js";

export interface ToolAdapterContext {
  readonly run_id: string;
  readonly turn_id: string;
  readonly side: "seeker" | "employer";
  readonly principal_id: string;
}

export type ToolAdapter = (
  input: JsonObject,
  context: ToolAdapterContext,
) => Promise<JsonObject> | JsonObject;

export interface RegisteredToolAdapter {
  readonly adapter_ref: string;
  readonly tool_ref: VersionedToolRef;
  readonly invoke: ToolAdapter;
}

export class ToolAdapterRegistry {
  private readonly adapters = new Map<string, RegisteredToolAdapter>();

  register(adapter: RegisteredToolAdapter): void {
    this.adapters.set(adapter.adapter_ref, adapter);
  }

  has(adapterRef: string): boolean {
    return this.adapters.has(adapterRef);
  }

  get(adapterRef: string): RegisteredToolAdapter | null {
    return this.adapters.get(adapterRef) ?? null;
  }

  hasTool(ref: VersionedToolRef): boolean {
    const key = descriptorKey(ref);
    return [...this.adapters.values()].some((adapter) => descriptorKey(adapter.tool_ref) === key);
  }
}
