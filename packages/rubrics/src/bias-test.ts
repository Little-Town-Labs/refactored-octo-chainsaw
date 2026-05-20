import { randomUUID } from "node:crypto";

import { appendCanonicalAuditEvent, type CanonicalAuditWriterStore } from "@spyglass/audit-log";

import type { RubricRepository } from "./repo.js";
import { BIAS_TEST_REGISTER_SCOPE, requireRubricScope, type ScopedPrincipal } from "./scopes.js";
import type { BiasTestArtifact, BiasTestMethodologyRef } from "./types.js";

export interface RegisterBiasTestArtifactInput {
  readonly operator: ScopedPrincipal;
  readonly rubricId: string;
  readonly rubricVersion: string;
  readonly rubricContentHash: string;
  readonly methodologyRef: BiasTestMethodologyRef;
  readonly status: BiasTestArtifact["status"];
  readonly jurisdictionCoverage: readonly string[];
  readonly reviewerPrincipalId?: string | null;
  readonly completedAt?: Date | null;
  readonly expiresAt?: Date | null;
  readonly artifactUri?: string | null;
  readonly correlationId: string;
  readonly artifactId?: string;
  readonly createdAt?: Date;
}

export class BiasTestArtifactInvalidError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BiasTestArtifactInvalidError";
  }
}

export async function registerBiasTestArtifact(
  repository: RubricRepository,
  auditStore: CanonicalAuditWriterStore,
  input: RegisterBiasTestArtifactInput,
): Promise<BiasTestArtifact> {
  requireRubricScope(input.operator, BIAS_TEST_REGISTER_SCOPE);
  validateBiasTestArtifactInput(input);

  const createdAt = input.createdAt ?? input.completedAt ?? new Date();
  const artifactId = input.artifactId ?? randomUUID();
  const auditEvent = await appendCanonicalAuditEvent(auditStore, {
    sourceTable: "bias_test_artifacts",
    sourceEventId: artifactId,
    eventName: "rubric.bias_test_registered",
    principalId: input.operator.principal_id,
    principalKind: input.operator.principal_kind,
    roleOrScope: BIAS_TEST_REGISTER_SCOPE,
    correlationId: input.correlationId,
    chainNamespace: "rubric-registry",
    payload: {
      bias_test_artifact_id: artifactId,
      rubric_id: input.rubricId,
      rubric_version: input.rubricVersion,
      rubric_content_hash: input.rubricContentHash,
      methodology_ref: input.methodologyRef,
      status: input.status,
      jurisdiction_coverage: input.jurisdictionCoverage,
    },
    createdAt,
  });

  return repository.insertBiasTestArtifact({
    bias_test_artifact_id: artifactId,
    rubric_id: input.rubricId,
    rubric_version: input.rubricVersion,
    rubric_content_hash: input.rubricContentHash,
    methodology_ref: input.methodologyRef,
    status: input.status,
    jurisdiction_coverage: input.jurisdictionCoverage,
    reviewer_principal_id: input.reviewerPrincipalId ?? null,
    completed_at: input.completedAt ?? null,
    expires_at: input.expiresAt ?? null,
    artifact_uri: input.artifactUri ?? null,
    audit_event_id: auditEvent.audit_event_id,
    created_at: createdAt,
  });
}

function validateBiasTestArtifactInput(input: RegisterBiasTestArtifactInput): void {
  if (!input.rubricId.trim()) throw new BiasTestArtifactInvalidError("rubricId is required");
  if (!input.rubricVersion.trim()) {
    throw new BiasTestArtifactInvalidError("rubricVersion is required");
  }
  if (!input.rubricContentHash.trim()) {
    throw new BiasTestArtifactInvalidError("rubricContentHash is required");
  }
  if (!input.methodologyRef.methodology_id.trim() || !input.methodologyRef.version.trim()) {
    throw new BiasTestArtifactInvalidError("methodologyRef is required");
  }
  if (input.jurisdictionCoverage.length === 0) {
    throw new BiasTestArtifactInvalidError("jurisdictionCoverage is required");
  }
  if (input.status === "completed") {
    if (!input.reviewerPrincipalId) {
      throw new BiasTestArtifactInvalidError("completed artifacts require reviewerPrincipalId");
    }
    if (!input.completedAt) {
      throw new BiasTestArtifactInvalidError("completed artifacts require completedAt");
    }
    if (!input.artifactUri) {
      throw new BiasTestArtifactInvalidError("completed artifacts require artifactUri");
    }
  }
}
