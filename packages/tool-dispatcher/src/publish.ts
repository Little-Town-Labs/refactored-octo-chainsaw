import { randomUUID } from "node:crypto";

import { appendCanonicalAuditEvent, type CanonicalAuditWriterStore } from "@spyglass/audit-log";

import type { ToolRepository } from "./repo.js";
import {
  TOOL_SURFACE_DEPRECATE_SCOPE,
  TOOL_SURFACE_PUBLISH_SCOPE,
  requireToolScope,
  type ScopedPrincipal,
} from "./scopes.js";
import type {
  ToolDescriptorVersion,
  ToolEventReasonCode,
  ToolSurfaceEvent,
  ToolSurfaceVersion,
} from "./types.js";
import {
  computeDescriptorContentHash,
  computeSurfaceContentHash,
  descriptorKey,
  surfaceKey,
  type ToolDescriptorMaterial,
  type ToolSurfaceMaterial,
  validateDescriptorMaterial,
  validateSurfaceMaterial,
} from "./validation.js";

export interface PublishDescriptorInput extends ToolDescriptorMaterial {
  readonly operator: ScopedPrincipal;
  readonly reasonCode: ToolEventReasonCode;
  readonly correlationId: string;
  readonly publishedAt?: Date;
}

export interface PublishSurfaceInput extends ToolSurfaceMaterial {
  readonly operator: ScopedPrincipal;
  readonly reasonCode: ToolEventReasonCode;
  readonly correlationId: string;
  readonly publishedAt?: Date;
}

export interface DeprecateToolSurfaceInput {
  readonly surfaceId: string;
  readonly version: string;
  readonly operator: ScopedPrincipal;
  readonly reasonCode: ToolEventReasonCode;
  readonly correlationId: string;
  readonly deprecatedAt: Date;
}

export class ToolVersionMutationError extends Error {
  constructor(ref: string) {
    super(`Tool policy version "${ref}" already exists with different material.`);
    this.name = "ToolVersionMutationError";
  }
}

export class ToolVersionNotFoundError extends Error {
  constructor(ref: string) {
    super(`Tool policy version "${ref}" was not found.`);
    this.name = "ToolVersionNotFoundError";
  }
}

export async function publishToolDescriptor(
  repository: ToolRepository,
  auditStore: CanonicalAuditWriterStore,
  input: PublishDescriptorInput,
): Promise<{ readonly descriptor: ToolDescriptorVersion; readonly event: ToolSurfaceEvent }> {
  requireToolScope(input.operator, TOOL_SURFACE_PUBLISH_SCOPE);
  const material = validateDescriptorMaterial(input);
  const contentHash = computeDescriptorContentHash(material);
  const existing = await repository.getDescriptor(material);
  if (existing && existing.content_hash !== contentHash) {
    throw new ToolVersionMutationError(descriptorKey(material));
  }
  if (existing)
    return { descriptor: existing, event: await appendExistingEvent(repository, existing) };

  const publishedAt = input.publishedAt ?? new Date();
  const eventId = randomUUID();
  const auditEvent = await appendCanonicalAuditEvent(auditStore, {
    sourceTable: "tool_surface_events",
    sourceEventId: eventId,
    eventName: "tool_descriptor.published",
    principalId: input.operator.principal_id,
    principalKind: input.operator.principal_kind,
    roleOrScope: TOOL_SURFACE_PUBLISH_SCOPE,
    correlationId: input.correlationId,
    chainNamespace: "tool-surface-dispatcher",
    payload: {
      name: material.name,
      version: material.version,
      reason_code: input.reasonCode,
      content_hash: contentHash,
    },
    createdAt: publishedAt,
  });
  const descriptor = await repository.insertDescriptor({
    ...material,
    status: "published",
    content_hash: contentHash,
    audit_event_id: auditEvent.audit_event_id,
    published_at: publishedAt,
    deprecated_at: null,
    created_at: publishedAt,
  });
  const event = await repository.appendToolSurfaceEvent({
    tool_surface_event_id: eventId,
    subject_kind: "descriptor",
    subject_ref: descriptorKey(descriptor),
    event_type: "descriptor_published",
    reason_code: input.reasonCode,
    principal_id: input.operator.principal_id,
    correlation_id: input.correlationId,
    audit_event_id: auditEvent.audit_event_id,
    created_at: publishedAt,
  });
  return { descriptor, event };
}

export async function publishToolSurface(
  repository: ToolRepository,
  auditStore: CanonicalAuditWriterStore,
  input: PublishSurfaceInput,
): Promise<{ readonly surface: ToolSurfaceVersion; readonly event: ToolSurfaceEvent }> {
  requireToolScope(input.operator, TOOL_SURFACE_PUBLISH_SCOPE);
  const material = validateSurfaceMaterial(input);
  const contentHash = computeSurfaceContentHash(material);
  const existing = await repository.getSurface({
    id: material.surface_id,
    version: material.version,
  });
  if (existing && existing.content_hash !== contentHash) {
    throw new ToolVersionMutationError(
      surfaceKey({ id: material.surface_id, version: material.version }),
    );
  }
  if (existing)
    return { surface: existing, event: await appendExistingEvent(repository, existing) };

  for (const ref of material.descriptor_refs) {
    const descriptor = await repository.getDescriptor(ref);
    if (!descriptor || descriptor.status !== "published") {
      throw new ToolVersionNotFoundError(descriptorKey(ref));
    }
  }

  const publishedAt = input.publishedAt ?? new Date();
  const eventId = randomUUID();
  const auditEvent = await appendCanonicalAuditEvent(auditStore, {
    sourceTable: "tool_surface_events",
    sourceEventId: eventId,
    eventName: "tool_surface.published",
    principalId: input.operator.principal_id,
    principalKind: input.operator.principal_kind,
    roleOrScope: TOOL_SURFACE_PUBLISH_SCOPE,
    correlationId: input.correlationId,
    chainNamespace: "tool-surface-dispatcher",
    payload: {
      surface_id: material.surface_id,
      version: material.version,
      reason_code: input.reasonCode,
      descriptor_refs: material.descriptor_refs,
      content_hash: contentHash,
    },
    createdAt: publishedAt,
  });
  const surface = await repository.insertSurface({
    ...material,
    status: "published",
    content_hash: contentHash,
    audit_event_id: auditEvent.audit_event_id,
    published_at: publishedAt,
    deprecated_at: null,
    created_at: publishedAt,
  });
  const event = await repository.appendToolSurfaceEvent({
    tool_surface_event_id: eventId,
    subject_kind: "surface",
    subject_ref: surfaceKey({ id: surface.surface_id, version: surface.version }),
    event_type: "surface_published",
    reason_code: input.reasonCode,
    principal_id: input.operator.principal_id,
    correlation_id: input.correlationId,
    audit_event_id: auditEvent.audit_event_id,
    created_at: publishedAt,
  });
  return { surface, event };
}

export async function deprecateToolSurface(
  repository: ToolRepository,
  auditStore: CanonicalAuditWriterStore,
  input: DeprecateToolSurfaceInput,
): Promise<{ readonly surface: ToolSurfaceVersion; readonly event: ToolSurfaceEvent }> {
  requireToolScope(input.operator, TOOL_SURFACE_DEPRECATE_SCOPE);
  const existing = await repository.getSurface({ id: input.surfaceId, version: input.version });
  if (!existing)
    throw new ToolVersionNotFoundError(surfaceKey({ id: input.surfaceId, version: input.version }));
  const eventId = randomUUID();
  const auditEvent = await appendCanonicalAuditEvent(auditStore, {
    sourceTable: "tool_surface_events",
    sourceEventId: eventId,
    eventName: "tool_surface.deprecated",
    principalId: input.operator.principal_id,
    principalKind: input.operator.principal_kind,
    roleOrScope: TOOL_SURFACE_DEPRECATE_SCOPE,
    correlationId: input.correlationId,
    chainNamespace: "tool-surface-dispatcher",
    payload: { surface_id: input.surfaceId, version: input.version, reason_code: input.reasonCode },
    createdAt: input.deprecatedAt,
  });
  const surface = await repository.updateSurfaceDeprecated({
    toolSurfaceVersionId: existing.tool_surface_version_id,
    deprecatedAt: input.deprecatedAt,
  });
  const event = await repository.appendToolSurfaceEvent({
    tool_surface_event_id: eventId,
    subject_kind: "surface",
    subject_ref: surfaceKey({ id: surface.surface_id, version: surface.version }),
    event_type: "deprecated",
    reason_code: input.reasonCode,
    principal_id: input.operator.principal_id,
    correlation_id: input.correlationId,
    audit_event_id: auditEvent.audit_event_id,
    created_at: input.deprecatedAt,
  });
  return { surface, event };
}

async function appendExistingEvent(
  repository: ToolRepository,
  input: ToolDescriptorVersion | ToolSurfaceVersion,
): Promise<ToolSurfaceEvent> {
  return repository.appendToolSurfaceEvent({
    subject_kind: "tool_descriptor_id" in input ? "descriptor" : "surface",
    subject_ref:
      "tool_descriptor_id" in input
        ? descriptorKey(input)
        : surfaceKey({ id: input.surface_id, version: input.version }),
    event_type: "surface_published",
    reason_code: "initial_launch",
    principal_id: "00000000-0000-4000-8000-000000000000",
    correlation_id: "idempotent-republish",
    audit_event_id: input.audit_event_id ?? "00000000-0000-4000-8000-000000000000",
  });
}
