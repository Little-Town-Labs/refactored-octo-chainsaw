import { randomUUID } from "node:crypto";

import type { AuditLogEventRow } from "@spyglass/db";
import type {
  CanonicalAuditWriterStore,
  CanonicalAuditWriterTx,
  InsertCanonicalAuditEventRow,
} from "@spyglass/audit-log";

import { ToolAdapterRegistry } from "../adapter-registry.js";
import type {
  DisclosureRoutingEvidence,
  DispatcherBypassFinding,
  NewDisclosureRoutingEvidence,
  NewDispatcherBypassFinding,
  NewToolDescriptorVersion,
  NewToolDispatchEvent,
  NewToolSurfaceEvent,
  NewToolSurfaceVersion,
  ToolDescriptorVersion,
  ToolDispatchEvent,
  ToolSurfaceEvent,
  ToolSurfaceRef,
  ToolSurfaceVersion,
  VersionedToolRef,
} from "../types.js";
import { descriptorKey, surfaceKey } from "../validation.js";
import type { ToolDispatchEventQuery, ToolRepository, ToolSurfaceQuery } from "../repo.js";

export const OPERATOR_ID = "11111111-1111-4111-8111-111111111111";
export const REVIEWER_ID = "22222222-2222-4222-8222-222222222222";

export class MemoryToolRepository implements ToolRepository {
  readonly descriptors = new Map<string, ToolDescriptorVersion>();
  readonly surfaces = new Map<string, ToolSurfaceVersion>();
  readonly events: ToolSurfaceEvent[] = [];
  readonly dispatchEvents: ToolDispatchEvent[] = [];
  readonly routing: DisclosureRoutingEvidence[] = [];
  readonly bypassFindings: DispatcherBypassFinding[] = [];

  async getDescriptor(ref: VersionedToolRef): Promise<ToolDescriptorVersion | null> {
    return this.descriptors.get(descriptorKey(ref)) ?? null;
  }

  async insertDescriptor(input: NewToolDescriptorVersion): Promise<ToolDescriptorVersion> {
    const row = {
      ...input,
      tool_descriptor_id: input.tool_descriptor_id ?? randomUUID(),
      created_at: input.created_at ?? new Date(),
    };
    this.descriptors.set(descriptorKey(row), row);
    return row;
  }

  async updateDescriptorDeprecated(input: {
    readonly toolDescriptorId: string;
    readonly deprecatedAt: Date;
  }): Promise<ToolDescriptorVersion> {
    for (const row of this.descriptors.values()) {
      if (row.tool_descriptor_id !== input.toolDescriptorId) continue;
      const updated = { ...row, status: "deprecated" as const, deprecated_at: input.deprecatedAt };
      this.descriptors.set(descriptorKey(updated), updated);
      return updated;
    }
    throw new Error("descriptor not found");
  }

  async getSurface(ref: ToolSurfaceRef): Promise<ToolSurfaceVersion | null> {
    return this.surfaces.get(surfaceKey(ref)) ?? null;
  }

  async insertSurface(input: NewToolSurfaceVersion): Promise<ToolSurfaceVersion> {
    const row = {
      ...input,
      tool_surface_version_id: input.tool_surface_version_id ?? randomUUID(),
      created_at: input.created_at ?? new Date(),
    };
    this.surfaces.set(surfaceKey({ id: row.surface_id, version: row.version }), row);
    return row;
  }

  async updateSurfaceDeprecated(input: {
    readonly toolSurfaceVersionId: string;
    readonly deprecatedAt: Date;
  }): Promise<ToolSurfaceVersion> {
    for (const row of this.surfaces.values()) {
      if (row.tool_surface_version_id !== input.toolSurfaceVersionId) continue;
      const updated = { ...row, status: "deprecated" as const, deprecated_at: input.deprecatedAt };
      this.surfaces.set(surfaceKey({ id: updated.surface_id, version: updated.version }), updated);
      return updated;
    }
    throw new Error("surface not found");
  }

  async appendToolSurfaceEvent(input: NewToolSurfaceEvent): Promise<ToolSurfaceEvent> {
    const row = {
      ...input,
      tool_surface_event_id: input.tool_surface_event_id ?? randomUUID(),
      created_at: input.created_at ?? new Date(),
    };
    this.events.push(row);
    return row;
  }

  async appendToolDispatchEvent(input: NewToolDispatchEvent): Promise<ToolDispatchEvent> {
    const row = {
      ...input,
      tool_dispatch_event_id: input.tool_dispatch_event_id ?? randomUUID(),
      created_at: input.created_at ?? new Date(),
    };
    this.dispatchEvents.push(row);
    return row;
  }

  async appendDisclosureRoutingEvidence(
    input: NewDisclosureRoutingEvidence,
  ): Promise<DisclosureRoutingEvidence> {
    const row = {
      ...input,
      routing_id: input.routing_id ?? randomUUID(),
      created_at: input.created_at ?? new Date(),
    };
    this.routing.push(row);
    return row;
  }

  async appendBypassFinding(input: NewDispatcherBypassFinding): Promise<DispatcherBypassFinding> {
    const row = {
      ...input,
      finding_id: input.finding_id ?? randomUUID(),
      created_at: input.created_at ?? new Date(),
    };
    this.bypassFindings.push(row);
    return row;
  }

  async listSurfaces(query: ToolSurfaceQuery): Promise<readonly ToolSurfaceVersion[]> {
    return [...this.surfaces.values()]
      .filter((row) => !query.surfaceId || row.surface_id === query.surfaceId)
      .filter((row) => !query.status || row.status === query.status)
      .slice(0, query.limit);
  }

  async listDispatchEvents(query: ToolDispatchEventQuery): Promise<readonly ToolDispatchEvent[]> {
    return this.dispatchEvents
      .filter((row) => !query.runId || row.run_id === query.runId)
      .filter((row) => !query.reasonCode || row.reason_code === query.reasonCode)
      .slice(0, query.limit);
  }

  async listDisclosureRoutingEvidence(): Promise<readonly DisclosureRoutingEvidence[]> {
    return this.routing;
  }

  async listBypassFindings(): Promise<readonly DispatcherBypassFinding[]> {
    return this.bypassFindings;
  }
}

export class MemoryCanonicalAuditStore implements CanonicalAuditWriterStore {
  readonly rows: AuditLogEventRow[] = [];

  async transaction<T>(fn: (tx: CanonicalAuditWriterTx) => Promise<T>): Promise<T> {
    return fn({
      lockChainNamespace: async () => undefined,
      getLastEventHash: async (chainNamespace) =>
        this.rows.filter((row) => row.chain_namespace === chainNamespace).at(-1)?.event_hash ??
        null,
      insertEvent: async (row) => {
        const inserted = toAuditLogEventRow(row);
        this.rows.push(inserted);
        return inserted;
      },
    });
  }
}

export function operator(
  scopes: readonly string[] = [
    "tool_surface.publish",
    "tool_surface.deprecate",
    "tool.dispatch",
    "tool_surface.read",
  ],
) {
  return { principal_id: OPERATOR_ID, principal_kind: "human" as const, scopes };
}

export function descriptorMaterial(
  name = "lookup_profile",
  disclosure = "principal_self" as const,
) {
  return {
    name,
    version: "1.0.0",
    input_schema: { type: "object", required: ["ticket_id"] },
    output_schema: { type: "object", required: ["summary"] },
    disclosure_class: disclosure,
    adapter_ref: `${name}.adapter.v1`,
    description: `${name} fixture descriptor.`,
  };
}

export function surfaceMaterial() {
  return {
    surface_id: "seeker-tools",
    version: "1.0.0",
    side_scope: "seeker" as const,
    description: "Initial seeker tools.",
    descriptor_refs: [
      { name: "lookup_profile", version: "1.0.0", required: true, advertisement_order: 0 },
    ],
  };
}

export function registryWithLookupAdapter(): ToolAdapterRegistry {
  const registry = new ToolAdapterRegistry();
  registry.register({
    adapter_ref: "lookup_profile.adapter.v1",
    tool_ref: { name: "lookup_profile", version: "1.0.0" },
    invoke: () => ({ summary: "profile summary" }),
  });
  return registry;
}

function toAuditLogEventRow(row: InsertCanonicalAuditEventRow): AuditLogEventRow {
  return {
    audit_event_id: row.audit_event_id ?? randomUUID(),
    source_table: row.source_table,
    source_event_id: row.source_event_id,
    event_name: row.event_name,
    principal_id: row.principal_id,
    principal_kind: row.principal_kind,
    role_or_scope: row.role_or_scope,
    correlation_id: row.correlation_id,
    payload: row.payload,
    payload_hash: row.payload_hash,
    previous_hash: row.previous_hash,
    event_hash: row.event_hash,
    chain_namespace: row.chain_namespace,
    hash_algorithm: row.hash_algorithm,
    canonicalization_version: row.canonicalization_version,
    created_at: row.created_at,
    tombstoned_at: null,
  };
}
