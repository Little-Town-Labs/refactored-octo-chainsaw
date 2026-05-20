import {
  biasTestArtifacts,
  type BiasTestArtifactRow,
  type Db,
  type NewBiasTestArtifactRow,
  type NewRubricDispatchGateEventRow,
  type NewRubricEventRow,
  type NewRubricVersionRow,
  rubricDispatchGateEvents,
  type RubricDispatchGateEventRow,
  rubricEvents,
  type RubricEventRow,
  rubricVersions,
  type RubricVersionRow,
} from "@spyglass/db";
import { and, desc, eq, gte, lte, type SQL } from "drizzle-orm";

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
} from "./types.js";

export interface RubricVersionQuery {
  readonly rubricId?: string;
  readonly side?: RubricVersion["side"];
  readonly status?: RubricVersion["status"];
  readonly from?: Date;
  readonly until?: Date;
  readonly limit: number;
}

export interface BiasTestArtifactQuery {
  readonly rubricId?: string;
  readonly rubricVersion?: string;
  readonly status?: BiasTestArtifact["status"];
  readonly from?: Date;
  readonly until?: Date;
  readonly limit: number;
}

export interface RubricEventQuery {
  readonly rubricVersionId?: string;
  readonly principalId?: string;
  readonly from?: Date;
  readonly until?: Date;
  readonly limit: number;
}

export interface RubricDispatchGateEventQuery {
  readonly rubricId?: string;
  readonly rubricVersion?: string;
  readonly reasonCode?: RubricDispatchGateEvent["reason_code"];
  readonly from?: Date;
  readonly until?: Date;
  readonly limit: number;
}

export interface RubricRepository {
  getRubricVersion(ref: RubricRef): Promise<RubricVersion | null>;
  insertRubricVersion(input: NewRubricVersion): Promise<RubricVersion>;
  updateRubricBiasTestRef(input: {
    readonly rubricVersionId: string;
    readonly biasTestArtifactId: string;
  }): Promise<RubricVersion>;
  updateRubricDeprecatedAfter(input: {
    readonly rubricVersionId: string;
    readonly deprecatedAfter: Date;
  }): Promise<RubricVersion>;
  appendRubricEvent(input: NewRubricEvent): Promise<RubricEvent>;
  getBiasTestArtifact(artifactId: string): Promise<BiasTestArtifact | null>;
  insertBiasTestArtifact(input: NewBiasTestArtifact): Promise<BiasTestArtifact>;
  appendDispatchGateEvent(input: NewRubricDispatchGateEvent): Promise<RubricDispatchGateEvent>;
  listRubricVersions(query: RubricVersionQuery): Promise<readonly RubricVersion[]>;
  listBiasTestArtifacts(query: BiasTestArtifactQuery): Promise<readonly BiasTestArtifact[]>;
  listRubricEvents(query: RubricEventQuery): Promise<readonly RubricEvent[]>;
  listDispatchGateEvents(
    query: RubricDispatchGateEventQuery,
  ): Promise<readonly RubricDispatchGateEvent[]>;
}

export interface DrizzleRubricRepositoryOptions {
  readonly db: Db;
}

export function createDrizzleRubricRepository(
  options: DrizzleRubricRepositoryOptions,
): RubricRepository {
  const db = options.db;

  return {
    async getRubricVersion(ref) {
      const rows = await db
        .select()
        .from(rubricVersions)
        .where(
          and(eq(rubricVersions.rubric_id, ref.rubric_id), eq(rubricVersions.version, ref.version)),
        )
        .limit(1);
      return rows[0] ? toRubricVersion(rows[0]) : null;
    },
    async insertRubricVersion(input) {
      const [row] = await db
        .insert(rubricVersions)
        .values(toRubricVersionInsert(input))
        .returning();
      if (!row) throw new Error("failed to insert rubric version");
      return toRubricVersion(row);
    },
    async updateRubricBiasTestRef(input) {
      const [row] = await db
        .update(rubricVersions)
        .set({ bias_test_ref: { bias_test_artifact_id: input.biasTestArtifactId } })
        .where(eq(rubricVersions.rubric_version_id, input.rubricVersionId))
        .returning();
      if (!row) throw new Error("failed to update rubric bias-test ref");
      return toRubricVersion(row);
    },
    async updateRubricDeprecatedAfter(input) {
      const [row] = await db
        .update(rubricVersions)
        .set({ status: "deprecated", deprecated_after: input.deprecatedAfter })
        .where(eq(rubricVersions.rubric_version_id, input.rubricVersionId))
        .returning();
      if (!row) throw new Error("failed to deprecate rubric version");
      return toRubricVersion(row);
    },
    async appendRubricEvent(input) {
      const [row] = await db.insert(rubricEvents).values(toRubricEventInsert(input)).returning();
      if (!row) throw new Error("failed to append rubric event");
      return toRubricEvent(row);
    },
    async getBiasTestArtifact(artifactId) {
      const rows = await db
        .select()
        .from(biasTestArtifacts)
        .where(eq(biasTestArtifacts.bias_test_artifact_id, artifactId))
        .limit(1);
      return rows[0] ? toBiasTestArtifact(rows[0]) : null;
    },
    async insertBiasTestArtifact(input) {
      const [row] = await db
        .insert(biasTestArtifacts)
        .values(toBiasTestArtifactInsert(input))
        .returning();
      if (!row) throw new Error("failed to insert bias-test artifact");
      return toBiasTestArtifact(row);
    },
    async appendDispatchGateEvent(input) {
      const [row] = await db
        .insert(rubricDispatchGateEvents)
        .values(toDispatchGateEventInsert(input))
        .returning();
      if (!row) throw new Error("failed to append rubric dispatch gate event");
      return toDispatchGateEvent(row);
    },
    async listRubricVersions(query) {
      const rows = await db
        .select()
        .from(rubricVersions)
        .where(buildRubricVersionWhere(query))
        .orderBy(desc(rubricVersions.created_at))
        .limit(query.limit);
      return rows.map(toRubricVersion);
    },
    async listBiasTestArtifacts(query) {
      const rows = await db
        .select()
        .from(biasTestArtifacts)
        .where(buildBiasTestWhere(query))
        .orderBy(desc(biasTestArtifacts.created_at))
        .limit(query.limit);
      return rows.map(toBiasTestArtifact);
    },
    async listRubricEvents(query) {
      const rows = await db
        .select()
        .from(rubricEvents)
        .where(buildRubricEventWhere(query))
        .orderBy(desc(rubricEvents.created_at))
        .limit(query.limit);
      return rows.map(toRubricEvent);
    },
    async listDispatchGateEvents(query) {
      const rows = await db
        .select()
        .from(rubricDispatchGateEvents)
        .where(buildDispatchGateWhere(query))
        .orderBy(desc(rubricDispatchGateEvents.created_at))
        .limit(query.limit);
      return rows.map(toDispatchGateEvent);
    },
  };
}

function buildRubricVersionWhere(query: RubricVersionQuery): SQL | undefined {
  const clauses: SQL[] = [];
  if (query.rubricId) clauses.push(eq(rubricVersions.rubric_id, query.rubricId));
  if (query.side) clauses.push(eq(rubricVersions.side, query.side));
  if (query.status) clauses.push(eq(rubricVersions.status, query.status));
  if (query.from) clauses.push(gte(rubricVersions.created_at, query.from));
  if (query.until) clauses.push(lte(rubricVersions.created_at, query.until));
  return clauses.length > 0 ? and(...clauses) : undefined;
}

function buildBiasTestWhere(query: BiasTestArtifactQuery): SQL | undefined {
  const clauses: SQL[] = [];
  if (query.rubricId) clauses.push(eq(biasTestArtifacts.rubric_id, query.rubricId));
  if (query.rubricVersion) {
    clauses.push(eq(biasTestArtifacts.rubric_version, query.rubricVersion));
  }
  if (query.status) clauses.push(eq(biasTestArtifacts.status, query.status));
  if (query.from) clauses.push(gte(biasTestArtifacts.created_at, query.from));
  if (query.until) clauses.push(lte(biasTestArtifacts.created_at, query.until));
  return clauses.length > 0 ? and(...clauses) : undefined;
}

function buildRubricEventWhere(query: RubricEventQuery): SQL | undefined {
  const clauses: SQL[] = [];
  if (query.rubricVersionId) {
    clauses.push(eq(rubricEvents.rubric_version_id, query.rubricVersionId));
  }
  if (query.principalId) clauses.push(eq(rubricEvents.principal_id, query.principalId));
  if (query.from) clauses.push(gte(rubricEvents.created_at, query.from));
  if (query.until) clauses.push(lte(rubricEvents.created_at, query.until));
  return clauses.length > 0 ? and(...clauses) : undefined;
}

function buildDispatchGateWhere(query: RubricDispatchGateEventQuery): SQL | undefined {
  const clauses: SQL[] = [];
  if (query.rubricId) clauses.push(eq(rubricDispatchGateEvents.rubric_id, query.rubricId));
  if (query.rubricVersion) {
    clauses.push(eq(rubricDispatchGateEvents.rubric_version, query.rubricVersion));
  }
  if (query.reasonCode) clauses.push(eq(rubricDispatchGateEvents.reason_code, query.reasonCode));
  if (query.from) clauses.push(gte(rubricDispatchGateEvents.created_at, query.from));
  if (query.until) clauses.push(lte(rubricDispatchGateEvents.created_at, query.until));
  return clauses.length > 0 ? and(...clauses) : undefined;
}

function toRubricVersionInsert(input: NewRubricVersion): NewRubricVersionRow {
  return {
    ...(input.rubric_version_id ? { rubric_version_id: input.rubric_version_id } : {}),
    rubric_id: input.rubric_id,
    version: input.version,
    side: input.side,
    status: input.status,
    dimensions: [...input.dimensions],
    aggregation_policy: input.aggregation_policy,
    bias_test_ref: input.bias_test_ref,
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

function toBiasTestArtifactInsert(input: NewBiasTestArtifact): NewBiasTestArtifactRow {
  return {
    bias_test_artifact_id: input.bias_test_artifact_id,
    rubric_id: input.rubric_id,
    rubric_version: input.rubric_version,
    rubric_content_hash: input.rubric_content_hash,
    methodology_ref: input.methodology_ref,
    status: input.status,
    jurisdiction_coverage: [...input.jurisdiction_coverage],
    reviewer_principal_id: input.reviewer_principal_id,
    completed_at: input.completed_at,
    expires_at: input.expires_at,
    artifact_uri: input.artifact_uri,
    audit_event_id: input.audit_event_id,
    ...(input.created_at ? { created_at: input.created_at } : {}),
  };
}

function toRubricEventInsert(input: NewRubricEvent): NewRubricEventRow {
  return {
    ...(input.rubric_event_id ? { rubric_event_id: input.rubric_event_id } : {}),
    rubric_version_id: input.rubric_version_id,
    event_type: input.event_type,
    reason_code: input.reason_code,
    principal_id: input.principal_id,
    reviewer_principal_id: input.reviewer_principal_id,
    correlation_id: input.correlation_id,
    audit_event_id: input.audit_event_id,
    ...(input.created_at ? { created_at: input.created_at } : {}),
  };
}

function toDispatchGateEventInsert(
  input: NewRubricDispatchGateEvent,
): NewRubricDispatchGateEventRow {
  return {
    ...(input.gate_event_id ? { gate_event_id: input.gate_event_id } : {}),
    rubric_id: input.rubric_id,
    rubric_version: input.rubric_version,
    decision: input.decision,
    reason_code: input.reason_code,
    bias_test_artifact_id: input.bias_test_artifact_id,
    audit_event_id: input.audit_event_id,
    correlation_id: input.correlation_id,
    ...(input.created_at ? { created_at: input.created_at } : {}),
  };
}

function toRubricVersion(row: RubricVersionRow): RubricVersion {
  return {
    rubric_version_id: row.rubric_version_id,
    rubric_id: row.rubric_id,
    version: row.version,
    side: row.side as RubricVersion["side"],
    status: row.status as RubricVersion["status"],
    dimensions: row.dimensions,
    aggregation_policy: row.aggregation_policy,
    bias_test_ref: row.bias_test_ref,
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

function toBiasTestArtifact(row: BiasTestArtifactRow): BiasTestArtifact {
  return {
    bias_test_artifact_id: row.bias_test_artifact_id,
    rubric_id: row.rubric_id,
    rubric_version: row.rubric_version,
    rubric_content_hash: row.rubric_content_hash,
    methodology_ref: row.methodology_ref,
    status: row.status as BiasTestArtifact["status"],
    jurisdiction_coverage: row.jurisdiction_coverage,
    reviewer_principal_id: row.reviewer_principal_id,
    completed_at: row.completed_at,
    expires_at: row.expires_at,
    artifact_uri: row.artifact_uri,
    audit_event_id: row.audit_event_id,
    created_at: row.created_at,
  };
}

function toRubricEvent(row: RubricEventRow): RubricEvent {
  return {
    rubric_event_id: row.rubric_event_id,
    rubric_version_id: row.rubric_version_id,
    event_type: row.event_type as RubricEvent["event_type"],
    reason_code: row.reason_code as RubricEvent["reason_code"],
    principal_id: row.principal_id,
    reviewer_principal_id: row.reviewer_principal_id,
    correlation_id: row.correlation_id,
    audit_event_id: row.audit_event_id,
    created_at: row.created_at,
  };
}

function toDispatchGateEvent(row: RubricDispatchGateEventRow): RubricDispatchGateEvent {
  return {
    gate_event_id: row.gate_event_id,
    rubric_id: row.rubric_id,
    rubric_version: row.rubric_version,
    decision: row.decision as RubricDispatchGateEvent["decision"],
    reason_code: row.reason_code as RubricDispatchGateEvent["reason_code"],
    bias_test_artifact_id: row.bias_test_artifact_id,
    audit_event_id: row.audit_event_id,
    correlation_id: row.correlation_id,
    created_at: row.created_at,
  };
}
