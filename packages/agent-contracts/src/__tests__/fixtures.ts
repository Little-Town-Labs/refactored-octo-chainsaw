import { randomUUID } from "node:crypto";

import type {
  AgentContractRepository,
  AgentContractEventQuery,
  AgentContractVersionQuery,
} from "../repo.js";
import type {
  AgentContractEvent,
  AgentContractVersion,
  ContractRef,
  NewAgentContractEvent,
  NewAgentContractVersion,
} from "../types.js";

export class MemoryAgentContractRepository implements AgentContractRepository {
  readonly versions = new Map<string, AgentContractVersion>();
  readonly events: AgentContractEvent[] = [];

  async getContractVersion(ref: ContractRef): Promise<AgentContractVersion | null> {
    return this.versions.get(key(ref)) ?? null;
  }

  async insertContractVersion(input: NewAgentContractVersion): Promise<AgentContractVersion> {
    const row: AgentContractVersion = {
      ...input,
      agent_contract_version_id: input.agent_contract_version_id ?? randomUUID(),
      created_at: input.created_at ?? new Date(),
    };
    this.versions.set(key(row), row);
    return row;
  }

  async updateContractDeprecatedAfter(input: {
    readonly contractVersionId: string;
    readonly deprecatedAfter: Date;
  }): Promise<AgentContractVersion> {
    for (const row of this.versions.values()) {
      if (row.agent_contract_version_id !== input.contractVersionId) continue;
      const updated = {
        ...row,
        status: "deprecated" as const,
        deprecated_after: input.deprecatedAfter,
      };
      this.versions.set(key(updated), updated);
      return updated;
    }
    throw new Error(`contract version ${input.contractVersionId} not found`);
  }

  async appendContractEvent(input: NewAgentContractEvent): Promise<AgentContractEvent> {
    const row: AgentContractEvent = {
      ...input,
      agent_contract_event_id: input.agent_contract_event_id ?? randomUUID(),
      created_at: input.created_at ?? new Date(),
    };
    this.events.push(row);
    return row;
  }

  async listContractVersions(
    query: AgentContractVersionQuery,
  ): Promise<readonly AgentContractVersion[]> {
    return [...this.versions.values()]
      .filter((row) => !query.contractId || row.contract_id === query.contractId)
      .filter((row) => !query.side || row.side === query.side)
      .filter((row) => !query.status || row.status === query.status)
      .slice(0, query.limit);
  }

  async listContractEvents(query: AgentContractEventQuery): Promise<readonly AgentContractEvent[]> {
    return this.events
      .filter(
        (row) =>
          !query.contractVersionId || row.agent_contract_version_id === query.contractVersionId,
      )
      .filter((row) => !query.principalId || row.principal_id === query.principalId)
      .slice(0, query.limit);
  }
}

export function contractMaterial() {
  return {
    contract_id: "seeker.standard",
    version: "1.0.0",
    side: "seeker" as const,
    prompt_template_ref: { id: "seeker-standard", version: "1.0.0" },
    rubric_ref: { id: "seeker-fit", version: "1.0.0" },
    tool_surface_ref: { id: "seeker-tools", version: "1.0.0" },
    model_ref: { provider: "openai", model_id: "gpt-5.4-mini", version: "2026-05-01" },
    runtime_settings: { max_rounds: 4, timeout_ms: 30000, max_tool_calls_per_turn: 4 },
    extension_fields: { rollout: "phase-0" },
    description: "Initial seeker-side launch contract.",
  };
}

function key(ref: ContractRef): string {
  return `${ref.contract_id}@${ref.version}`;
}
