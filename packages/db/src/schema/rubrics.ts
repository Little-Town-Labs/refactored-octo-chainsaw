// F07b — Immutable rubric registry, bias-test evidence, and dispatch gate events.
//
// schema-lint: skip-r2-timestamps
// Reason: rubric policy versions and evidence events are immutable compliance
// records. Changes create new versions or append event rows instead of mutating
// existing evidence.

import { sql } from "drizzle-orm";
import {
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { auditLogEvents } from "./audit-log.js";
import { principals } from "./principals.js";

export const RUBRIC_SIDES = ["seeker", "employer", "both"] as const;
export type RubricSide = (typeof RUBRIC_SIDES)[number];

export const RUBRIC_STATUSES = ["draft", "published", "deprecated", "retired"] as const;
export type RubricStatus = (typeof RUBRIC_STATUSES)[number];

export const RUBRIC_EVENT_TYPES = ["published", "deprecated"] as const;
export type RubricEventType = (typeof RUBRIC_EVENT_TYPES)[number];

export const RUBRIC_EVENT_REASON_CODES = [
  "initial_launch",
  "policy_update",
  "bias_methodology_update",
  "dimension_update",
  "weight_update",
  "compliance_deprecation",
] as const;
export type RubricEventReasonCode = (typeof RUBRIC_EVENT_REASON_CODES)[number];

export const BIAS_TEST_STATUSES = [
  "draft",
  "completed",
  "rejected",
  "superseded",
  "expired",
] as const;
export type BiasTestStatus = (typeof BIAS_TEST_STATUSES)[number];

export const RUBRIC_GATE_DECISIONS = ["allow", "deny"] as const;
export type RubricGateDecision = (typeof RUBRIC_GATE_DECISIONS)[number];

export const RUBRIC_GATE_REASON_CODES = [
  "rubric_gate_allowed",
  "rubric_missing",
  "rubric_unpublished",
  "rubric_deprecated",
  "rubric_invalid",
  "rubric_missing_bias_test",
  "rubric_bias_test_incomplete",
  "rubric_bias_test_mismatched_hash",
  "rubric_bias_test_expired",
  "rubric_bias_test_insufficient_coverage",
] as const;
export type RubricGateReasonCode = (typeof RUBRIC_GATE_REASON_CODES)[number];

export const rubricVersions = pgTable(
  "rubric_versions",
  {
    rubric_version_id: uuid("rubric_version_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    rubric_id: text("rubric_id").notNull(),
    version: text("version").notNull(),
    side: text("side").notNull(),
    status: text("status").notNull(),
    dimensions: jsonb("dimensions")
      .$type<
        Array<{
          dimension_id: string;
          label: string;
          description: string;
          min_score: number;
          max_score: number;
          weight: number;
          evidence_expectations?: string;
          required: boolean;
        }>
      >()
      .notNull(),
    aggregation_policy: jsonb("aggregation_policy")
      .$type<{
        kind: "weighted_sum";
        weight_normalization: "sum_to_one";
        rounding: "half_away_from_zero_4dp";
      }>()
      .notNull(),
    bias_test_ref: jsonb("bias_test_ref").$type<{ bias_test_artifact_id: string }>(),
    content_hash: text("content_hash").notNull(),
    description: text("description").notNull(),
    author_principal_id: uuid("author_principal_id")
      .notNull()
      .references(() => principals.principal_id, {
        onDelete: "no action",
        onUpdate: "no action",
      }),
    reviewer_principal_id: uuid("reviewer_principal_id").references(() => principals.principal_id, {
      onDelete: "no action",
      onUpdate: "no action",
    }),
    published_at: timestamp("published_at", { withTimezone: true }),
    deprecated_after: timestamp("deprecated_after", { withTimezone: true }),
    audit_event_id: uuid("audit_event_id").references(() => auditLogEvents.audit_event_id, {
      onDelete: "no action",
      onUpdate: "no action",
    }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    check("rubric_versions_rubric_id_check", sql`${t.rubric_id} <> ''`),
    check("rubric_versions_version_check", sql`${t.version} <> ''`),
    check("rubric_versions_side_check", sql`${t.side} IN ('seeker','employer','both')`),
    check(
      "rubric_versions_status_check",
      sql`${t.status} IN ('draft','published','deprecated','retired')`,
    ),
    check("rubric_versions_dimensions_check", sql`jsonb_array_length(${t.dimensions}) > 0`),
    check("rubric_versions_content_hash_check", sql`${t.content_hash} <> ''`),
    check("rubric_versions_description_check", sql`${t.description} <> ''`),
    check(
      "rubric_versions_published_shape_check",
      sql`${t.status} <> 'published' OR (${t.reviewer_principal_id} IS NOT NULL AND ${t.published_at} IS NOT NULL AND ${t.audit_event_id} IS NOT NULL AND ${t.bias_test_ref} IS NOT NULL)`,
    ),
    check(
      "rubric_versions_deprecated_shape_check",
      sql`${t.status} <> 'deprecated' OR ${t.deprecated_after} IS NOT NULL`,
    ),
    uniqueIndex("rubric_versions_ref_unique_idx").on(t.rubric_id, t.version),
    uniqueIndex("rubric_versions_audit_event_idx")
      .on(t.audit_event_id)
      .where(sql`${t.audit_event_id} IS NOT NULL`),
    index("rubric_versions_side_status_idx").on(t.side, t.status, t.created_at.desc()),
  ],
);

export const biasTestArtifacts = pgTable(
  "bias_test_artifacts",
  {
    bias_test_artifact_id: uuid("bias_test_artifact_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    rubric_id: text("rubric_id").notNull(),
    rubric_version: text("rubric_version").notNull(),
    rubric_content_hash: text("rubric_content_hash").notNull(),
    methodology_ref: jsonb("methodology_ref")
      .$type<{ methodology_id: string; version: string }>()
      .notNull(),
    status: text("status").notNull(),
    jurisdiction_coverage: jsonb("jurisdiction_coverage").$type<string[]>().notNull(),
    reviewer_principal_id: uuid("reviewer_principal_id").references(() => principals.principal_id, {
      onDelete: "no action",
      onUpdate: "no action",
    }),
    completed_at: timestamp("completed_at", { withTimezone: true }),
    expires_at: timestamp("expires_at", { withTimezone: true }),
    artifact_uri: text("artifact_uri"),
    audit_event_id: uuid("audit_event_id").references(() => auditLogEvents.audit_event_id, {
      onDelete: "no action",
      onUpdate: "no action",
    }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    check("bias_test_artifacts_rubric_id_check", sql`${t.rubric_id} <> ''`),
    check("bias_test_artifacts_rubric_version_check", sql`${t.rubric_version} <> ''`),
    check("bias_test_artifacts_hash_check", sql`${t.rubric_content_hash} <> ''`),
    check(
      "bias_test_artifacts_status_check",
      sql`${t.status} IN ('draft','completed','rejected','superseded','expired')`,
    ),
    check(
      "bias_test_artifacts_coverage_check",
      sql`jsonb_array_length(${t.jurisdiction_coverage}) > 0`,
    ),
    check(
      "bias_test_artifacts_completed_shape_check",
      sql`${t.status} <> 'completed' OR (${t.reviewer_principal_id} IS NOT NULL AND ${t.completed_at} IS NOT NULL AND ${t.artifact_uri} IS NOT NULL AND ${t.audit_event_id} IS NOT NULL)`,
    ),
    index("bias_test_artifacts_rubric_idx").on(t.rubric_id, t.rubric_version),
    index("bias_test_artifacts_status_idx").on(t.status, t.created_at.desc()),
  ],
);

export const rubricEvents = pgTable(
  "rubric_events",
  {
    rubric_event_id: uuid("rubric_event_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    rubric_version_id: uuid("rubric_version_id")
      .notNull()
      .references(() => rubricVersions.rubric_version_id, {
        onDelete: "no action",
        onUpdate: "no action",
      }),
    event_type: text("event_type").notNull(),
    reason_code: text("reason_code").notNull(),
    principal_id: uuid("principal_id")
      .notNull()
      .references(() => principals.principal_id, {
        onDelete: "no action",
        onUpdate: "no action",
      }),
    reviewer_principal_id: uuid("reviewer_principal_id").references(() => principals.principal_id, {
      onDelete: "no action",
      onUpdate: "no action",
    }),
    correlation_id: text("correlation_id").notNull(),
    audit_event_id: uuid("audit_event_id")
      .notNull()
      .references(() => auditLogEvents.audit_event_id, {
        onDelete: "no action",
        onUpdate: "no action",
      }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    check("rubric_events_event_type_check", sql`${t.event_type} IN ('published','deprecated')`),
    check(
      "rubric_events_reason_code_check",
      sql`${t.reason_code} IN ('initial_launch','policy_update','bias_methodology_update','dimension_update','weight_update','compliance_deprecation')`,
    ),
    check("rubric_events_correlation_id_check", sql`${t.correlation_id} <> ''`),
    index("rubric_events_rubric_idx").on(t.rubric_version_id, t.created_at.desc()),
    index("rubric_events_actor_idx").on(t.principal_id, t.created_at.desc()),
    uniqueIndex("rubric_events_audit_event_idx").on(t.audit_event_id),
  ],
);

export const rubricDispatchGateEvents = pgTable(
  "rubric_dispatch_gate_events",
  {
    gate_event_id: uuid("gate_event_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    rubric_id: text("rubric_id").notNull(),
    rubric_version: text("rubric_version").notNull(),
    decision: text("decision").notNull(),
    reason_code: text("reason_code").notNull(),
    bias_test_artifact_id: uuid("bias_test_artifact_id").references(
      () => biasTestArtifacts.bias_test_artifact_id,
      {
        onDelete: "no action",
        onUpdate: "no action",
      },
    ),
    audit_event_id: uuid("audit_event_id")
      .notNull()
      .references(() => auditLogEvents.audit_event_id, {
        onDelete: "no action",
        onUpdate: "no action",
      }),
    correlation_id: text("correlation_id").notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    check("rubric_dispatch_gate_events_rubric_id_check", sql`${t.rubric_id} <> ''`),
    check("rubric_dispatch_gate_events_version_check", sql`${t.rubric_version} <> ''`),
    check("rubric_dispatch_gate_events_decision_check", sql`${t.decision} IN ('allow','deny')`),
    check(
      "rubric_dispatch_gate_events_reason_code_check",
      sql`${t.reason_code} IN ('rubric_gate_allowed','rubric_missing','rubric_unpublished','rubric_deprecated','rubric_invalid','rubric_missing_bias_test','rubric_bias_test_incomplete','rubric_bias_test_mismatched_hash','rubric_bias_test_expired','rubric_bias_test_insufficient_coverage')`,
    ),
    check("rubric_dispatch_gate_events_correlation_id_check", sql`${t.correlation_id} <> ''`),
    index("rubric_dispatch_gate_events_ref_idx").on(
      t.rubric_id,
      t.rubric_version,
      t.created_at.desc(),
    ),
    index("rubric_dispatch_gate_events_reason_idx").on(t.reason_code, t.created_at.desc()),
  ],
);

export type RubricVersionRow = typeof rubricVersions.$inferSelect;
export type NewRubricVersionRow = typeof rubricVersions.$inferInsert;
export type BiasTestArtifactRow = typeof biasTestArtifacts.$inferSelect;
export type NewBiasTestArtifactRow = typeof biasTestArtifacts.$inferInsert;
export type RubricEventRow = typeof rubricEvents.$inferSelect;
export type NewRubricEventRow = typeof rubricEvents.$inferInsert;
export type RubricDispatchGateEventRow = typeof rubricDispatchGateEvents.$inferSelect;
export type NewRubricDispatchGateEventRow = typeof rubricDispatchGateEvents.$inferInsert;
