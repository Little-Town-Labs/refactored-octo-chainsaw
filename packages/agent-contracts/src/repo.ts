import {
  agentContractEvents,
  type AgentContractEventRow,
  agentContractVersions,
  type AgentContractVersionRow,
  type Db,
  type NewAgentContractEventRow,
  type NewAgentContractVersionRow,
} from "@spyglass/db";
import { and, desc, eq, gte, lte, type SQL } from "drizzle-orm";

import type {
  AgentContractEvent,
  AgentContractVersion,
  ContractRef,
  NewAgentContractEvent,
  NewAgentContractVersion,
} from "./types.js";

export interface AgentContractVersionQuery {
  readonly contractId?: string;
  readonly side?: AgentContractVersion["side"];
  readonly status?: AgentContractVersion["status"];
  readonly from?: Date;
  readonly until?: Date;
  readonly limit: number;
}

export interface AgentContractEventQuery {
  readonly contractVersionId?: string;
  readonly principalId?: string;
  readonly from?: Date;
  readonly until?: Date;
  readonly limit: number;
}

export interface AgentContractRepository {
  getContractVersion(ref: ContractRef): Promise<AgentContractVersion | null>;
  insertContractVersion(input: NewAgentContractVersion): Promise<AgentContractVersion>;
  updateContractDeprecatedAfter(input: {
    readonly contractVersionId: string;
    readonly deprecatedAfter: Date;
  }): Promise<AgentContractVersion>;
  appendContractEvent(input: NewAgentContractEvent): Promise<AgentContractEvent>;
  listContractVersions(query: AgentContractVersionQuery): Promise<readonly AgentContractVersion[]>;
  listContractEvents(query: AgentContractEventQuery): Promise<readonly AgentContractEvent[]>;
}

export interface DrizzleAgentContractRepositoryOptions {
  readonly db: Db;
}

export function createDrizzleAgentContractRepository(
  options: DrizzleAgentContractRepositoryOptions,
): AgentContractRepository {
  const db = options.db;

  return {
    async getContractVersion(ref) {
      const rows = await db
        .select()
        .from(agentContractVersions)
        .where(
          and(
            eq(agentContractVersions.contract_id, ref.contract_id),
            eq(agentContractVersions.version, ref.version),
          ),
        )
        .limit(1);
      return rows[0] ? toContractVersion(rows[0]) : null;
    },
    async insertContractVersion(input) {
      const [row] = await db
        .insert(agentContractVersions)
        .values(toContractVersionInsert(input))
        .returning();
      if (!row) throw new Error("failed to insert agent contract version");
      return toContractVersion(row);
    },
    async updateContractDeprecatedAfter(input) {
      const [row] = await db
        .update(agentContractVersions)
        .set({ status: "deprecated", deprecated_after: input.deprecatedAfter })
        .where(eq(agentContractVersions.agent_contract_version_id, input.contractVersionId))
        .returning();
      if (!row) throw new Error("failed to deprecate agent contract version");
      return toContractVersion(row);
    },
    async appendContractEvent(input) {
      const [row] = await db
        .insert(agentContractEvents)
        .values(toContractEventInsert(input))
        .returning();
      if (!row) throw new Error("failed to insert agent contract event");
      return toContractEvent(row);
    },
    async listContractVersions(query) {
      const rows = await db
        .select()
        .from(agentContractVersions)
        .where(buildVersionWhere(query))
        .orderBy(desc(agentContractVersions.created_at))
        .limit(query.limit);
      return rows.map(toContractVersion);
    },
    async listContractEvents(query) {
      const rows = await db
        .select()
        .from(agentContractEvents)
        .where(buildEventWhere(query))
        .orderBy(desc(agentContractEvents.created_at))
        .limit(query.limit);
      return rows.map(toContractEvent);
    },
  };
}

function buildVersionWhere(query: AgentContractVersionQuery): SQL | undefined {
  const clauses: SQL[] = [];
  if (query.contractId) clauses.push(eq(agentContractVersions.contract_id, query.contractId));
  if (query.side) clauses.push(eq(agentContractVersions.side, query.side));
  if (query.status) clauses.push(eq(agentContractVersions.status, query.status));
  if (query.from) clauses.push(gte(agentContractVersions.created_at, query.from));
  if (query.until) clauses.push(lte(agentContractVersions.created_at, query.until));
  return clauses.length > 0 ? and(...clauses) : undefined;
}

function buildEventWhere(query: AgentContractEventQuery): SQL | undefined {
  const clauses: SQL[] = [];
  if (query.contractVersionId) {
    clauses.push(eq(agentContractEvents.agent_contract_version_id, query.contractVersionId));
  }
  if (query.principalId) clauses.push(eq(agentContractEvents.principal_id, query.principalId));
  if (query.from) clauses.push(gte(agentContractEvents.created_at, query.from));
  if (query.until) clauses.push(lte(agentContractEvents.created_at, query.until));
  return clauses.length > 0 ? and(...clauses) : undefined;
}

function toContractVersionInsert(input: NewAgentContractVersion): NewAgentContractVersionRow {
  return {
    ...(input.agent_contract_version_id
      ? { agent_contract_version_id: input.agent_contract_version_id }
      : {}),
    contract_id: input.contract_id,
    version: input.version,
    side: input.side,
    status: input.status,
    prompt_template_ref: input.prompt_template_ref,
    rubric_ref: input.rubric_ref,
    tool_surface_ref: input.tool_surface_ref,
    model_ref: input.model_ref,
    runtime_settings: input.runtime_settings,
    extension_fields: input.extension_fields,
    content_hash: input.content_hash,
    description: input.description,
    author_principal_id: input.author_principal_id,
    reviewer_principal_id: input.reviewer_principal_id,
    published_at: input.published_at,
    deprecated_after: input.deprecated_after,
    audit_event_id: input.audit_event_id,
    ...(input.created_at ? { created_at: input.created_at } : {}),
  };
}

function toContractEventInsert(input: NewAgentContractEvent): NewAgentContractEventRow {
  return {
    ...(input.agent_contract_event_id
      ? { agent_contract_event_id: input.agent_contract_event_id }
      : {}),
    agent_contract_version_id: input.agent_contract_version_id,
    event_type: input.event_type,
    reason_code: input.reason_code,
    principal_id: input.principal_id,
    reviewer_principal_id: input.reviewer_principal_id,
    correlation_id: input.correlation_id,
    audit_event_id: input.audit_event_id,
    ...(input.created_at ? { created_at: input.created_at } : {}),
  };
}

function toContractVersion(row: AgentContractVersionRow): AgentContractVersion {
  return {
    agent_contract_version_id: row.agent_contract_version_id,
    contract_id: row.contract_id,
    version: row.version,
    side: row.side as AgentContractVersion["side"],
    status: row.status as AgentContractVersion["status"],
    prompt_template_ref: row.prompt_template_ref,
    rubric_ref: row.rubric_ref,
    tool_surface_ref: row.tool_surface_ref,
    model_ref: row.model_ref,
    runtime_settings: row.runtime_settings,
    extension_fields: row.extension_fields,
    content_hash: row.content_hash,
    description: row.description,
    author_principal_id: row.author_principal_id,
    reviewer_principal_id: row.reviewer_principal_id,
    published_at: row.published_at,
    deprecated_after: row.deprecated_after,
    audit_event_id: row.audit_event_id,
    created_at: row.created_at,
  };
}

function toContractEvent(row: AgentContractEventRow): AgentContractEvent {
  return {
    agent_contract_event_id: row.agent_contract_event_id,
    agent_contract_version_id: row.agent_contract_version_id,
    event_type: row.event_type as AgentContractEvent["event_type"],
    reason_code: row.reason_code as AgentContractEvent["reason_code"],
    principal_id: row.principal_id,
    reviewer_principal_id: row.reviewer_principal_id,
    correlation_id: row.correlation_id,
    audit_event_id: row.audit_event_id,
    created_at: row.created_at,
  };
}
