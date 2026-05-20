import { randomUUID } from "node:crypto";

import { appendCanonicalAuditEvent, type CanonicalAuditWriterStore } from "@spyglass/audit-log";

import type { RubricRepository } from "./repo.js";
import {
  RUBRIC_DEPRECATE_SCOPE,
  RUBRIC_PUBLISH_SCOPE,
  requireRubricScope,
  type ScopedPrincipal,
} from "./scopes.js";
import type { RubricEvent, RubricEventReasonCode, RubricVersion } from "./types.js";
import {
  computeRubricContentHash,
  type RubricMaterial,
  validateRubricMaterial,
} from "./validation.js";

export interface PublishRubricVersionInput extends RubricMaterial {
  readonly author_principal_id: string;
  readonly reviewer_principal_id?: string | null;
  readonly bias_test_artifact_id?: string | null;
  readonly audit_event_id?: string | null;
  readonly published_at?: Date | null;
  readonly created_at?: Date;
}

export interface PublishReviewedRubricVersionInput extends RubricMaterial {
  readonly operator: ScopedPrincipal;
  readonly reviewerPrincipalId: string;
  readonly reasonCode: RubricEventReasonCode;
  readonly correlationId: string;
  readonly biasTestArtifactId: string;
  readonly publishedAt?: Date;
}

export interface DeprecateRubricVersionInput {
  readonly rubricId: string;
  readonly version: string;
  readonly operator: ScopedPrincipal;
  readonly reviewerPrincipalId?: string | null;
  readonly reasonCode: RubricEventReasonCode;
  readonly correlationId: string;
  readonly deprecatedAfter: Date;
}

export class RubricVersionMutationError extends Error {
  constructor(rubricId: string, version: string) {
    super(`Rubric "${rubricId}" version "${version}" already exists with different material.`);
    this.name = "RubricVersionMutationError";
  }
}

export class RubricVersionNotFoundError extends Error {
  constructor(rubricId: string, version: string) {
    super(`Rubric "${rubricId}" version "${version}" was not found.`);
    this.name = "RubricVersionNotFoundError";
  }
}

export async function publishRubricVersion(
  repository: RubricRepository,
  input: PublishRubricVersionInput,
): Promise<RubricVersion> {
  const material = validateRubricMaterial(toRubricMaterial(input));
  const contentHash = computeRubricContentHash(material);
  const existing = await repository.getRubricVersion({
    rubric_id: material.rubric_id,
    version: material.version,
  });

  if (existing) {
    if (existing.content_hash !== contentHash) {
      throw new RubricVersionMutationError(material.rubric_id, material.version);
    }
    return existing;
  }

  return repository.insertRubricVersion({
    rubric_id: material.rubric_id,
    version: material.version,
    side: material.side,
    status: input.audit_event_id ? "published" : "draft",
    dimensions: material.dimensions,
    aggregation_policy: material.aggregation_policy,
    bias_test_ref: input.bias_test_artifact_id
      ? { bias_test_artifact_id: input.bias_test_artifact_id }
      : null,
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

export async function publishReviewedRubricVersion(
  repository: RubricRepository,
  auditStore: CanonicalAuditWriterStore,
  input: PublishReviewedRubricVersionInput,
): Promise<{ readonly rubric: RubricVersion; readonly event: RubricEvent }> {
  requireRubricScope(input.operator, RUBRIC_PUBLISH_SCOPE);

  const material = validateRubricMaterial(toRubricMaterial(input));
  const contentHash = computeRubricContentHash(material);
  const existing = await repository.getRubricVersion({
    rubric_id: material.rubric_id,
    version: material.version,
  });
  if (existing && existing.content_hash !== contentHash) {
    throw new RubricVersionMutationError(material.rubric_id, material.version);
  }
  if (existing) {
    return {
      rubric: existing,
      event: await appendIdempotentPublishEvent(repository, existing),
    };
  }

  const publishedAt = input.publishedAt ?? new Date();
  const rubricVersionId = randomUUID();
  const rubricEventId = randomUUID();
  const auditEvent = await appendCanonicalAuditEvent(auditStore, {
    sourceTable: "rubric_events",
    sourceEventId: rubricEventId,
    eventName: "rubric.published",
    principalId: input.operator.principal_id,
    principalKind: input.operator.principal_kind,
    roleOrScope: RUBRIC_PUBLISH_SCOPE,
    correlationId: input.correlationId,
    chainNamespace: "rubric-registry",
    payload: {
      rubric_id: material.rubric_id,
      version: material.version,
      side: material.side,
      reason_code: input.reasonCode,
      content_hash: contentHash,
      bias_test_artifact_id: input.biasTestArtifactId,
      reviewer_principal_id: input.reviewerPrincipalId,
    },
    createdAt: publishedAt,
  });

  const rubric = await repository.insertRubricVersion({
    rubric_version_id: rubricVersionId,
    rubric_id: material.rubric_id,
    version: material.version,
    side: material.side,
    status: "published",
    dimensions: material.dimensions,
    aggregation_policy: material.aggregation_policy,
    bias_test_ref: { bias_test_artifact_id: input.biasTestArtifactId },
    content_hash: contentHash,
    description: material.description,
    author_principal_id: input.operator.principal_id,
    reviewer_principal_id: input.reviewerPrincipalId,
    published_at: publishedAt,
    deprecated_after: null,
    audit_event_id: auditEvent.audit_event_id,
    created_at: publishedAt,
  });

  const event = await repository.appendRubricEvent({
    rubric_event_id: rubricEventId,
    rubric_version_id: rubric.rubric_version_id,
    event_type: "published",
    reason_code: input.reasonCode,
    principal_id: input.operator.principal_id,
    reviewer_principal_id: input.reviewerPrincipalId,
    correlation_id: input.correlationId,
    audit_event_id: auditEvent.audit_event_id,
    created_at: publishedAt,
  });

  return { rubric, event };
}

export async function deprecateRubricVersion(
  repository: RubricRepository,
  auditStore: CanonicalAuditWriterStore,
  input: DeprecateRubricVersionInput,
): Promise<{ readonly rubric: RubricVersion; readonly event: RubricEvent }> {
  requireRubricScope(input.operator, RUBRIC_DEPRECATE_SCOPE);

  const existing = await repository.getRubricVersion({
    rubric_id: input.rubricId,
    version: input.version,
  });
  if (!existing) throw new RubricVersionNotFoundError(input.rubricId, input.version);

  const eventId = randomUUID();
  const auditEvent = await appendCanonicalAuditEvent(auditStore, {
    sourceTable: "rubric_events",
    sourceEventId: eventId,
    eventName: "rubric.deprecated",
    principalId: input.operator.principal_id,
    principalKind: input.operator.principal_kind,
    roleOrScope: RUBRIC_DEPRECATE_SCOPE,
    correlationId: input.correlationId,
    chainNamespace: "rubric-registry",
    payload: {
      rubric_id: input.rubricId,
      version: input.version,
      reason_code: input.reasonCode,
      deprecated_after: input.deprecatedAfter.toISOString(),
    },
    createdAt: input.deprecatedAfter,
  });

  const rubric = await repository.updateRubricDeprecatedAfter({
    rubricVersionId: existing.rubric_version_id,
    deprecatedAfter: input.deprecatedAfter,
  });
  const event = await repository.appendRubricEvent({
    rubric_event_id: eventId,
    rubric_version_id: rubric.rubric_version_id,
    event_type: "deprecated",
    reason_code: input.reasonCode,
    principal_id: input.operator.principal_id,
    reviewer_principal_id: input.reviewerPrincipalId ?? null,
    correlation_id: input.correlationId,
    audit_event_id: auditEvent.audit_event_id,
    created_at: input.deprecatedAfter,
  });

  return { rubric, event };
}

async function appendIdempotentPublishEvent(
  repository: RubricRepository,
  rubric: RubricVersion,
): Promise<RubricEvent> {
  const existing = await repository.listRubricEvents({
    rubricVersionId: rubric.rubric_version_id,
    limit: 1,
  });
  if (existing[0]) return existing[0];
  throw new Error("published rubric version exists without publication event");
}

function toRubricMaterial(input: RubricMaterial): RubricMaterial {
  return {
    rubric_id: input.rubric_id,
    version: input.version,
    side: input.side,
    dimensions: input.dimensions,
    aggregation_policy: input.aggregation_policy,
    description: input.description,
  };
}
