import type {
  AgentContractEventQuery,
  AgentContractRepository,
  AgentContractVersionQuery,
} from "./repo.js";
import { CONTRACT_READ_SCOPE, requireContractScope, type ScopedPrincipal } from "./scopes.js";
import type { AgentContractEvent, AgentContractVersion } from "./types.js";

const DEFAULT_REVIEW_LIMIT = 50;
const MAX_REVIEW_LIMIT = 200;

export interface ReadContractVersionsInput {
  readonly principal: ScopedPrincipal;
  readonly contractId?: string;
  readonly side?: AgentContractVersion["side"];
  readonly status?: AgentContractVersion["status"];
  readonly from?: Date;
  readonly until?: Date;
  readonly limit?: number;
}

export interface ReadContractEventsInput {
  readonly principal: ScopedPrincipal;
  readonly contractVersionId?: string;
  readonly principalId?: string;
  readonly from?: Date;
  readonly until?: Date;
  readonly limit?: number;
}

export async function readContractVersions(
  repository: AgentContractRepository,
  input: ReadContractVersionsInput,
): Promise<readonly AgentContractVersion[]> {
  requireContractScope(input.principal, CONTRACT_READ_SCOPE);
  return repository.listContractVersions(toVersionQuery(input));
}

export async function readContractEvents(
  repository: AgentContractRepository,
  input: ReadContractEventsInput,
): Promise<readonly AgentContractEvent[]> {
  requireContractScope(input.principal, CONTRACT_READ_SCOPE);
  return repository.listContractEvents(toEventQuery(input));
}

function toVersionQuery(input: ReadContractVersionsInput): AgentContractVersionQuery {
  return {
    ...(input.contractId ? { contractId: input.contractId } : {}),
    ...(input.side ? { side: input.side } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.from ? { from: input.from } : {}),
    ...(input.until ? { until: input.until } : {}),
    limit: clampLimit(input.limit),
  };
}

function toEventQuery(input: ReadContractEventsInput): AgentContractEventQuery {
  return {
    ...(input.contractVersionId ? { contractVersionId: input.contractVersionId } : {}),
    ...(input.principalId ? { principalId: input.principalId } : {}),
    ...(input.from ? { from: input.from } : {}),
    ...(input.until ? { until: input.until } : {}),
    limit: clampLimit(input.limit),
  };
}

function clampLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_REVIEW_LIMIT;
  if (!Number.isFinite(limit) || limit < 1) return DEFAULT_REVIEW_LIMIT;
  return Math.min(Math.floor(limit), MAX_REVIEW_LIMIT);
}
