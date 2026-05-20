import type { AgentContractVersionQuery, AgentContractEventQuery } from "../repo.js";
import { readContractEvents, readContractVersions } from "../review.js";
import {
  CONTRACT_READ_SCOPE,
  ContractScopeRequiredError,
  type ScopedPrincipal,
} from "../scopes.js";
import type {
  AgentContractEvent,
  AgentContractVersion,
  NewAgentContractEvent,
  NewAgentContractVersion,
} from "../types.js";
import { contractMaterial, MemoryAgentContractRepository } from "./fixtures.js";

const PRINCIPAL_ID = "11111111-1111-4111-8111-111111111111";
const REVIEWER_ID = "22222222-2222-4222-8222-222222222222";

describe("contract review reads", () => {
  test("requires contract.read for contract versions", async () => {
    await expect(
      readContractVersions(new MemoryAgentContractRepository(), {
        principal: principal([]),
        contractId: "seeker.standard",
      }),
    ).rejects.toBeInstanceOf(ContractScopeRequiredError);
  });

  test("reads bounded contract versions with filters", async () => {
    const repository = new ReviewMemoryAgentContractRepository();
    repository.seedVersions([
      version(
        "skip-old",
        "seeker.standard",
        "1.0.0",
        "seeker",
        "published",
        "2026-05-18T00:00:00.000Z",
      ),
      version(
        "keep-1",
        "seeker.standard",
        "1.1.0",
        "seeker",
        "published",
        "2026-05-20T10:00:00.000Z",
      ),
      version(
        "keep-2",
        "seeker.standard",
        "1.2.0",
        "seeker",
        "published",
        "2026-05-20T12:00:00.000Z",
      ),
      version(
        "skip-side",
        "employer.standard",
        "1.0.0",
        "employer",
        "published",
        "2026-05-20T13:00:00.000Z",
      ),
      version(
        "skip-status",
        "seeker.standard",
        "1.3.0",
        "seeker",
        "deprecated",
        "2026-05-20T14:00:00.000Z",
      ),
    ]);

    await expect(
      readContractVersions(repository, {
        principal: principal([CONTRACT_READ_SCOPE]),
        contractId: "seeker.standard",
        side: "seeker",
        status: "published",
        from: new Date("2026-05-20T00:00:00.000Z"),
        until: new Date("2026-05-20T23:59:59.000Z"),
        limit: 1,
      }),
    ).resolves.toEqual([expect.objectContaining({ agent_contract_version_id: "keep-2" })]);
  });

  test("requires contract.read for contract events", async () => {
    await expect(
      readContractEvents(new MemoryAgentContractRepository(), {
        principal: principal([]),
        limit: 1,
      }),
    ).rejects.toBeInstanceOf(ContractScopeRequiredError);
  });

  test("reads bounded contract events with filters and clamps excessive limits", async () => {
    const repository = new ReviewMemoryAgentContractRepository();
    repository.seedEvents([
      event("skip-old", "contract-version-1", PRINCIPAL_ID, "2026-05-18T00:00:00.000Z"),
      event("keep-1", "contract-version-1", PRINCIPAL_ID, "2026-05-20T10:00:00.000Z"),
      event("keep-2", "contract-version-1", PRINCIPAL_ID, "2026-05-20T12:00:00.000Z"),
      event("skip-version", "contract-version-2", PRINCIPAL_ID, "2026-05-20T13:00:00.000Z"),
      event("skip-principal", "contract-version-1", REVIEWER_ID, "2026-05-20T14:00:00.000Z"),
    ]);

    const result = await readContractEvents(repository, {
      principal: principal([CONTRACT_READ_SCOPE]),
      contractVersionId: "contract-version-1",
      principalId: PRINCIPAL_ID,
      from: new Date("2026-05-20T00:00:00.000Z"),
      until: new Date("2026-05-20T23:59:59.000Z"),
      limit: 999,
    });

    expect(result).toEqual([
      expect.objectContaining({ agent_contract_event_id: "keep-2" }),
      expect.objectContaining({ agent_contract_event_id: "keep-1" }),
    ]);
    expect(repository.lastEventQuery?.limit).toBe(200);
  });
});

class ReviewMemoryAgentContractRepository extends MemoryAgentContractRepository {
  lastVersionQuery: AgentContractVersionQuery | null = null;
  lastEventQuery: AgentContractEventQuery | null = null;

  seedVersions(rows: readonly AgentContractVersion[]): void {
    for (const row of rows) {
      this.versions.set(`${row.contract_id}@${row.version}`, row);
    }
  }

  seedEvents(rows: readonly AgentContractEvent[]): void {
    this.events.push(...rows);
  }

  override async listContractVersions(
    query: AgentContractVersionQuery,
  ): Promise<readonly AgentContractVersion[]> {
    this.lastVersionQuery = query;
    return [...this.versions.values()]
      .filter((row) => !query.contractId || row.contract_id === query.contractId)
      .filter((row) => !query.side || row.side === query.side)
      .filter((row) => !query.status || row.status === query.status)
      .filter((row) => !query.from || row.created_at >= query.from)
      .filter((row) => !query.until || row.created_at <= query.until)
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
      .slice(0, query.limit);
  }

  override async listContractEvents(
    query: AgentContractEventQuery,
  ): Promise<readonly AgentContractEvent[]> {
    this.lastEventQuery = query;
    return this.events
      .filter(
        (row) =>
          !query.contractVersionId || row.agent_contract_version_id === query.contractVersionId,
      )
      .filter((row) => !query.principalId || row.principal_id === query.principalId)
      .filter((row) => !query.from || row.created_at >= query.from)
      .filter((row) => !query.until || row.created_at <= query.until)
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
      .slice(0, query.limit);
  }
}

function principal(scopes: readonly string[]): ScopedPrincipal {
  return {
    principal_id: PRINCIPAL_ID,
    principal_kind: "human",
    scopes,
  };
}

function version(
  id: string,
  contractId: string,
  contractVersion: string,
  side: AgentContractVersion["side"],
  status: AgentContractVersion["status"],
  createdAt: string,
): AgentContractVersion {
  const material = contractMaterial();
  const input: NewAgentContractVersion = {
    ...material,
    agent_contract_version_id: id,
    contract_id: contractId,
    version: contractVersion,
    side,
    status,
    content_hash: `hash-${id}`,
    author_principal_id: PRINCIPAL_ID,
    reviewer_principal_id: REVIEWER_ID,
    published_at: new Date(createdAt),
    deprecated_after: status === "deprecated" ? new Date(createdAt) : null,
    audit_event_id: `audit-${id}`,
    created_at: new Date(createdAt),
  };
  return input as AgentContractVersion;
}

function event(
  id: string,
  contractVersionId: string,
  principalId: string,
  createdAt: string,
): AgentContractEvent {
  const input: NewAgentContractEvent = {
    agent_contract_event_id: id,
    agent_contract_version_id: contractVersionId,
    event_type: "published",
    reason_code: "initial_launch",
    principal_id: principalId,
    reviewer_principal_id: REVIEWER_ID,
    correlation_id: `corr-${id}`,
    audit_event_id: `audit-${id}`,
    created_at: new Date(createdAt),
  };
  return input as AgentContractEvent;
}
