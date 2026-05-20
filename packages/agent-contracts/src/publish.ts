import { randomUUID } from "node:crypto";

import { appendCanonicalAuditEvent, type CanonicalAuditWriterStore } from "@spyglass/audit-log";

import type { AgentContractRepository } from "./repo.js";
import type { ContractDependencyChecker } from "./resolver.js";
import {
  CONTRACT_DEPRECATE_SCOPE,
  CONTRACT_PUBLISH_SCOPE,
  requireContractScope,
  type ScopedPrincipal,
} from "./scopes.js";
import type {
  AgentContractEvent,
  AgentContractEventReasonCode,
  AgentContractVersion,
  ContractResolutionReasonCode,
  DependencyResult,
} from "./types.js";
import {
  computeContractContentHash,
  type ContractMaterial,
  validateContractMaterial,
} from "./validation.js";

export interface PublishContractVersionInput extends ContractMaterial {
  readonly author_principal_id: string;
  readonly reviewer_principal_id?: string | null;
  readonly published_at?: Date | null;
  readonly audit_event_id?: string | null;
  readonly created_at?: Date;
}

export interface PublishReviewedContractVersionInput extends ContractMaterial {
  readonly operator: ScopedPrincipal;
  readonly reviewerPrincipalId: string;
  readonly reasonCode: AgentContractEventReasonCode;
  readonly correlationId: string;
  readonly publishedAt?: Date;
  readonly dependencyChecker?: ContractDependencyChecker;
}

export interface DeprecateContractVersionInput {
  readonly contractId: string;
  readonly version: string;
  readonly operator: ScopedPrincipal;
  readonly reviewerPrincipalId?: string | null;
  readonly reasonCode: AgentContractEventReasonCode;
  readonly correlationId: string;
  readonly deprecatedAfter: Date;
}

export class ContractVersionMutationError extends Error {
  constructor(contractId: string, version: string) {
    super(
      `Agent contract "${contractId}" version "${version}" already exists with different material.`,
    );
    this.name = "ContractVersionMutationError";
  }
}

export class ContractVersionNotFoundError extends Error {
  constructor(contractId: string, version: string) {
    super(`Agent contract "${contractId}" version "${version}" was not found.`);
    this.name = "ContractVersionNotFoundError";
  }
}

export class ContractDependencyValidationError extends Error {
  constructor(readonly reasonCode: ContractResolutionReasonCode) {
    super(`Agent contract dependency validation failed: ${reasonCode}.`);
    this.name = "ContractDependencyValidationError";
  }
}

export async function publishContractVersion(
  repository: AgentContractRepository,
  input: PublishContractVersionInput,
): Promise<AgentContractVersion> {
  const materialInput = toContractMaterial(input);
  const material = validateContractMaterial(materialInput);
  const contentHash = computeContractContentHash(material);
  const existing = await repository.getContractVersion({
    contract_id: material.contract_id,
    version: material.version,
  });

  if (existing) {
    if (existing.content_hash !== contentHash) {
      throw new ContractVersionMutationError(material.contract_id, material.version);
    }
    return existing;
  }

  return repository.insertContractVersion({
    contract_id: material.contract_id,
    version: material.version,
    side: material.side,
    status: input.audit_event_id ? "published" : "draft",
    prompt_template_ref: material.prompt_template_ref,
    rubric_ref: material.rubric_ref,
    tool_surface_ref: material.tool_surface_ref,
    model_ref: material.model_ref,
    runtime_settings: material.runtime_settings,
    extension_fields: material.extension_fields,
    content_hash: contentHash,
    description: material.description,
    author_principal_id: input.author_principal_id,
    reviewer_principal_id: input.reviewer_principal_id ?? null,
    published_at: input.published_at ?? null,
    deprecated_after: null,
    audit_event_id: input.audit_event_id ?? null,
    ...(input.created_at ? { created_at: input.created_at } : {}),
  });
}

export async function publishReviewedContractVersion(
  repository: AgentContractRepository,
  auditStore: CanonicalAuditWriterStore,
  input: PublishReviewedContractVersionInput,
): Promise<{
  readonly contract: AgentContractVersion;
  readonly event: AgentContractEvent;
}> {
  requireContractScope(input.operator, CONTRACT_PUBLISH_SCOPE);

  const material = validateContractMaterial(toContractMaterial(input));
  const dependencyFailure = firstDependencyFailure(
    await checkPublishDependencies(material, input.dependencyChecker),
  );
  if (dependencyFailure) throw new ContractDependencyValidationError(dependencyFailure);

  const contentHash = computeContractContentHash(material);
  const existing = await repository.getContractVersion({
    contract_id: material.contract_id,
    version: material.version,
  });
  if (existing && existing.content_hash !== contentHash) {
    throw new ContractVersionMutationError(material.contract_id, material.version);
  }
  if (existing) {
    return {
      contract: existing,
      event: await appendIdempotentPublishEvent(repository, existing, input),
    };
  }

  const publishedAt = input.publishedAt ?? new Date();
  const contractVersionId = randomUUID();
  const contractEventId = randomUUID();
  const auditEvent = await appendCanonicalAuditEvent(auditStore, {
    sourceTable: "agent_contract_events",
    sourceEventId: contractEventId,
    eventName: "agent_contract.published",
    principalId: input.operator.principal_id,
    principalKind: input.operator.principal_kind,
    roleOrScope: CONTRACT_PUBLISH_SCOPE,
    correlationId: input.correlationId,
    chainNamespace: "agent-contract-registry",
    payload: {
      contract_id: material.contract_id,
      version: material.version,
      side: material.side,
      reason_code: input.reasonCode,
      content_hash: contentHash,
      prompt_template_ref: material.prompt_template_ref,
      rubric_ref: material.rubric_ref,
      tool_surface_ref: material.tool_surface_ref,
      model_ref: material.model_ref,
      reviewer_principal_id: input.reviewerPrincipalId,
    },
    createdAt: publishedAt,
  });

  const contract = await repository.insertContractVersion({
    agent_contract_version_id: contractVersionId,
    contract_id: material.contract_id,
    version: material.version,
    side: material.side,
    status: "published",
    prompt_template_ref: material.prompt_template_ref,
    rubric_ref: material.rubric_ref,
    tool_surface_ref: material.tool_surface_ref,
    model_ref: material.model_ref,
    runtime_settings: material.runtime_settings,
    extension_fields: material.extension_fields,
    content_hash: contentHash,
    description: material.description,
    author_principal_id: input.operator.principal_id,
    reviewer_principal_id: input.reviewerPrincipalId,
    published_at: publishedAt,
    deprecated_after: null,
    audit_event_id: auditEvent.audit_event_id,
    created_at: publishedAt,
  });
  const event = await repository.appendContractEvent({
    agent_contract_event_id: contractEventId,
    agent_contract_version_id: contract.agent_contract_version_id,
    event_type: "published",
    reason_code: input.reasonCode,
    principal_id: input.operator.principal_id,
    reviewer_principal_id: input.reviewerPrincipalId,
    correlation_id: input.correlationId,
    audit_event_id: auditEvent.audit_event_id,
    created_at: publishedAt,
  });

  return { contract, event };
}

async function checkPublishDependencies(
  material: ContractMaterial,
  checker: ContractDependencyChecker | undefined,
): Promise<readonly DependencyResult[]> {
  if (!checker) return [];

  const results: DependencyResult[] = [];
  if (checker.checkPromptTemplate) {
    results.push(await checker.checkPromptTemplate(material.prompt_template_ref));
  }
  if (checker.checkRubric) {
    results.push(await checker.checkRubric(material.rubric_ref));
  }
  if (checker.checkToolSurface) {
    results.push(await checker.checkToolSurface(material.tool_surface_ref));
  }
  if (checker.checkModel) {
    results.push(await checker.checkModel(material.model_ref));
  }
  return results;
}

function firstDependencyFailure(
  dependencyResults: readonly DependencyResult[],
): ContractResolutionReasonCode | null {
  for (const result of dependencyResults) {
    if (result.status === "available") continue;
    if (result.kind === "prompt_template") return "prompt_template_unresolvable";
    if (result.kind === "rubric" && result.status === "missing_bias_test") {
      return "rubric_missing_bias_test";
    }
    if (result.kind === "rubric") return "rubric_unresolvable";
    if (result.kind === "tool_surface") return "tool_version_unavailable";
    if (result.kind === "model") return "model_unavailable";
  }
  return null;
}

export async function deprecateContractVersion(
  repository: AgentContractRepository,
  auditStore: CanonicalAuditWriterStore,
  input: DeprecateContractVersionInput,
): Promise<{
  readonly contract: AgentContractVersion;
  readonly event: AgentContractEvent;
}> {
  requireContractScope(input.operator, CONTRACT_DEPRECATE_SCOPE);

  const current = await repository.getContractVersion({
    contract_id: input.contractId,
    version: input.version,
  });
  if (!current) throw new ContractVersionNotFoundError(input.contractId, input.version);

  const contractEventId = randomUUID();
  const auditEvent = await appendCanonicalAuditEvent(auditStore, {
    sourceTable: "agent_contract_events",
    sourceEventId: contractEventId,
    eventName: "agent_contract.deprecated",
    principalId: input.operator.principal_id,
    principalKind: input.operator.principal_kind,
    roleOrScope: CONTRACT_DEPRECATE_SCOPE,
    correlationId: input.correlationId,
    chainNamespace: "agent-contract-registry",
    payload: {
      contract_id: current.contract_id,
      version: current.version,
      side: current.side,
      reason_code: input.reasonCode,
      deprecated_after: input.deprecatedAfter.toISOString(),
      reviewer_principal_id: input.reviewerPrincipalId ?? null,
    },
    createdAt: input.deprecatedAfter,
  });

  const contract = await repository.updateContractDeprecatedAfter({
    contractVersionId: current.agent_contract_version_id,
    deprecatedAfter: input.deprecatedAfter,
  });
  const event = await repository.appendContractEvent({
    agent_contract_event_id: contractEventId,
    agent_contract_version_id: contract.agent_contract_version_id,
    event_type: "deprecated",
    reason_code: input.reasonCode,
    principal_id: input.operator.principal_id,
    reviewer_principal_id: input.reviewerPrincipalId ?? null,
    correlation_id: input.correlationId,
    audit_event_id: auditEvent.audit_event_id,
    created_at: input.deprecatedAfter,
  });

  return { contract, event };
}

async function appendIdempotentPublishEvent(
  repository: AgentContractRepository,
  contract: AgentContractVersion,
  input: PublishReviewedContractVersionInput,
): Promise<AgentContractEvent> {
  const [event] = await repository.listContractEvents({
    contractVersionId: contract.agent_contract_version_id,
    limit: 1,
  });
  if (!event) {
    throw new Error(
      `Published contract "${input.contract_id}" version "${input.version}" is missing publication event evidence.`,
    );
  }
  return event;
}

function toContractMaterial(input: ContractMaterial): ContractMaterial {
  return {
    contract_id: input.contract_id,
    version: input.version,
    side: input.side,
    prompt_template_ref: input.prompt_template_ref,
    rubric_ref: input.rubric_ref,
    tool_surface_ref: input.tool_surface_ref,
    model_ref: input.model_ref,
    runtime_settings: input.runtime_settings,
    ...(input.extension_fields ? { extension_fields: input.extension_fields } : {}),
    description: input.description,
  };
}
