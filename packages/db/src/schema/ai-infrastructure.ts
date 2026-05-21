// F12 — AI infrastructure prompt/model registries, runtime manifests, and invocation evidence.
//
// schema-lint: skip-r2-timestamps
// Reason: prompt/model versions, manifests, and invocation records are
// immutable AI supply-chain evidence. Changes append new rows.

import { sql } from "drizzle-orm";
import {
  check,
  boolean,
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

export const AI_VERSION_STATUSES = [
  "draft",
  "published",
  "deprecated",
  "retired",
  "superseded",
] as const;
export type AiVersionStatus = (typeof AI_VERSION_STATUSES)[number];

export const MODEL_CAPABILITY_CLASSES = [
  "chat",
  "reasoning",
  "embedding",
  "classification",
  "evaluation",
] as const;
export type ModelCapabilityClass = (typeof MODEL_CAPABILITY_CLASSES)[number];

export const AI_RUNTIME_MANIFEST_STATUSES = [
  "draft",
  "active",
  "superseded",
  "retired",
  "revoked",
] as const;
export type AiRuntimeManifestStatus = (typeof AI_RUNTIME_MANIFEST_STATUSES)[number];

export const MODEL_INVOCATION_STATUSES = [
  "accepted",
  "refused",
  "completed",
  "failed",
  "usage_incomplete",
] as const;
export type ModelInvocationStatus = (typeof MODEL_INVOCATION_STATUSES)[number];

export const MODEL_INVOCATION_DECISIONS = ["allowed", "refused", "downgraded"] as const;
export type ModelInvocationDecision = (typeof MODEL_INVOCATION_DECISIONS)[number];

export const promptVersions = pgTable(
  "ai_prompt_versions",
  {
    prompt_version_id: uuid("prompt_version_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    prompt_id: text("prompt_id").notNull(),
    version: text("version").notNull(),
    status: text("status").notNull(),
    purpose: text("purpose").notNull(),
    template_ref: text("template_ref").notNull(),
    content_hash: text("content_hash").notNull(),
    variable_contract: jsonb("variable_contract").$type<Record<string, unknown>>().notNull(),
    allowed_scopes: jsonb("allowed_scopes").$type<string[]>().notNull(),
    rubric_boundary: text("rubric_boundary").notNull(),
    release_manifest_ref: text("release_manifest_ref"),
    signature_ref: text("signature_ref"),
    published_by: uuid("published_by").references(() => principals.principal_id, {
      onDelete: "no action",
      onUpdate: "no action",
    }),
    published_at: timestamp("published_at", { withTimezone: true }),
    audit_event_id: uuid("audit_event_id").references(() => auditLogEvents.audit_event_id, {
      onDelete: "no action",
      onUpdate: "no action",
    }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    check("ai_prompt_versions_prompt_id_check", sql`${t.prompt_id} <> ''`),
    check("ai_prompt_versions_version_check", sql`${t.version} <> ''`),
    check(
      "ai_prompt_versions_status_check",
      sql`${t.status} IN ('draft','published','deprecated','retired','superseded')`,
    ),
    check("ai_prompt_versions_purpose_check", sql`${t.purpose} <> ''`),
    check("ai_prompt_versions_template_ref_check", sql`${t.template_ref} <> ''`),
    check("ai_prompt_versions_hash_check", sql`${t.content_hash} <> ''`),
    check(
      "ai_prompt_versions_rubric_boundary_check",
      sql`${t.rubric_boundary} IN ('no_rubric_weights','no_scoring_policy')`,
    ),
    check(
      "ai_prompt_versions_published_shape_check",
      sql`${t.status} <> 'published' OR (${t.release_manifest_ref} IS NOT NULL AND ${t.signature_ref} IS NOT NULL AND ${t.published_by} IS NOT NULL AND ${t.published_at} IS NOT NULL AND ${t.audit_event_id} IS NOT NULL)`,
    ),
    uniqueIndex("ai_prompt_versions_ref_unique_idx").on(t.prompt_id, t.version),
    index("ai_prompt_versions_status_idx").on(t.status, t.created_at.desc()),
  ],
);

export const modelProfileVersions = pgTable(
  "ai_model_profile_versions",
  {
    model_profile_version_id: uuid("model_profile_version_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    model_profile_id: text("model_profile_id").notNull(),
    version: text("version").notNull(),
    status: text("status").notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    capability_class: text("capability_class").notNull(),
    risk_tier: text("risk_tier").notNull(),
    allowed_scopes: jsonb("allowed_scopes").$type<string[]>().notNull(),
    cost_metadata: jsonb("cost_metadata").$type<Record<string, unknown>>().notNull(),
    supply_chain_evidence: jsonb("supply_chain_evidence").$type<string[]>().notNull(),
    release_manifest_ref: text("release_manifest_ref"),
    signature_ref: text("signature_ref"),
    published_by: uuid("published_by").references(() => principals.principal_id, {
      onDelete: "no action",
      onUpdate: "no action",
    }),
    published_at: timestamp("published_at", { withTimezone: true }),
    audit_event_id: uuid("audit_event_id").references(() => auditLogEvents.audit_event_id, {
      onDelete: "no action",
      onUpdate: "no action",
    }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    check("ai_model_profile_versions_profile_id_check", sql`${t.model_profile_id} <> ''`),
    check("ai_model_profile_versions_version_check", sql`${t.version} <> ''`),
    check(
      "ai_model_profile_versions_status_check",
      sql`${t.status} IN ('draft','published','deprecated','retired','superseded')`,
    ),
    check("ai_model_profile_versions_provider_check", sql`${t.provider} <> ''`),
    check("ai_model_profile_versions_model_check", sql`${t.model} <> ''`),
    check(
      "ai_model_profile_versions_capability_check",
      sql`${t.capability_class} IN ('chat','reasoning','embedding','classification','evaluation')`,
    ),
    check(
      "ai_model_profile_versions_risk_tier_check",
      sql`${t.risk_tier} IN ('low','medium','high')`,
    ),
    check(
      "ai_model_profile_versions_published_shape_check",
      sql`${t.status} <> 'published' OR (${t.release_manifest_ref} IS NOT NULL AND ${t.signature_ref} IS NOT NULL AND ${t.published_by} IS NOT NULL AND ${t.published_at} IS NOT NULL AND ${t.audit_event_id} IS NOT NULL)`,
    ),
    uniqueIndex("ai_model_profile_versions_ref_unique_idx").on(t.model_profile_id, t.version),
    index("ai_model_profile_versions_status_idx").on(t.status, t.created_at.desc()),
  ],
);

export const aiRuntimeManifests = pgTable(
  "ai_runtime_manifests",
  {
    runtime_manifest_id: uuid("runtime_manifest_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    manifest_id: text("manifest_id").notNull(),
    version: text("version").notNull(),
    status: text("status").notNull(),
    deployment_scope: text("deployment_scope").notNull(),
    prompt_refs: jsonb("prompt_refs")
      .$type<Array<{ prompt_id: string; version: string }>>()
      .notNull(),
    model_refs: jsonb("model_refs")
      .$type<Array<{ model_profile_id: string; version: string }>>()
      .notNull(),
    caller_scopes: jsonb("caller_scopes").$type<string[]>().notNull(),
    provider_allowlist: jsonb("provider_allowlist").$type<string[]>().notNull(),
    cost_controls: jsonb("cost_controls").$type<Record<string, unknown>[]>().notNull(),
    fallback_policy: text("fallback_policy").notNull(),
    no_hot_reload: boolean("no_hot_reload").notNull(),
    content_hash: text("content_hash").notNull(),
    signature_ref: text("signature_ref").notNull(),
    published_by: uuid("published_by").references(() => principals.principal_id, {
      onDelete: "no action",
      onUpdate: "no action",
    }),
    published_at: timestamp("published_at", { withTimezone: true }),
    audit_event_id: uuid("audit_event_id").references(() => auditLogEvents.audit_event_id, {
      onDelete: "no action",
      onUpdate: "no action",
    }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    check("ai_runtime_manifests_manifest_id_check", sql`${t.manifest_id} <> ''`),
    check("ai_runtime_manifests_version_check", sql`${t.version} <> ''`),
    check(
      "ai_runtime_manifests_status_check",
      sql`${t.status} IN ('draft','active','superseded','retired','revoked')`,
    ),
    check("ai_runtime_manifests_deployment_scope_check", sql`${t.deployment_scope} <> ''`),
    check(
      "ai_runtime_manifests_fallback_policy_check",
      sql`${t.fallback_policy} IN ('none','refuse','manifest_authorized')`,
    ),
    check("ai_runtime_manifests_no_hot_reload_check", sql`${t.no_hot_reload} = true`),
    check("ai_runtime_manifests_hash_check", sql`${t.content_hash} <> ''`),
    check("ai_runtime_manifests_signature_ref_check", sql`${t.signature_ref} <> ''`),
    uniqueIndex("ai_runtime_manifests_ref_unique_idx").on(t.manifest_id, t.version),
    index("ai_runtime_manifests_status_idx").on(t.status, t.created_at.desc()),
  ],
);

export const modelInvocationRecords = pgTable(
  "ai_model_invocation_records",
  {
    invocation_id: uuid("invocation_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    status: text("status").notNull(),
    caller_principal_id: uuid("caller_principal_id")
      .notNull()
      .references(() => principals.principal_id, {
        onDelete: "no action",
        onUpdate: "no action",
      }),
    caller_scope: text("caller_scope").notNull(),
    run_ref: text("run_ref").notNull(),
    purpose: text("purpose").notNull(),
    prompt_ref: jsonb("prompt_ref").$type<{ prompt_id: string; version: string }>().notNull(),
    model_ref: jsonb("model_ref").$type<{ model_profile_id: string; version: string }>().notNull(),
    manifest_ref: jsonb("manifest_ref").$type<{ manifest_id: string; version: string }>().notNull(),
    request_hash: text("request_hash").notNull(),
    rendered_prompt_hash: text("rendered_prompt_hash"),
    response_hash: text("response_hash"),
    usage_metadata: jsonb("usage_metadata").$type<Record<string, unknown>>(),
    cost_evidence: jsonb("cost_evidence").$type<Record<string, unknown>>(),
    decision: text("decision").notNull(),
    reason_code: text("reason_code").notNull(),
    started_at: timestamp("started_at", { withTimezone: true }).notNull(),
    completed_at: timestamp("completed_at", { withTimezone: true }),
    audit_event_id: uuid("audit_event_id").references(() => auditLogEvents.audit_event_id, {
      onDelete: "no action",
      onUpdate: "no action",
    }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    check(
      "ai_model_invocation_records_status_check",
      sql`${t.status} IN ('accepted','refused','completed','failed','usage_incomplete')`,
    ),
    check("ai_model_invocation_records_caller_scope_check", sql`${t.caller_scope} <> ''`),
    check("ai_model_invocation_records_run_ref_check", sql`${t.run_ref} <> ''`),
    check("ai_model_invocation_records_purpose_check", sql`${t.purpose} <> ''`),
    check("ai_model_invocation_records_request_hash_check", sql`${t.request_hash} <> ''`),
    check(
      "ai_model_invocation_records_decision_check",
      sql`${t.decision} IN ('allowed','refused','downgraded')`,
    ),
    check("ai_model_invocation_records_reason_code_check", sql`${t.reason_code} <> ''`),
    index("ai_model_invocation_records_run_idx").on(t.run_ref, t.created_at.desc()),
    index("ai_model_invocation_records_caller_idx").on(t.caller_principal_id, t.created_at.desc()),
  ],
);

export type PromptVersionRow = typeof promptVersions.$inferSelect;
export type NewPromptVersionRow = typeof promptVersions.$inferInsert;
export type ModelProfileVersionRow = typeof modelProfileVersions.$inferSelect;
export type NewModelProfileVersionRow = typeof modelProfileVersions.$inferInsert;
export type AiRuntimeManifestRow = typeof aiRuntimeManifests.$inferSelect;
export type NewAiRuntimeManifestRow = typeof aiRuntimeManifests.$inferInsert;
export type ModelInvocationRecordRow = typeof modelInvocationRecords.$inferSelect;
export type NewModelInvocationRecordRow = typeof modelInvocationRecords.$inferInsert;
