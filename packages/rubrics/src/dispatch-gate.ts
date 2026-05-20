import { randomUUID } from "node:crypto";

import { appendCanonicalAuditEvent, type CanonicalAuditWriterStore } from "@spyglass/audit-log";
import type { VersionedRef } from "@spyglass/agent-contracts";

import type { RubricRepository } from "./repo.js";
import type {
  BiasTestArtifact,
  RubricDispatchGateResult,
  RubricGateReasonCode,
  RubricRef,
  RubricVersion,
} from "./types.js";

export interface ResolveRubricForDispatchOptions {
  readonly now?: Date;
  readonly production?: boolean;
  readonly requiredJurisdictions?: readonly string[];
  readonly auditStore?: CanonicalAuditWriterStore;
  readonly correlationId?: string;
  readonly principalId?: string;
  readonly principalKind?: "human" | "agent" | "service";
}

export async function resolveRubricForDispatch(
  repository: RubricRepository,
  ref: RubricRef,
  options: ResolveRubricForDispatchOptions = {},
): Promise<RubricDispatchGateResult> {
  const now = options.now ?? new Date();
  const rubric = await repository.getRubricVersion(ref);
  if (!rubric) return record(repository, ref, null, null, "rubric_missing", now, options);
  if (rubric.status !== "published") {
    return record(repository, ref, rubric, null, "rubric_unpublished", now, options);
  }
  if (rubric.deprecated_after && rubric.deprecated_after <= now) {
    return record(repository, ref, rubric, null, "rubric_deprecated", now, options);
  }

  if (options.production !== false) {
    const artifactResult = await resolveBiasArtifact(repository, rubric, now, options);
    if (artifactResult.reasonCode !== "rubric_gate_allowed") {
      return record(
        repository,
        ref,
        rubric,
        artifactResult.artifact,
        artifactResult.reasonCode,
        now,
        options,
      );
    }
    return record(
      repository,
      ref,
      rubric,
      artifactResult.artifact,
      "rubric_gate_allowed",
      now,
      options,
    );
  }

  return record(repository, ref, rubric, null, "rubric_gate_allowed", now, options);
}

export function createRubricDependencyChecker(
  repository: RubricRepository,
  options: ResolveRubricForDispatchOptions = {},
): (ref: VersionedRef) => Promise<{
  readonly kind: "rubric";
  readonly status: "available" | "unavailable" | "missing_bias_test";
  readonly ref: VersionedRef;
}> {
  return async (ref) => {
    const result = await resolveRubricForDispatch(
      repository,
      { rubric_id: ref.id, version: ref.version },
      options,
    );
    if (result.decision === "allow") return { kind: "rubric", status: "available", ref };
    if (result.reason_code === "rubric_missing_bias_test") {
      return { kind: "rubric", status: "missing_bias_test", ref };
    }
    return { kind: "rubric", status: "unavailable", ref };
  };
}

async function resolveBiasArtifact(
  repository: RubricRepository,
  rubric: RubricVersion,
  now: Date,
  options: ResolveRubricForDispatchOptions,
): Promise<{
  readonly artifact: BiasTestArtifact | null;
  readonly reasonCode: RubricGateReasonCode;
}> {
  if (!rubric.bias_test_ref) return { artifact: null, reasonCode: "rubric_missing_bias_test" };
  const artifact = await repository.getBiasTestArtifact(rubric.bias_test_ref.bias_test_artifact_id);
  if (!artifact) return { artifact: null, reasonCode: "rubric_missing_bias_test" };
  if (artifact.status !== "completed") {
    return { artifact, reasonCode: "rubric_bias_test_incomplete" };
  }
  if (artifact.rubric_content_hash !== rubric.content_hash) {
    return { artifact, reasonCode: "rubric_bias_test_mismatched_hash" };
  }
  if (artifact.expires_at && artifact.expires_at <= now) {
    return { artifact, reasonCode: "rubric_bias_test_expired" };
  }
  const required = options.requiredJurisdictions ?? [];
  if (
    required.length > 0 &&
    !required.every((jurisdiction) => artifact.jurisdiction_coverage.includes(jurisdiction))
  ) {
    return { artifact, reasonCode: "rubric_bias_test_insufficient_coverage" };
  }
  return { artifact, reasonCode: "rubric_gate_allowed" };
}

async function record(
  repository: RubricRepository,
  ref: RubricRef,
  rubric: RubricVersion | null,
  artifact: BiasTestArtifact | null,
  reasonCode: RubricGateReasonCode,
  checkedAt: Date,
  options: ResolveRubricForDispatchOptions,
): Promise<RubricDispatchGateResult> {
  const decision = reasonCode === "rubric_gate_allowed" ? "allow" : "deny";
  let auditEventId: string | undefined;
  if (options.auditStore && options.correlationId && options.principalId && decision === "deny") {
    const gateEventId = randomUUID();
    const auditEvent = await appendCanonicalAuditEvent(options.auditStore, {
      sourceTable: "rubric_dispatch_gate_events",
      sourceEventId: gateEventId,
      eventName: "rubric.dispatch_refused",
      principalId: options.principalId,
      principalKind: options.principalKind ?? "service",
      roleOrScope: "rubric.dispatch",
      correlationId: options.correlationId,
      chainNamespace: "rubric-registry",
      payload: {
        rubric_id: ref.rubric_id,
        version: ref.version,
        reason_code: reasonCode,
        bias_test_artifact_id: artifact?.bias_test_artifact_id ?? null,
      },
      createdAt: checkedAt,
    });
    auditEventId = auditEvent.audit_event_id;
    await repository.appendDispatchGateEvent({
      gate_event_id: gateEventId,
      rubric_id: ref.rubric_id,
      rubric_version: ref.version,
      decision,
      reason_code: reasonCode,
      bias_test_artifact_id: artifact?.bias_test_artifact_id ?? null,
      audit_event_id: auditEvent.audit_event_id,
      correlation_id: options.correlationId,
      created_at: checkedAt,
    });
  }

  return {
    decision,
    reason_code: reasonCode,
    rubric_ref: ref,
    rubric,
    bias_test_artifact: artifact,
    ...(auditEventId ? { audit_event_id: auditEventId } : {}),
    checked_at: checkedAt,
  };
}
