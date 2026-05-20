import {
  dispatcherBypassFindings,
  disclosureRoutingEvidence,
  type Db,
  type DispatcherBypassFindingRow,
  type DisclosureRoutingEvidenceRow,
  type NewDispatcherBypassFindingRow,
  type NewDisclosureRoutingEvidenceRow,
  type NewToolDescriptorVersionRow,
  type NewToolDispatchEventRow,
  type NewToolSurfaceEventRow,
  type NewToolSurfaceVersionRow,
  toolDescriptorVersions,
  type ToolDescriptorVersionRow,
  toolDispatchEvents,
  type ToolDispatchEventRow,
  toolSurfaceEvents,
  type ToolSurfaceEventRow,
  toolSurfaceVersions,
  type ToolSurfaceVersionRow,
} from "@spyglass/db";
import { and, desc, eq, gte, lte, type SQL } from "drizzle-orm";

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
} from "./types.js";

export interface ToolSurfaceQuery {
  readonly surfaceId?: string;
  readonly status?: ToolSurfaceVersion["status"];
  readonly from?: Date;
  readonly until?: Date;
  readonly limit: number;
}

export interface ToolDispatchEventQuery {
  readonly runId?: string;
  readonly reasonCode?: ToolDispatchEvent["reason_code"];
  readonly from?: Date;
  readonly until?: Date;
  readonly limit: number;
}

export interface ToolRepository {
  getDescriptor(ref: VersionedToolRef): Promise<ToolDescriptorVersion | null>;
  insertDescriptor(input: NewToolDescriptorVersion): Promise<ToolDescriptorVersion>;
  updateDescriptorDeprecated(input: {
    readonly toolDescriptorId: string;
    readonly deprecatedAt: Date;
  }): Promise<ToolDescriptorVersion>;
  getSurface(ref: ToolSurfaceRef): Promise<ToolSurfaceVersion | null>;
  insertSurface(input: NewToolSurfaceVersion): Promise<ToolSurfaceVersion>;
  updateSurfaceDeprecated(input: {
    readonly toolSurfaceVersionId: string;
    readonly deprecatedAt: Date;
  }): Promise<ToolSurfaceVersion>;
  appendToolSurfaceEvent(input: NewToolSurfaceEvent): Promise<ToolSurfaceEvent>;
  appendToolDispatchEvent(input: NewToolDispatchEvent): Promise<ToolDispatchEvent>;
  appendDisclosureRoutingEvidence(
    input: NewDisclosureRoutingEvidence,
  ): Promise<DisclosureRoutingEvidence>;
  appendBypassFinding(input: NewDispatcherBypassFinding): Promise<DispatcherBypassFinding>;
  listSurfaces(query: ToolSurfaceQuery): Promise<readonly ToolSurfaceVersion[]>;
  listDispatchEvents(query: ToolDispatchEventQuery): Promise<readonly ToolDispatchEvent[]>;
  listDisclosureRoutingEvidence(runId?: string): Promise<readonly DisclosureRoutingEvidence[]>;
  listBypassFindings(): Promise<readonly DispatcherBypassFinding[]>;
}

export function createDrizzleToolRepository(db: Db): ToolRepository {
  return {
    async getDescriptor(ref) {
      const rows = await db
        .select()
        .from(toolDescriptorVersions)
        .where(
          and(
            eq(toolDescriptorVersions.name, ref.name),
            eq(toolDescriptorVersions.version, ref.version),
          ),
        )
        .limit(1);
      return rows[0] ? toDescriptor(rows[0]) : null;
    },
    async insertDescriptor(input) {
      const [row] = await db
        .insert(toolDescriptorVersions)
        .values(toDescriptorInsert(input))
        .returning();
      if (!row) throw new Error("failed to insert tool descriptor");
      return toDescriptor(row);
    },
    async updateDescriptorDeprecated(input) {
      const [row] = await db
        .update(toolDescriptorVersions)
        .set({ status: "deprecated", deprecated_at: input.deprecatedAt })
        .where(eq(toolDescriptorVersions.tool_descriptor_id, input.toolDescriptorId))
        .returning();
      if (!row) throw new Error("failed to deprecate tool descriptor");
      return toDescriptor(row);
    },
    async getSurface(ref) {
      const rows = await db
        .select()
        .from(toolSurfaceVersions)
        .where(
          and(
            eq(toolSurfaceVersions.surface_id, ref.id),
            eq(toolSurfaceVersions.version, ref.version),
          ),
        )
        .limit(1);
      return rows[0] ? toSurface(rowToSurface(rows[0])) : null;
    },
    async insertSurface(input) {
      const [row] = await db.insert(toolSurfaceVersions).values(toSurfaceInsert(input)).returning();
      if (!row) throw new Error("failed to insert tool surface");
      return toSurface(rowToSurface(row));
    },
    async updateSurfaceDeprecated(input) {
      const [row] = await db
        .update(toolSurfaceVersions)
        .set({ status: "deprecated", deprecated_at: input.deprecatedAt })
        .where(eq(toolSurfaceVersions.tool_surface_version_id, input.toolSurfaceVersionId))
        .returning();
      if (!row) throw new Error("failed to deprecate tool surface");
      return toSurface(rowToSurface(row));
    },
    async appendToolSurfaceEvent(input) {
      const [row] = await db
        .insert(toolSurfaceEvents)
        .values(toSurfaceEventInsert(input))
        .returning();
      if (!row) throw new Error("failed to append tool surface event");
      return toSurfaceEvent(row);
    },
    async appendToolDispatchEvent(input) {
      const [row] = await db
        .insert(toolDispatchEvents)
        .values(toDispatchEventInsert(input))
        .returning();
      if (!row) throw new Error("failed to append tool dispatch event");
      return toDispatchEvent(row);
    },
    async appendDisclosureRoutingEvidence(input) {
      const [row] = await db
        .insert(disclosureRoutingEvidence)
        .values(toRoutingEvidenceInsert(input))
        .returning();
      if (!row) throw new Error("failed to append disclosure routing evidence");
      return toRoutingEvidence(row);
    },
    async appendBypassFinding(input) {
      const [row] = await db
        .insert(dispatcherBypassFindings)
        .values(toBypassInsert(input))
        .returning();
      if (!row) throw new Error("failed to append bypass finding");
      return toBypassFinding(row);
    },
    async listSurfaces(query) {
      const rows = await db
        .select()
        .from(toolSurfaceVersions)
        .where(buildSurfaceWhere(query))
        .orderBy(desc(toolSurfaceVersions.created_at))
        .limit(query.limit);
      return rows.map((row) => toSurface(rowToSurface(row)));
    },
    async listDispatchEvents(query) {
      const rows = await db
        .select()
        .from(toolDispatchEvents)
        .where(buildDispatchWhere(query))
        .orderBy(desc(toolDispatchEvents.created_at))
        .limit(query.limit);
      return rows.map(toDispatchEvent);
    },
    async listDisclosureRoutingEvidence() {
      const rows = await db
        .select()
        .from(disclosureRoutingEvidence)
        .orderBy(desc(disclosureRoutingEvidence.created_at));
      return rows.map(toRoutingEvidence);
    },
    async listBypassFindings() {
      const rows = await db
        .select()
        .from(dispatcherBypassFindings)
        .orderBy(desc(dispatcherBypassFindings.created_at));
      return rows.map(toBypassFinding);
    },
  };
}

function buildSurfaceWhere(query: ToolSurfaceQuery): SQL | undefined {
  const clauses: SQL[] = [];
  if (query.surfaceId) clauses.push(eq(toolSurfaceVersions.surface_id, query.surfaceId));
  if (query.status) clauses.push(eq(toolSurfaceVersions.status, query.status));
  if (query.from) clauses.push(gte(toolSurfaceVersions.created_at, query.from));
  if (query.until) clauses.push(lte(toolSurfaceVersions.created_at, query.until));
  return clauses.length > 0 ? and(...clauses) : undefined;
}

function buildDispatchWhere(query: ToolDispatchEventQuery): SQL | undefined {
  const clauses: SQL[] = [];
  if (query.runId) clauses.push(eq(toolDispatchEvents.run_id, query.runId));
  if (query.reasonCode) clauses.push(eq(toolDispatchEvents.reason_code, query.reasonCode));
  if (query.from) clauses.push(gte(toolDispatchEvents.created_at, query.from));
  if (query.until) clauses.push(lte(toolDispatchEvents.created_at, query.until));
  return clauses.length > 0 ? and(...clauses) : undefined;
}

function toDescriptor(row: ToolDescriptorVersionRow): ToolDescriptorVersion {
  return row as unknown as ToolDescriptorVersion;
}

function toSurface(row: ToolSurfaceVersionRow): ToolSurfaceVersion {
  return row as unknown as ToolSurfaceVersion;
}

function rowToSurface(row: ToolSurfaceVersionRow): ToolSurfaceVersionRow {
  return row;
}

function toSurfaceEvent(row: ToolSurfaceEventRow): ToolSurfaceEvent {
  return row as unknown as ToolSurfaceEvent;
}

function toDispatchEvent(row: ToolDispatchEventRow): ToolDispatchEvent {
  return row as unknown as ToolDispatchEvent;
}

function toRoutingEvidence(row: DisclosureRoutingEvidenceRow): DisclosureRoutingEvidence {
  return row as unknown as DisclosureRoutingEvidence;
}

function toBypassFinding(row: DispatcherBypassFindingRow): DispatcherBypassFinding {
  return row as unknown as DispatcherBypassFinding;
}

function toDescriptorInsert(input: NewToolDescriptorVersion): NewToolDescriptorVersionRow {
  return input as NewToolDescriptorVersionRow;
}

function toSurfaceInsert(input: NewToolSurfaceVersion): NewToolSurfaceVersionRow {
  return { ...input, descriptor_refs: [...input.descriptor_refs] } as NewToolSurfaceVersionRow;
}

function toSurfaceEventInsert(input: NewToolSurfaceEvent): NewToolSurfaceEventRow {
  return input as NewToolSurfaceEventRow;
}

function toDispatchEventInsert(input: NewToolDispatchEvent): NewToolDispatchEventRow {
  return input as NewToolDispatchEventRow;
}

function toRoutingEvidenceInsert(
  input: NewDisclosureRoutingEvidence,
): NewDisclosureRoutingEvidenceRow {
  return input as NewDisclosureRoutingEvidenceRow;
}

function toBypassInsert(input: NewDispatcherBypassFinding): NewDispatcherBypassFindingRow {
  return input as NewDispatcherBypassFindingRow;
}
