import { randomUUID } from "node:crypto";

import type { AuditLogEventRow } from "@spyglass/db";
import type {
  CanonicalAuditWriterStore,
  CanonicalAuditWriterTx,
  InsertCanonicalAuditEventRow,
} from "@spyglass/audit-log";

import type {
  BiasTestArtifactQuery,
  RubricDispatchGateEventQuery,
  RubricEventQuery,
  RubricRepository,
  RubricVersionQuery,
} from "../repo.js";
import type {
  BiasTestArtifact,
  NewBiasTestArtifact,
  NewRubricDispatchGateEvent,
  NewRubricEvent,
  NewRubricVersion,
  RubricDispatchGateEvent,
  RubricEvent,
  RubricRef,
  RubricVersion,
} from "../types.js";

export const OPERATOR_ID = "11111111-1111-4111-8111-111111111111";
export const REVIEWER_ID = "22222222-2222-4222-8222-222222222222";

export class MemoryRubricRepository implements RubricRepository {
  readonly versions = new Map<string, RubricVersion>();
  readonly artifacts = new Map<string, BiasTestArtifact>();
  readonly events: RubricEvent[] = [];
  readonly gateEvents: RubricDispatchGateEvent[] = [];

  async getRubricVersion(ref: RubricRef): Promise<RubricVersion | null> {
    return this.versions.get(key(ref)) ?? null;
  }

  async insertRubricVersion(input: NewRubricVersion): Promise<RubricVersion> {
    const row: RubricVersion = {
      ...input,
      rubric_version_id: input.rubric_version_id ?? randomUUID(),
      created_at: input.created_at ?? new Date(),
    };
    this.versions.set(key(row), row);
    return row;
  }

  async updateRubricBiasTestRef(input: {
    readonly rubricVersionId: string;
    readonly biasTestArtifactId: string;
  }): Promise<RubricVersion> {
    for (const row of this.versions.values()) {
      if (row.rubric_version_id !== input.rubricVersionId) continue;
      const updated = {
        ...row,
        bias_test_ref: { bias_test_artifact_id: input.biasTestArtifactId },
      };
      this.versions.set(key(updated), updated);
      return updated;
    }
    throw new Error(`rubric version ${input.rubricVersionId} not found`);
  }

  async updateRubricDeprecatedAfter(input: {
    readonly rubricVersionId: string;
    readonly deprecatedAfter: Date;
  }): Promise<RubricVersion> {
    for (const row of this.versions.values()) {
      if (row.rubric_version_id !== input.rubricVersionId) continue;
      const updated = {
        ...row,
        status: "deprecated" as const,
        deprecated_after: input.deprecatedAfter,
      };
      this.versions.set(key(updated), updated);
      return updated;
    }
    throw new Error(`rubric version ${input.rubricVersionId} not found`);
  }

  async appendRubricEvent(input: NewRubricEvent): Promise<RubricEvent> {
    const row: RubricEvent = {
      ...input,
      rubric_event_id: input.rubric_event_id ?? randomUUID(),
      created_at: input.created_at ?? new Date(),
    };
    this.events.push(row);
    return row;
  }

  async getBiasTestArtifact(artifactId: string): Promise<BiasTestArtifact | null> {
    return this.artifacts.get(artifactId) ?? null;
  }

  async insertBiasTestArtifact(input: NewBiasTestArtifact): Promise<BiasTestArtifact> {
    const row: BiasTestArtifact = {
      ...input,
      created_at: input.created_at ?? new Date(),
    };
    this.artifacts.set(row.bias_test_artifact_id, row);
    return row;
  }

  async appendDispatchGateEvent(
    input: NewRubricDispatchGateEvent,
  ): Promise<RubricDispatchGateEvent> {
    const row: RubricDispatchGateEvent = {
      ...input,
      gate_event_id: input.gate_event_id ?? randomUUID(),
      created_at: input.created_at ?? new Date(),
    };
    this.gateEvents.push(row);
    return row;
  }

  async listRubricVersions(query: RubricVersionQuery): Promise<readonly RubricVersion[]> {
    return [...this.versions.values()]
      .filter((row) => !query.rubricId || row.rubric_id === query.rubricId)
      .filter((row) => !query.side || row.side === query.side)
      .filter((row) => !query.status || row.status === query.status)
      .slice(0, query.limit);
  }

  async listBiasTestArtifacts(query: BiasTestArtifactQuery): Promise<readonly BiasTestArtifact[]> {
    return [...this.artifacts.values()]
      .filter((row) => !query.rubricId || row.rubric_id === query.rubricId)
      .filter((row) => !query.rubricVersion || row.rubric_version === query.rubricVersion)
      .filter((row) => !query.status || row.status === query.status)
      .slice(0, query.limit);
  }

  async listRubricEvents(query: RubricEventQuery): Promise<readonly RubricEvent[]> {
    return this.events
      .filter((row) => !query.rubricVersionId || row.rubric_version_id === query.rubricVersionId)
      .filter((row) => !query.principalId || row.principal_id === query.principalId)
      .slice(0, query.limit);
  }

  async listDispatchGateEvents(
    query: RubricDispatchGateEventQuery,
  ): Promise<readonly RubricDispatchGateEvent[]> {
    return this.gateEvents
      .filter((row) => !query.rubricId || row.rubric_id === query.rubricId)
      .filter((row) => !query.rubricVersion || row.rubric_version === query.rubricVersion)
      .filter((row) => !query.reasonCode || row.reason_code === query.reasonCode)
      .slice(0, query.limit);
  }
}

export class MemoryCanonicalAuditStore implements CanonicalAuditWriterStore {
  readonly rows: AuditLogEventRow[] = [];

  async transaction<T>(fn: (tx: CanonicalAuditWriterTx) => Promise<T>): Promise<T> {
    return fn({
      lockChainNamespace: async () => undefined,
      getLastEventHash: async (chainNamespace) =>
        this.rows.filter((row) => row.chain_namespace === chainNamespace).at(-1)?.event_hash ??
        null,
      insertEvent: async (row) => {
        const inserted = toAuditLogEventRow(row);
        this.rows.push(inserted);
        return inserted;
      },
    });
  }
}

export function rubricMaterial() {
  return {
    rubric_id: "seeker-fit",
    version: "1.0.0",
    side: "seeker" as const,
    dimensions: [
      {
        dimension_id: "skills",
        label: "Skills Match",
        description: "Role-relevant skills evidence.",
        min_score: 0,
        max_score: 5,
        weight: 2,
        evidence_expectations: "Skill evidence from the seeker ticket.",
        required: true,
      },
      {
        dimension_id: "availability",
        label: "Availability",
        description: "Schedule and start-date fit.",
        min_score: 0,
        max_score: 5,
        weight: 1,
        required: true,
      },
    ],
    aggregation_policy: {
      kind: "weighted_sum" as const,
      weight_normalization: "sum_to_one" as const,
      rounding: "half_away_from_zero_4dp" as const,
    },
    description: "Initial seeker fit rubric.",
  };
}

export function completedArtifactInput(rubric: RubricVersion) {
  return {
    operator: {
      principal_id: OPERATOR_ID,
      principal_kind: "human" as const,
      scopes: ["bias_test.register"],
    },
    rubricId: rubric.rubric_id,
    rubricVersion: rubric.version,
    rubricContentHash: rubric.content_hash,
    methodologyRef: { methodology_id: "nist-ai-rmf-measure-2.11", version: "1.0.0" },
    status: "completed" as const,
    jurisdictionCoverage: ["phase-0", "us-general"],
    reviewerPrincipalId: REVIEWER_ID,
    completedAt: new Date("2026-05-20T13:00:00.000Z"),
    artifactUri: "evidence://bias-tests/seeker-fit/1.0.0",
    correlationId: "corr-bias-test",
  };
}

function key(ref: RubricRef): string {
  return `${ref.rubric_id}@${ref.version}`;
}

function toAuditLogEventRow(row: InsertCanonicalAuditEventRow): AuditLogEventRow {
  return {
    audit_event_id: row.audit_event_id ?? randomUUID(),
    source_table: row.source_table,
    source_event_id: row.source_event_id,
    event_name: row.event_name,
    principal_id: row.principal_id,
    principal_kind: row.principal_kind,
    role_or_scope: row.role_or_scope,
    correlation_id: row.correlation_id,
    payload: row.payload,
    payload_hash: row.payload_hash,
    previous_hash: row.previous_hash,
    event_hash: row.event_hash,
    chain_namespace: row.chain_namespace,
    hash_algorithm: row.hash_algorithm,
    canonicalization_version: row.canonicalization_version,
    created_at: row.created_at,
    tombstoned_at: null,
  };
}
